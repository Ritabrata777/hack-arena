# MediChain Deployment Guide

This guide covers deploying MediChain to various platforms and environments.

## 🚀 Quick Deployment

### Vercel (Recommended)

1. **Connect your repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure environment variables**
   ```env
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB_NAME=medichain
   GOOGLE_API_KEY=your_google_ai_api_key
   PRIVATE_KEY=your_aptos_private_key
   NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS=your_contract_address
   NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS=your_fundraiser_contract_address
   NEXT_PUBLIC_HEALTH_WALLET_CONTRACT_ADDRESS=your_health_wallet_contract_address
   APTOS_TESTNET_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
   NEXT_PUBLIC_APTOS_TESTNET_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
   NEXT_PUBLIC_ADMIN_WALLETS=your_admin_wallet_addresses
   NEXT_PUBLIC_PRIMARY_ADMIN_WALLET=your_primary_admin_wallet
   ENCRYPTION_SECRET_KEY=your_encryption_secret
   ```

3. **Deploy**
   - Vercel will automatically build and deploy
   - Your app will be available at `https://your-project.vercel.app`

### Netlify

1. **Connect repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Build settings**
   ```yaml
   Build command: npm run build
   Publish directory: .next
   ```

3. **Environment variables**
   - Add all environment variables in Netlify dashboard
   - Same variables as Vercel deployment

### Railway

1. **Connect repository**
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Connect your GitHub repository

2. **Configure environment**
   - Add environment variables in Railway dashboard
   - Railway will automatically detect Next.js

3. **Deploy**
   - Railway will build and deploy automatically
   - Get your app URL from Railway dashboard

## 🐳 Docker Deployment

### Create Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Build and run

```bash
# Build the image
docker build -t medichain .

# Run the container
docker run -p 3000:3000 medichain
```

### Docker Compose

```yaml
version: '3.8'

services:
  medichain:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - PRIVATE_KEY=${PRIVATE_KEY}
    depends_on:
      - mongodb

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

## ☁️ Cloud Platform Deployment

### AWS

#### Using AWS Amplify

1. **Connect repository**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository

2. **Configure build settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Environment variables**
   - Add all required environment variables
   - Deploy your application

#### Using AWS ECS

1. **Create ECS cluster**
2. **Create task definition**
3. **Create service**
4. **Configure load balancer**

### Google Cloud Platform

#### Using Cloud Run

1. **Build container**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/medichain
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy --image gcr.io/PROJECT-ID/medichain --platform managed
   ```

### Azure

#### Using Azure Container Instances

1. **Build and push to Azure Container Registry**
2. **Create container instance**
3. **Configure environment variables**

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a new cluster
   - Choose your preferred region

2. **Configure database access**
   - Create database user
   - Set up IP whitelist
   - Get connection string

3. **Create collections**
   ```javascript
   // Collections will be created automatically
   // But you can pre-create them for better performance
   db.createCollection("patients")
   db.createCollection("doctors")
   db.createCollection("fundraiserRequests")
   db.createCollection("directDonations")
   db.createCollection("consultations")
   ```

### Self-hosted MongoDB

1. **Install MongoDB**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # macOS
   brew install mongodb
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Configure MongoDB**
   ```bash
   # Start MongoDB
   sudo systemctl start mongod
   
   # Enable auto-start
   sudo systemctl enable mongod
   ```

## 🔧 Environment Configuration

### Production Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=medichain

# Blockchain
PRIVATE_KEY=your_aptos_private_key
APTOS_TESTNET_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
NEXT_PUBLIC_APTOS_TESTNET_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1

# Contract Addresses
NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_HEALTH_WALLET_CONTRACT_ADDRESS=0x...

# Admin Configuration
NEXT_PUBLIC_ADMIN_WALLETS=0x...,0x...,0x...
NEXT_PUBLIC_PRIMARY_ADMIN_WALLET=0x...
NEXT_PUBLIC_SHOW_CONTRACT_OWNER_BADGE=true

# AI Services
GOOGLE_API_KEY=your_google_ai_api_key
USE_AI_FALLBACK=false
AI_REQUESTS_PER_MINUTE=15
AI_REQUESTS_PER_HOUR=900

# Security
ENCRYPTION_SECRET_KEY=your_secure_encryption_key

# Optional
APTOS_EXPLORER_API_KEY=your_explorer_api_key
```

## 🔒 Security Considerations

### Environment Security

1. **Never commit sensitive data**
   - Use environment variables
   - Add `.env` to `.gitignore`
   - Use secret management services

2. **Database security**
   - Use strong passwords
   - Enable authentication
   - Configure IP whitelisting
   - Enable encryption in transit

3. **API security**
   - Rate limiting
   - Input validation
   - CORS configuration
   - HTTPS only

### Production Checklist

- [ ] Environment variables configured
- [ ] Database connections secured
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

## 📊 Monitoring and Analytics

### Application Monitoring

1. **Vercel Analytics**
   - Built-in analytics
   - Performance monitoring
   - Error tracking

2. **Third-party services**
   - Sentry for error tracking
   - LogRocket for session replay
   - New Relic for performance

### Database Monitoring

1. **MongoDB Atlas**
   - Built-in monitoring
   - Performance insights
   - Alert configuration

2. **Custom monitoring**
   - Health check endpoints
   - Database connection monitoring
   - Performance metrics

## 🚀 Performance Optimization

### Next.js Optimization

1. **Image optimization**
   ```javascript
   import Image from 'next/image'
   
   <Image
     src="/image.jpg"
     alt="Description"
     width={500}
     height={300}
     priority
   />
   ```

2. **Code splitting**
   ```javascript
   import dynamic from 'next/dynamic'
   
   const DynamicComponent = dynamic(() => import('./Component'))
   ```

3. **Caching strategies**
   - Static generation where possible
   - ISR for dynamic content
   - CDN for static assets

### Database Optimization

1. **Indexing**
   ```javascript
   // Create indexes for frequently queried fields
   db.patients.createIndex({ "walletAddress": 1 })
   db.consultations.createIndex({ "patientId": 1, "timestamp": -1 })
   ```

2. **Query optimization**
   - Use projection to limit fields
   - Implement pagination
   - Use aggregation pipelines

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Load balancing**
   - Multiple app instances
   - Database connection pooling
   - CDN for static assets

2. **Database scaling**
   - Read replicas
   - Sharding strategies
   - Caching layers

### Vertical Scaling

1. **Resource optimization**
   - Memory usage monitoring
   - CPU optimization
   - Database query optimization

## 🆘 Troubleshooting

### Common Issues

1. **Build failures**
   - Check Node.js version
   - Verify environment variables
   - Review build logs

2. **Database connection issues**
   - Verify connection string
   - Check network access
   - Review authentication

3. **Performance issues**
   - Monitor resource usage
   - Check database queries
   - Review caching strategies

### Support Resources

- [GitHub Issues](https://github.com/Moinakcodes/medichain/issues)
- [Documentation](https://github.com/Moinakcodes/medichain/wiki)
- [Community Discord](https://discord.gg/medichain)

---

For more detailed deployment instructions, please refer to the [Documentation](https://github.com/Moinakcodes/medichain/wiki).
