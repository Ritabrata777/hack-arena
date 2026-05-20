# MediChain Setup Guide for Polygon Amoy Testnet

This guide will help you deploy and configure the MediChain system on the Polygon Amoy testnet.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **MetaMask** or another Web3 wallet
4. **Polygon Amoy testnet MATIC** (for gas fees)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Polygon Amoy Testnet Configuration
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
NEXT_PUBLIC_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/

# Contract Addresses (Update these after deployment)
NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE

# Admin Configuration
NEXT_PUBLIC_ADMIN_WALLETS=YOUR_ADMIN_WALLET_ADDRESS_HERE

# Private Key for Contract Deployment (Keep this secret!)
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# PolygonScan API Key (Optional, for contract verification)
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY_HERE

# MongoDB Configuration
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING_HERE
MONGODB_DB_NAME=medichain

# Encryption Key
ENCRYPTION_SECRET_KEY=MediChainSecretKey2024
```

## Step 3: Get Testnet MATIC

1. Visit the [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Amoy Testnet"
3. Connect your wallet
4. Request test MATIC tokens

## Step 4: Deploy Smart Contracts

### 4.1 Deploy to Polygon Amoy Testnet

```bash
npx hardhat run scripts/deploy.js --network amoy
```

### 4.2 Update Environment Variables

After successful deployment, copy the contract addresses and update your `.env` file:

```env
NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS=0x... # From deployment output
NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS=0x... # From deployment output
NEXT_PUBLIC_ADMIN_WALLETS=0x... # Your admin wallet address
```

## Step 5: Verify Contracts (Optional)

If you have a PolygonScan API key, verify your contracts:

```bash
npx hardhat verify --network amoy 0xMEDICHAIN_ADDRESS "ADMIN_ADDRESS"
npx hardhat verify --network amoy 0xFUNDRAISER_ADDRESS "ADMIN_ADDRESS" "MEDICHAIN_ADDRESS"
```

## Step 6: Start Development Server

```bash
npm run dev
```

## Step 7: Configure MetaMask

1. Open MetaMask
2. Add the Polygon Amoy testnet:
   - Network Name: `Polygon Amoy Testnet`
   - RPC URL: `https://rpc-amoy.polygon.technology/`
   - Chain ID: `80002`
   - Currency Symbol: `MATIC`
   - Block Explorer: `https://amoy.polygonscan.com/`

## Step 8: Test the System

1. **Connect Admin Wallet**: Visit `/dashboard/admin` and connect your admin wallet
2. **Verify Doctors**: Use the admin panel to verify doctor accounts
3. **Test Ban Functionality**: Try banning and unbanning users
4. **Test Consultation Logging**: Have a verified doctor log a consultation

## Troubleshooting

### Common Issues

#### 1. "require(false)" Error
- **Cause**: Doctor is not verified or banned
- **Solution**: Verify the doctor through the admin panel first

#### 2. "Transaction Failed" Error
- **Cause**: Insufficient MATIC for gas fees
- **Solution**: Get more test MATIC from the faucet

#### 3. "Network Error" Error
- **Cause**: Wrong network selected
- **Solution**: Switch to Polygon Amoy testnet (Chain ID: 80002)

#### 4. "Contract Not Found" Error
- **Cause**: Wrong contract address or network
- **Solution**: Verify contract addresses and network configuration

### Ban Button Not Working

The ban functionality has been fixed and now:
1. **Registers users** on the blockchain before banning
2. **Updates both blockchain and database** when banning/unbanning
3. **Shows loading states** during operations
4. **Provides proper error handling** and user feedback

### Verification Process

1. **Admin connects wallet** to the admin dashboard
2. **Admin verifies doctor** through the blockchain
3. **Doctor can now log consultations** on the blockchain
4. **Banned users cannot perform actions** until unbanned

## Smart Contract Features

### MediChain Contract
- ✅ Doctor verification system
- ✅ User ban management
- ✅ Consultation logging
- ✅ Access control
- ✅ Event emission

### Fundraiser Contract
- ✅ Campaign creation (verified doctors only)
- ✅ Donation system
- ✅ Fund withdrawal
- ✅ Campaign management
- ✅ Integration with MediChain verification

## Security Features

- **Access Control**: Only contract owner can verify doctors and manage bans
- **Verification Required**: Doctors must be verified before logging consultations
- **Ban System**: Banned users cannot perform any actions
- **Input Validation**: All inputs are validated on-chain
- **Event Logging**: All important actions are logged as events

## Network Information

- **Network Name**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology/
- **Block Explorer**: https://amoy.polygonscan.com/
- **Currency**: MATIC (test tokens)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your environment variables are correct
3. Ensure you're on the correct network
4. Check that you have sufficient MATIC for gas fees

## Next Steps

After successful setup:
1. **Test all functionality** thoroughly
2. **Verify contracts** on PolygonScan
3. **Document any customizations** you make
4. **Prepare for mainnet deployment** when ready
