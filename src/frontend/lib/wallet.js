
'use client';
import { toast } from '@/frontend/hooks/use-toast';
import { ethers } from 'ethers';

export const connectWallet = async () => {
    console.log("connectWallet called"); // Debug log
    if (typeof window.ethereum === 'undefined') {
        console.error("MetaMask not found (window.ethereum is undefined)"); // Debug log
        toast({
            variant: 'destructive',
            title: 'MetaMask Not Found',
            description: 'Please install MetaMask extension and refresh the page.',
        });
        return null;
    }

    try {
        console.log("Initializing provider..."); // Debug log
        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log("Requesting accounts..."); // Debug log
        const accounts = await provider.send("eth_requestAccounts", []);
        console.log("Accounts received:", accounts); // Debug log

        if (accounts.length > 0) {
            toast({
                title: 'Wallet Connected',
                description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
            });
            return accounts[0];
        }

        return null;
    } catch (error) {
        console.error("Wallet connection failed:", error);

        if (error.code === 4001) {
            toast({
                variant: 'destructive',
                title: 'Connection Rejected',
                description: 'You rejected the wallet connection request.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Connection Failed',
                description: 'Could not connect to MetaMask. Please check your wallet extension and try again.',
            });
        }
        return null;
    }
};
