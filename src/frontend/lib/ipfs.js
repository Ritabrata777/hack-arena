/**
 * IPFS Integration Utilities
 * 
 * This file provides utilities for interacting with IPFS (InterPlanetary File System)
 * to store and retrieve health records. IPFS provides decentralized storage for
 * health records that can be referenced by their content hash.
 */

// IPFS Gateway URLs (public gateways for accessing IPFS content)
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

/**
 * Get the full IPFS URL for a given hash
 * @param {string} hash - The IPFS hash (with or without 'Qm' prefix)
 * @returns {string} - The full IPFS URL
 */
export const getIpfsUrl = (hash) => {
  // Remove any existing protocol or gateway prefix
  const cleanHash = hash.replace(/^https?:\/\/[^/]+\/ipfs\//, '').replace(/^ipfs:\/\//, '');
  
  // Use the first gateway (ipfs.io) as default
  return `${IPFS_GATEWAYS[0]}${cleanHash}`;
};

/**
 * Get multiple IPFS URLs for redundancy
 * @param {string} hash - The IPFS hash
 * @returns {string[]} - Array of IPFS URLs
 */
export const getIpfsUrls = (hash) => {
  const cleanHash = hash.replace(/^https?:\/\/[^/]+\/ipfs\//, '').replace(/^ipfs:\/\//, '');
  return IPFS_GATEWAYS.map(gateway => `${gateway}${cleanHash}`);
};

/**
 * Validate if a string looks like an IPFS hash
 * @param {string} hash - The string to validate
 * @returns {boolean} - True if it looks like an IPFS hash
 */
export const isValidIpfsHash = (hash) => {
  if (!hash || typeof hash !== 'string') return false;
  
  // IPFS hashes typically start with 'Qm' (v0) or 'bafy' (v1)
  const cleanHash = hash.replace(/^https?:\/\/[^/]+\/ipfs\//, '').replace(/^ipfs:\/\//, '');
  
  // Basic validation for IPFS hash format
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cleanHash) || 
         /^bafy[a-z2-7]{52}$/.test(cleanHash) ||
         /^baf[a-z2-7]{55}$/.test(cleanHash);
};

/**
 * Extract the IPFS hash from a full URL
 * @param {string} url - The full IPFS URL
 * @returns {string|null} - The extracted hash or null if not found
 */
export const extractIpfsHash = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  const match = url.match(/(?:ipfs\/|ipfs:)([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Upload a file to IPFS using a simple HTTP upload
 * Note: This is a basic implementation. In production, you'd want to use
 * a proper IPFS service like Pinata, Infura, or run your own IPFS node.
 * 
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The IPFS hash of the uploaded file
 */
export const uploadToIpfs = async (file) => {
  try {
    // This is a mock implementation
    // In a real application, you would:
    // 1. Use a service like Pinata (https://pinata.cloud)
    // 2. Use Infura IPFS (https://infura.io)
    // 3. Run your own IPFS node
    
    console.warn('IPFS upload is not implemented. This is a mock function.');
    console.log('File to upload:', file.name, file.size, 'bytes');
    
    // Mock IPFS hash generation
    const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockHash;
  } catch (error) {
    console.error('IPFS upload failed:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};

/**
 * Download content from IPFS
 * @param {string} hash - The IPFS hash
 * @returns {Promise<Blob>} - The downloaded content as a Blob
 */
export const downloadFromIpfs = async (hash) => {
  try {
    const url = getIpfsUrl(hash);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download from IPFS: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('IPFS download failed:', error);
    throw new Error('Failed to download content from IPFS');
  }
};

/**
 * Get IPFS content as text
 * @param {string} hash - The IPFS hash
 * @returns {Promise<string>} - The content as text
 */
export const getIpfsContentAsText = async (hash) => {
  try {
    const blob = await downloadFromIpfs(hash);
    return await blob.text();
  } catch (error) {
    console.error('Failed to get IPFS content as text:', error);
    throw new Error('Failed to retrieve content from IPFS');
  }
};

/**
 * Get IPFS content as JSON
 * @param {string} hash - The IPFS hash
 * @returns {Promise<object>} - The content as JSON object
 */
export const getIpfsContentAsJson = async (hash) => {
  try {
    const text = await getIpfsContentAsText(hash);
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to get IPFS content as JSON:', error);
    throw new Error('Failed to parse content from IPFS as JSON');
  }
};

/**
 * Check if IPFS content is accessible
 * @param {string} hash - The IPFS hash
 * @returns {Promise<boolean>} - True if content is accessible
 */
export const isIpfsContentAccessible = async (hash) => {
  try {
    const url = getIpfsUrl(hash);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('IPFS accessibility check failed:', error);
    return false;
  }
};

/**
 * Get the best available IPFS gateway for a given hash
 * @param {string} hash - The IPFS hash
 * @returns {Promise<string>} - The URL of the best available gateway
 */
export const getBestIpfsGateway = async (hash) => {
  const urls = getIpfsUrls(hash);
  
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch (error) {
      // Try next gateway
      continue;
    }
  }
  
  // If no gateway works, return the first one as fallback
  return urls[0];
};

const ipfsUtils = {
  getIpfsUrl,
  getIpfsUrls,
  isValidIpfsHash,
  extractIpfsHash,
  uploadToIpfs,
  downloadFromIpfs,
  getIpfsContentAsText,
  getIpfsContentAsJson,
  isIpfsContentAccessible,
  getBestIpfsGateway
};

export default ipfsUtils;
