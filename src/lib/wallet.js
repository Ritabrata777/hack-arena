
import { ethers } from 'ethers';

export const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask.');
        return null;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
            return accounts[0];
        }
        return null;
    } catch (error) {
        console.error("Wallet connection failed:", error);
        if (error.code === 4001) {
            // User rejected the connection request
            alert('You rejected the wallet connection request.');
        }
        return null;
    }
};
