'use client';

import { ethers } from 'ethers';
import { MEDI_CHAIN_CONTRACT_ADDRESS, AMOY_RPC_URL } from '@/backend/contracts/config';
import configABI from '@/backend/artifacts/src/backend/contracts/MediChain.sol/MediChain.json';
import { getTransactionFeeOverrides } from '@/lib/gas';

const AMOY_CHAIN_ID = 80002;
const AMOY_CHAIN_ID_HEX = '0x13882'; // 80002 in hex

// === Wallet Connection & Network ===

export const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this application.');
        return null;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);

        if (accounts.length > 0) {
            // Check network and switch if necessary
            await validateNetwork();
            return accounts[0];
        }
        return null;
    } catch (error) {
        console.error("Wallet connection failed:", error);
        if (error.code === 4001) {
            alert('You rejected the wallet connection request.');
        }
        return null;
    }
};

export const getWallet = async () => {
    if (typeof window.ethereum === 'undefined') return null;

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
            return {
                address: accounts[0].address,
                publicKey: accounts[0].address // In EVM, address is derived from public key
            };
        }
        return null;
    } catch (error) {
        console.error("Failed to get wallet:", error);
        return null;
    }
};

export const validateNetwork = async () => {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== AMOY_CHAIN_ID) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: AMOY_CHAIN_ID_HEX }],
            });
            return true;
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: AMOY_CHAIN_ID_HEX,
                                chainName: 'Polygon Amoy Testnet',
                                rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                                blockExplorerUrls: ['https://amoy.polygonscan.com/'],
                                nativeCurrency: {
                                    name: 'POL',
                                    symbol: 'POL',
                                    decimals: 18
                                }
                            },
                        ],
                    });
                    return true;
                } catch (addError) {
                    throw new Error('Failed to add functionality to MetaMask.');
                }
            }
            throw new Error('Please switch your wallet to Polygon Amoy Testnet.');
        }
    }
    return true;
};

// === Contract Interactions ===

const getContract = async (signerPromise) => {
    if (!MEDI_CHAIN_CONTRACT_ADDRESS) throw new Error("Contract address not configured");

    const signer = await signerPromise;
    return new ethers.Contract(MEDI_CHAIN_CONTRACT_ADDRESS, configABI.abi, signer);
};

export const logToBlockchain = async ({ summaryHash, doctorWallet, patientHash }) => {
    try {
        const validated = await validateNetwork();
        if (!validated) throw new Error("Wrong network");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getContract(signer);

        const tx = await contract.addConsultationLog(
            summaryHash,
            patientHash,
            await getTransactionFeeOverrides(provider)
        );
        await tx.wait();

        return {
            txHash: tx.hash,
            summaryHash,
            doctorWallet, // In EVM this is msg.sender
            patientHash
        };
    } catch (error) {
        console.error("Blockchain transaction failed:", error);
        throw error;
    }
};

export const verifyDoctorOnBlockchain = async (doctorAddress) => {
    try {
        const validated = await validateNetwork();
        if (!validated) throw new Error("Wrong network");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getContract(signer);

        const tx = await contract.verifyDoctor(
            doctorAddress,
            await getTransactionFeeOverrides(provider)
        );
        await tx.wait();

        return { txHash: tx.hash };
    } catch (error) {
        console.error("Doctor verification failed:", error);
        throw error;
    }
};

export const isDoctorVerified = async (doctorAddress) => {
    try {
        // Read-only, no signer needed necessarily, but good to be connected
        if (!MEDI_CHAIN_CONTRACT_ADDRESS) return false;

        // Use a simple provider for read calls if wallet not connected, 
        // but typically we want to be on the right network
        let provider;
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            provider = new ethers.JsonRpcProvider(AMOY_RPC_URL || "https://rpc-amoy.polygon.technology");
        }

        const contract = new ethers.Contract(MEDI_CHAIN_CONTRACT_ADDRESS, configABI.abi, provider);
        return await contract.isDoctorVerified(doctorAddress);
    } catch (error) {
        console.error("Check doctor verification failed:", error);
        return false;
    }
};

export const createHash = async (data) => {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
};

// === Mock/Placeholder for compatibility or unimplemented features ===

export const banUserOnBlockchain = async (userWallet) => {
    try {
        const validated = await validateNetwork();
        if (!validated) throw new Error("Wrong network");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getContract(signer);

        const tx = await contract.banDoctor(
            userWallet,
            await getTransactionFeeOverrides(provider)
        );
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("Ban doctor failed:", error);
        throw error;
    }
};

export const unbanUserOnBlockchain = async (userWallet) => {
    try {
        const validated = await validateNetwork();
        if (!validated) throw new Error("Wrong network");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getContract(signer);

        const tx = await contract.unbanDoctor(
            userWallet,
            await getTransactionFeeOverrides(provider)
        );
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("Unban doctor failed:", error);
        throw error;
    }
};

export const checkDoctorVerificationStatus = async (doctorWallet) => {
    const isVerified = await isDoctorVerified(doctorWallet);
    // In the new contract, isDoctorVerified checks both verification and ban status
    return { isVerified, isBanned: !isVerified, userType: 'doctor' };
};

// === Health Record Wallet Interactions ===

export const hasConsent = async ({ patient, grantee, scopeId }) => {
    try {
        // Read-only check
        if (!MEDI_CHAIN_CONTRACT_ADDRESS) return false;

        let provider;
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            provider = new ethers.JsonRpcProvider(AMOY_RPC_URL || "https://rpc-amoy.polygon.technology");
        }

        const contract = new ethers.Contract(MEDI_CHAIN_CONTRACT_ADDRESS, configABI.abi, provider);
        // Scope ID needs to be bytes32
        const scopeHash = await createHash(scopeId);
        return await contract.checkConsent(patient, grantee, scopeHash);
    } catch (error) {
        console.error("Failed to check consent:", error);
        return false;
    }
};

export const grantConsent = async ({ patient, grantee, scopeId, expiresAt }) => {
    try {
        const validated = await validateNetwork();
        if (!validated) throw new Error("Wrong network");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getContract(signer);

        const scopeHash = await createHash(scopeId);
        // Expiry should be unix timestamp (seconds), ensure input is correct

        const tx = await contract.grantConsent(grantee, scopeHash, expiresAt);
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("Grant consent failed:", error);
        throw error;
    }
};

export const revokeConsent = async ({ patient, grantee, scopeId }) => {
    try {
        const validated = await validateNetwork();
        if (!validated) throw new Error("Wrong network");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = await getContract(signer);

        const scopeHash = await createHash(scopeId);

        const tx = await contract.revokeConsent(grantee, scopeHash);
        await tx.wait();
        return { txHash: tx.hash };
    } catch (error) {
        console.error("Revoke consent failed:", error);
        throw error;
    }
};

// Wrapper for SharedDocuments.jsx compatibility
export const canDoctorAccessRecord = async (recordId, doctorAddress, patientAddress) => {
    return await hasConsent({
        patient: patientAddress,
        grantee: doctorAddress,
        scopeId: recordId
    });
};

// wrapper for compatibility with ConsentManager.jsx
export const approveDoctorForRecord = async (recordId, doctorAddress) => {
    // recordId is the scopeId / hash
    // Default duration is handled in UI, but if not passed here we might need to change signature 
    // or assume infinite/default.
    // However, ConsentManager calls it as: approveDoctorForRecord(document.blockchainRecordId, request.doctorId)
    // It doesn't pass duration. We'll default to 24 hours (or whatever creates a valid tx).
    // Actually, UI handles expiry updates in Mongo. On chain we just need > now.
    // Let's set a default long expiry for on-chain 'access capability' 
    // or we should update ConsentManager to pass it. 
    // For now, default to 30 days on chain to be safe.
    const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    const patientWallet = await getWallet();
    return await grantConsent({
        patient: patientWallet.address,
        grantee: doctorAddress,
        scopeId: recordId,
        expiresAt: expiry
    });
};

export const revokeDoctorForRecord = async (recordId, doctorAddress) => {
    const patientWallet = await getWallet();
    return await revokeConsent({
        patient: patientWallet.address,
        grantee: doctorAddress,
        scopeId: recordId
    });
};

// "Upload" for patient context often means just registering the hash or granting self-access
// Since the contract doesn't have a specific `addRecord` for patients, we will
// use `grantConsent` to SELF as a way to "register" the existence of the hash on-chain
// securely under the patient's control.
export const uploadHealthRecord = async (fileHash) => {
    const patientWallet = await getWallet();
    if (!patientWallet) throw new Error("Wallet not connected");

    // Grant consent to self => effectively registers the hash in the mapping associated with the owner
    const expiry = Math.floor(Date.now() / 1000) + (3650 * 24 * 60 * 60); // 10 years
    const result = await grantConsent({
        patient: patientWallet.address,
        grantee: patientWallet.address,
        scopeId: fileHash,
        expiresAt: expiry
    });

    // Return format expected by ConsentManager
    return {
        recordId: fileHash,
        txHash: result.txHash
    };
};

export const formatAddress = (address) => address; // EVM addresses don't need special formatting
