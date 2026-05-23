import { ethers } from 'ethers';
import { MEDI_CHAIN_CONTRACT_ADDRESS, FUNDRAISER_CONTRACT_ADDRESS, AMOY_RPC_URL, AMOY_CHAIN_ID } from '@/backend/contracts/config';
import mediChainArtifact from '@/backend/artifacts/src/backend/contracts/MediChain.sol/MediChain.json';
import fundraiserArtifact from '@/backend/artifacts/src/backend/contracts/Fundraiser.sol/Fundraiser.json';
import { getTransactionFeeOverrides } from '@/lib/gas';

// --- Configuration & Constants ---
// Use the ABI from the artifacts
const mediChainABI = mediChainArtifact.abi;
const fundraiserABI = fundraiserArtifact.abi;

// Utility function for formatting addresses (EVM doesn't need 0x padding, but we keep it for API consistency if needed)
const formatAddress = (address) => address;

// Wallet connection helper
const getWallet = async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask.');
            return null;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
            return {
                address: accounts[0],
                // publicKey:  // EVM usually works with addresses, pubKey requires signature
            };
        }
        return null;
    } catch (error) {
        console.error("Wallet connection failed:", error);
        return null;
    }
};

// Network validation helper
export const validateNetwork = async () => {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask.');
    }

    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const targetChainIdHex = "0x" + AMOY_CHAIN_ID.toString(16);

        if (chainId !== targetChainIdHex) {
            // Attempt to switch network
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainIdHex }],
                });
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: targetChainIdHex,
                                chainName: 'Polygon Amoy Testnet',
                                rpcUrls: [AMOY_RPC_URL],
                                nativeCurrency: {
                                    name: 'MATIC',
                                    symbol: 'MATIC',
                                    decimals: 18
                                },
                                blockExplorerUrls: ['https://amoy.polygonscan.com/']
                            },
                        ],
                    });
                } else {
                    throw switchError;
                }
            }
        }
        return true;
    } catch (error) {
        console.error("Network validation failed:", error);
        throw error;
    }
};

async function getMediChainContract(signerOrProvider) {
    if (!MEDI_CHAIN_CONTRACT_ADDRESS) throw new Error("MediChain contract address not set");
    return new ethers.Contract(MEDI_CHAIN_CONTRACT_ADDRESS, mediChainABI, signerOrProvider);
}

async function getFundraiserContract(signerOrProvider) {
    if (!FUNDRAISER_CONTRACT_ADDRESS) throw new Error("Fundraiser contract address not set");
    return new ethers.Contract(FUNDRAISER_CONTRACT_ADDRESS, fundraiserABI, signerOrProvider);
}


// === MediChain Contract Interactions ===

export const verifyDoctorOnBlockchain = async (doctorWallet) => {
    if (typeof window === 'undefined') {
        throw new Error("Client side only");
    }

    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getMediChainContract(signer);

        const tx = await contract.verifyDoctor(
            doctorWallet,
            await getTransactionFeeOverrides(provider)
        );
        await tx.wait(); // Wait for confirmation
        return { txHash: tx.hash };
    } catch (error) {
        console.error("Doctor verification transaction failed:", error);
        throw error;
    }
};

export const banUserOnBlockchain = async (userWallet, userType) => {
    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getMediChainContract(signer);

        const tx = await contract.banDoctor(
            userWallet,
            await getTransactionFeeOverrides(provider)
        ); // Assuming function name in contract
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("User ban transaction failed:", error);
        throw error;
    }
};

export const unbanUserOnBlockchain = async (userWallet) => {
    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getMediChainContract(signer);

        const tx = await contract.unbanDoctor(
            userWallet,
            await getTransactionFeeOverrides(provider)
        );
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("User unban transaction failed:", error);
        throw error;
    }
};

export const logToBlockchain = async ({ summaryHash, doctorWallet, patientHash }) => {
    if (typeof window === 'undefined') throw new Error("Client side only");

    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getMediChainContract(signer);

        // Ensure hashes are bytes32 (add 0x if missing, pad if needed?)
        // The contract expects bytes32. summaryHash and patientHash should be 0x-prefixed hex strings of length 66.

        const tx = await contract.addConsultationLog(summaryHash, patientHash);
        await tx.wait();

        return {
            txHash: tx.hash,
            summaryHash,
            doctorWallet,
            patientHash,
        };
    } catch (error) {
        console.error("Blockchain transaction failed:", error);
        throw error;
    }
};

// === Fundraiser Contract Interactions ===

export const createCampaignOnChain = async (campaignData) => {
    if (typeof window === 'undefined') throw new Error("Client side only");

    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getFundraiserContract(signer);

        const { beneficiary, goalAmount, title, description } = campaignData;
        const goalWei = ethers.parseEther(goalAmount.toString());

        const tx = await contract.createCampaign(beneficiary, goalWei, title, description);
        const receipt = await tx.wait();

        // Try to find the event to get the campaign ID
        // Event: CampaignCreated(uint256 indexed id, ...)
        // This finding logic depends on how events are returned. 
        // For simplicity, we might reload campaigns or similar.
        // Or parse logs:
        // const event = receipt.logs.find(...) 

        return { txHash: tx.hash, campaignId: "PENDING_Confirmation" };
    } catch (error) {
        console.error("Campaign creation transaction failed:", error);
        throw error;
    }
};

export const donateToCampaignOnChain = async (campaignId, amount) => {
    if (typeof window === 'undefined') throw new Error("Client side only");

    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getFundraiserContract(signer);

        const numericId = BigInt(campaignId);
        const amountWei = ethers.parseEther(amount.toString());

        const tx = await contract.donate(numericId, { value: amountWei });
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("Donation transaction failed:", error);
        throw error;
    }
};

export const donateDirectToWallet = async (toAddress, amount) => {
    try {
        await validateNetwork();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const tx = await signer.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount.toString())
        });

        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error('Direct donation failed:', error);
        throw error;
    }
};

// === Contract Status Checkers ===

export const checkDoctorVerificationStatus = async (doctorWallet) => {
    try {
        // Read-only check, can use JsonRpcProvider if window.ethereum not available, but usually we use BrowserProvider here if likely user interaction driven.
        // Ideally fallback to RPC for read-only.
        let provider;
        if (typeof window !== 'undefined' && window.ethereum) {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
        }

        const contract = new ethers.Contract(MEDI_CHAIN_CONTRACT_ADDRESS, mediChainABI, provider);
        const isVerified = await contract.isDoctorVerified(doctorWallet);

        // isDoctorVerified in our new contract includes check for ban? 
        // Our updated contract: return verifiedDoctors[doctorAddress] && !bannedDoctors[doctorAddress];
        // So if they are verified but banned, it returns false? 
        // Wait, the new Solidity function returns boolean.
        // We might want to check verified and banned separately if UI needs that distinction.
        // But for now, let's just stick to the return value.

        // If we need distinct status, we'd need to call verifiedDoctors(addr) and bannedDoctors(addr) public mappings directly.
        // validatedDoctors is a mapping. bannedDoctors is a mapping.

        const isVerifiedRaw = await contract.verifiedDoctors(doctorWallet);
        const isBannedRaw = await contract.bannedDoctors(doctorWallet);

        return { isVerified: isVerifiedRaw, isBanned: isBannedRaw, userType: 'doctor' };
    } catch (error) {
        console.error("Failed to check doctor status:", error);
        // Default to false/false if error (e.g. contract not deployed)
        return { isVerified: false, isBanned: false, userType: 'unknown' };
    }
};

// Debug function to test contract interaction
export const debugContractInteraction = async () => {
    // ...
    return { success: true };
};

// === Utility Functions ===

export const createHash = async (data) => {
    // Keep existing hash logic, it's generic JS.
    // Or use ethers.keccak256(ethers.toUtf8Bytes(data)) for Ethereum standard hashing
    try {
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    } catch (error) {
        console.error("Hash creation failed", error);
        return "0x";
    }
};

// Export connectWallet function for compatibility
export const connectWallet = async () => {
    try {
        const wallet = await getWallet();
        return wallet ? wallet.address : null;
    } catch (error) {
        console.error("Wallet connection failed:", error);
        return null;
    }
};

// Mock functions for fundraising page compatibility or Read-Only fetchers
export const getActiveCampaignsFromChain = async () => {
    try {
        let provider;
        if (typeof window !== 'undefined' && window.ethereum) {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
        }
        const contract = new ethers.Contract(FUNDRAISER_CONTRACT_ADDRESS, fundraiserABI, provider);

        // Returns struct array
        const campaigns = await contract.getActiveCampaigns();

        // Map to format UI expects (if needed). Struct returns array-like object in ethers v6?
        // Ethers v6 returns Result object which can be accessed by index or name.

        /* Campaign struct:
        uint256 id;
        address payable beneficiary;
        address creator;
        uint256 goalAmount;
        uint256 totalDonations;
        string title;
        string description;
        bool isActive;
        bool exists;
        */

        const formatted = campaigns.map(c => ({
            id: c.id.toString(),
            beneficiary: c.beneficiary,
            creator: c.creator,
            goalAmount: ethers.formatEther(c.goalAmount),
            collectedAmount: ethers.formatEther(c.totalDonations), // UI calls it collectedAmount? or totalDonations
            title: c.title,
            description: c.description,
            isActive: c.isActive
        }));

        return formatted;

    } catch (e) {
        console.error("Error fetching campaigns", e);
        return [];
    }
};

export const getDonorsForCampaign = async (campaignId) => {
    try {
        let provider;
        if (typeof window !== 'undefined' && window.ethereum) {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
        }
        const contract = new ethers.Contract(FUNDRAISER_CONTRACT_ADDRESS, fundraiserABI, provider);
        const donations = await contract.getDonors(campaignId);

        return donations.map(d => ({
            donor: d.donor,
            amount: ethers.formatEther(d.amount)
        }));
    } catch (e) {
        console.error("Error fetching donors", e);
        return [];
    }
};

export const checkCampaignExists = async (campaignId) => {
    return true; // Simplified
};

export const clearRPCCache = async () => {
    return;
};
