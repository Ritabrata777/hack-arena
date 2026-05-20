import { ethers } from 'ethers';
import MediChain from '@/backend/contracts/MediChain.json';
import { MEDI_CHAIN_CONTRACT_ADDRESS } from '@/backend/contracts/config';

// This is a placeholder for actual blockchain interaction.
// In a real app, you would use a library like ethers.js or web3.js to connect to a wallet
// and send a transaction to a smart contract on the Polygon Amoy testnet.

export const MEDI_CHAIN_ABI = MediChain.abi;

/**
 * Connects to the user's wallet and returns a contract instance.
 * @returns {Promise<{contract: ethers.Contract, signer: ethers.Signer}|null>}
 */
const getContract = async () => {
  try {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install a web3 wallet like MetaMask.');
      return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(
      MEDI_CHAIN_CONTRACT_ADDRESS,
      MEDI_CHAIN_ABI,
      signer
    );

    return { contract, signer };
  } catch (error) {
    console.error("Failed to get contract:", error);
    return null;
  }
}


export const logToBlockchain = async ({ summaryHash, doctorWallet, patientHash }) => {
  if (!MEDI_CHAIN_CONTRACT_ADDRESS || MEDI_CHAIN_CONTRACT_ADDRESS === '0xYOUR_CONTRACT_ADDRESS_HERE') {
    console.warn("Using mock blockchain transaction. Please update the contract address in your .env file (NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS).");
    // Fallback to mock if contract address is not set
    return Promise.resolve({
      txHash: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      summaryHash,
      doctorWallet,
      patientHash
    });
  }

  const { contract } = await getContract();

  if (!contract) {
    throw new Error("Could not connect to the blockchain contract. Make sure your wallet is connected.");
  }

  try {
    // This example logs the summary hash and patient hash.
    // A real smart contract might include more details.
    const transaction = await contract.addConsultationLog(summaryHash, patientHash);

    // Wait for the transaction to be mined
    const receipt = await transaction.wait();

    // Return the real transaction hash
    return {
      txHash: receipt.hash,
      summaryHash,
      doctorWallet,
      patientHash,
    };
  } catch (error) {
    console.error("Blockchain transaction failed:", error);

    // Handle user rejection
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error("Transaction was cancelled by you in MetaMask. You can try again when you're ready.");
    }

    // Handle gas estimation issues
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error("Gas estimation failed. Please try again or check your network connection.");
    }

    // Handle network errors
    if (error.message && error.message.includes("Internal JSON-RPC error")) {
      throw new Error("Network error. Please check your connection and try again.");
    }

    // Handle insufficient funds
    if (error.message && error.message.includes("insufficient funds")) {
      throw new Error("Insufficient MATIC for gas fees. Please get more test tokens from the Polygon Amoy faucet.");
    }

    // Handle doctor verification issues
    if (error.message && error.message.includes("Doctor is not verified")) {
      throw new Error("Doctor is not verified. Please contact admin for verification.");
    }

    // Handle doctor ban issues
    if (error.message && error.message.includes("Doctor is banned")) {
      throw new Error("Doctor is banned and cannot log consultations.");
    }

    // Handle wallet connection issues
    if (error.message && error.message.includes("wallet not connected")) {
      throw new Error("Please connect your MetaMask wallet and try again.");
    }

    // Handle wrong network
    if (error.message && error.message.includes("wrong network") || error.message.includes("chainId")) {
      throw new Error("Please switch your wallet to Polygon Amoy (80002) and try again.");
    }

    // Handle contract not found
    if (error.message && error.message.includes("contract not found")) {
      throw new Error("Smart contract not found. Please check your network connection.");
    }

    // Generic error with more context
    const errorMessage = error.message || error.reason || "Unknown error occurred";
    throw new Error(`Blockchain transaction failed: ${errorMessage}`);
  }
};

export const createHash = async (data) => {
  try {
    // Check if crypto.subtle is available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `0x${hashHex}`;
    }

    // Fallback for environments where crypto.subtle is not available
    console.warn('crypto.subtle not available, using fallback hash function');

    // Simple hash function fallback (not cryptographically secure, but functional)
    let hash = 0;
    if (data.length === 0) return '0x0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to hex string and pad to 64 characters (32 bytes)
    const hashHex = Math.abs(hash).toString(16).padStart(64, '0');
    return `0x${hashHex}`;

  } catch (error) {
    console.error('Error creating hash:', error);

    // Ultimate fallback - return a hash based on data length and timestamp
    const timestamp = Date.now().toString(16);
    const length = data.length.toString(16);
    const fallbackHash = `${timestamp}${length}`.padStart(64, '0');
    return `0x${fallbackHash}`;
  }
}
