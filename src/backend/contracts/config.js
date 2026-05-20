// Configuration for Polygon Amoy
export const MEDI_CHAIN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS;
export const FUNDRAISER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS;
export const HEALTH_WALLET_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HEALTH_WALLET_CONTRACT_ADDRESS;

// Polygon Amoy RPC URL
export const AMOY_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Polygon Amoy Chain ID
export const AMOY_CHAIN_ID = 80002;

// Admin wallets configuration
export const ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS ?
    process.env.NEXT_PUBLIC_ADMIN_WALLETS.toLowerCase().split(',') : [];

// Default configuration for development
export const DEFAULT_CONFIG = {
    mediChainAddress: MEDI_CHAIN_CONTRACT_ADDRESS || '0xYOUR_CONTRACT_ADDRESS_HERE',
    fundraiserAddress: FUNDRAISER_CONTRACT_ADDRESS || '0xYOUR_CONTRACT_ADDRESS_HERE',
    healthWalletAddress: HEALTH_WALLET_CONTRACT_ADDRESS || '0xYOUR_HEALTH_WALLET_CONTRACT_ADDRESS_HERE',
    rpcUrl: AMOY_RPC_URL,
    chainId: AMOY_CHAIN_ID
};
