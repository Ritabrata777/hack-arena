// This approach is taken from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb
import { MongoClient } from 'mongodb'
import { config as dotenvConfig } from 'dotenv'
import { getServers, setServers } from 'node:dns'
import dnsPromises from 'node:dns/promises'

// Load env from standard files; if not set, also try config.env
dotenvConfig()
if (!process.env.MONGODB_URI) {
  dotenvConfig({ path: 'config.env' })
}

const uri = process.env.MONGODB_URI

if (!uri || uri.trim() === '') {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI". Please add your MongoDB connection string to your .env file.')
}

if (uri.includes('<') || uri.includes('>')) {
  throw new Error('Your MONGODB_URI in .env appears to have placeholder values like "<password>". Please replace them with your actual credentials.')
}

// Add a more specific check for the connection string scheme.
if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
  throw new Error('The MONGODB_URI in your .env file is invalid. It must start with "mongodb://" or "mongodb+srv://". Please double-check the value you copied from MongoDB Atlas.');
}

// Optional fallbacks to work around local TLS/DNS issues in dev
const isDevEnv = process.env.NODE_ENV === 'development'
const isWindows = process.platform === 'win32'
const isSrv = uri.startsWith('mongodb+srv://')

const configuredDnsServers = (process.env.MONGODB_DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean)

if (configuredDnsServers.length > 0) {
  try {
    setServers(configuredDnsServers)
    dnsPromises.setServers(configuredDnsServers)
  } catch (err) {
    throw new Error(`Invalid MONGODB_DNS_SERVERS value: ${err.message}`)
  }
}

let clientUriPromise

async function getClientUri() {
  if (!clientUriPromise) {
    clientUriPromise = expandSrvUriForConfiguredDns()
  }
  return clientUriPromise
}

async function expandSrvUriForConfiguredDns() {
  if (!isSrv || configuredDnsServers.length === 0) {
    return uri
  }

  const parsedUri = new URL(uri)
  const srvHost = parsedUri.hostname
  const srvRecords = await dnsPromises.resolveSrv(`_mongodb._tcp.${srvHost}`)

  if (srvRecords.length === 0) {
    throw new Error(`No MongoDB SRV records found for ${srvHost}`)
  }

  const hosts = srvRecords
    .map((record) => `${record.name}:${record.port || 27017}`)
    .join(',')

  const searchParams = new URLSearchParams(parsedUri.search)
  const txtRecords = await dnsPromises.resolveTxt(srvHost).catch((err) => {
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
      return []
    }
    throw err
  })

  if (txtRecords.length > 0) {
    const txtParams = new URLSearchParams(txtRecords[0].join(''))
    for (const [key, value] of txtParams.entries()) {
      if (!searchParams.has(key)) {
        searchParams.set(key, value)
      }
    }
  }

  const auth = parsedUri.username
    ? `${parsedUri.username}${parsedUri.password ? `:${parsedUri.password}` : ''}@`
    : ''
  const pathname = parsedUri.pathname || '/'
  const query = searchParams.toString()

  return `mongodb://${auth}${hosts}${pathname}${query ? `?${query}` : ''}`
}

// Dev-friendly defaults on Windows (can be disabled explicitly)
const envInsecure = (process.env.MONGODB_TLS_INSECURE || '').toLowerCase()
const allowInsecureTls = envInsecure === 'true' || (isDevEnv && envInsecure !== 'false')

const envForceIpv4 = (process.env.MONGODB_FORCE_IPV4 || '').toLowerCase()
const forceIpv4 = envForceIpv4 === 'true' || (isWindows && isDevEnv && envForceIpv4 !== 'false')

const envDirect = (process.env.MONGODB_DIRECT_CONNECTION || '').toLowerCase()
// Default to direct connection for non-SRV URIs in dev unless explicitly disabled
const directConnection = envDirect === 'true' || (!isSrv && isDevEnv && envDirect !== 'false')

const options = {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
  // Explicit TLS + optional insecure toggles
  tls: isSrv ? true : undefined,
  tlsAllowInvalidCertificates: isDevEnv && allowInsecureTls ? true : undefined,
  tlsAllowInvalidHostnames: isDevEnv && allowInsecureTls ? true : undefined,
  // Networking fallbacks
  family: forceIpv4 ? 4 : undefined,
  directConnection: directConnection || undefined,
  maxPoolSize: 3,
  appName: 'MediChain',
  // Quicker feedback when selection fails
  serverSelectionTimeoutMS: 10000,
}

if (isDevEnv) {
  // Minimal visibility to confirm fallbacks are active (no secrets logged)
  console.log('[MongoDB] dev options:', {
    tls: options.tls === true,
    allowInsecureTls,
    forceIpv4,
    directConnection,
    dnsServers: getServers(),
    minVersion: 'n/a',
  })
}

let client
let clientPromise

async function attemptConnect(primaryOptions, fallbackEnabled = true) {
  const clientUri = await getClientUri()
  const primaryClient = new MongoClient(clientUri, primaryOptions)
  try {
    await primaryClient.connect()
    return primaryClient
  } catch (err) {
    const message = String(err && err.message ? err.message : err)
    const looksLikeTlsAlert80 = message.includes('tlsv1 alert internal error') || message.includes('SSL alert number 80')
    if (isDevEnv && isWindows && fallbackEnabled && looksLikeTlsAlert80) {
      console.warn('[MongoDB] TLS alert detected, retrying with stronger fallbacks...')
      const fallbackOptions = {
        ...primaryOptions,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        family: 4,
        directConnection: true,
      }
      const fallbackClient = new MongoClient(clientUri, fallbackOptions)
      await fallbackClient.connect()
      return fallbackClient
    }
    throw err
  }
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = attemptConnect(options)
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = attemptConnect(options, /* fallbackEnabled */ false)
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise
