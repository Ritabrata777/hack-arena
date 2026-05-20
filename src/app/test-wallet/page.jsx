'use client';
import { useState, useEffect } from 'react';
import { connectWallet, validateNetwork } from '@/frontend/lib/blockchain';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Alert, AlertDescription } from '@/frontend/components/ui/alert';
import { Badge } from '@/frontend/components/ui/badge';
import { Wallet, CheckCircle, XCircle, RefreshCw, Network } from 'lucide-react';
import { toast } from '@/frontend/hooks/use-toast';
import { ethers } from 'ethers';

const AMOY_CHAIN_ID = 80002;

export default function TestWalletPage() {
    const [walletStatus, setWalletStatus] = useState({
        installed: false,
        connected: false,
        account: null,
        chainId: null,
        networkCorrect: false
    });
    const [isLoading, setIsLoading] = useState(false);

    const checkWalletStatus = async () => {
        const status = {
            installed: typeof window.ethereum !== 'undefined',
            connected: false,
            account: null,
            chainId: null,
            networkCorrect: false
        };

        if (status.installed) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();
                const network = await provider.getNetwork();
                const chainId = Number(network.chainId);

                if (accounts.length > 0) {
                    status.connected = true;
                    status.account = accounts[0].address;
                }

                status.chainId = chainId;
                status.networkCorrect = chainId === AMOY_CHAIN_ID;

                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        setWalletStatus(prev => ({ ...prev, connected: false, account: null }));
                    } else {
                        setWalletStatus(prev => ({ ...prev, connected: true, account: accounts[0] }));
                    }
                });

                // Listen for chain changes
                window.ethereum.on('chainChanged', (chainId) => {
                    window.location.reload();
                });

            } catch (error) {
                console.error('Error checking wallet status:', error);
            }
        }

        setWalletStatus(status);
    };

    useEffect(() => {
        checkWalletStatus();
        return () => {
            if (window.ethereum) {
                window.ethereum.removeAllListeners('accountsChanged');
                window.ethereum.removeAllListeners('chainChanged');
            }
        };
    }, []);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const account = await connectWallet();
            if (account) {
                await checkWalletStatus();
                toast({
                    title: 'Success',
                    description: 'Wallet connected successfully!',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Connection Failed',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchNetwork = async () => {
        setIsLoading(true);
        try {
            await validateNetwork();
            await checkWalletStatus();
            toast({
                title: 'Success',
                description: 'Switched to Polygon Amoy Testnet!',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Network Switch Failed',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-6 w-6" />
                        MetaMask Connection Test
                    </CardTitle>
                    <CardDescription>
                        Test and troubleshoot your MetaMask wallet connection for Polygon Amoy
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Status Overview */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            {walletStatus.installed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span>MetaMask Installed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {walletStatus.connected ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span>Wallet Connected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {walletStatus.networkCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span>Amoy Network</span>
                        </div>
                    </div>

                    {/* Account Info */}
                    {walletStatus.account && (
                        <Alert>
                            <AlertDescription>
                                <strong>Connected Account:</strong> {walletStatus.account}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Network Info */}
                    {walletStatus.chainId && (
                        <div className="flex items-center gap-2">
                            <Network className="h-4 w-4" />
                            <span>Chain ID: {walletStatus.chainId.toString()}</span>
                            {walletStatus.networkCorrect ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Correct (Amoy)</Badge>
                            ) : (
                                <Badge variant="destructive">Incorrect</Badge>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleConnect}
                            disabled={isLoading || walletStatus.connected}
                            className="flex-1"
                        >
                            {isLoading && !walletStatus.connected ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Wallet className="mr-2 h-4 w-4" />
                                    {walletStatus.connected ? 'Connected' : 'Connect Wallet'}
                                </>
                            )}
                        </Button>

                        {walletStatus.connected && !walletStatus.networkCorrect && (
                            <Button
                                onClick={handleSwitchNetwork}
                                disabled={isLoading}
                                variant="destructive"
                                className="flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Switching...
                                    </>
                                ) : (
                                    <>
                                        <Network className="mr-2 h-4 w-4" />
                                        Switch to Amoy
                                    </>
                                )}
                            </Button>
                        )}

                        <Button
                            onClick={checkWalletStatus}
                            disabled={isLoading}
                            variant="outline"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                        </Button>
                    </div>

                    {/* Troubleshooting Guide */}
                    {!walletStatus.installed && (
                        <Alert>
                            <AlertDescription>
                                <strong>MetaMask not found!</strong> Please install the MetaMask extension from{' '}
                                <a
                                    href="https://metamask.io/download/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 underline"
                                >
                                    metamask.io
                                </a>
                            </AlertDescription>
                        </Alert>
                    )}

                    {walletStatus.installed && !walletStatus.connected && (
                        <Alert>
                            <AlertDescription>
                                <strong>MetaMask not connected!</strong> Please connect your wallet to proceed.
                            </AlertDescription>
                        </Alert>
                    )}

                    {walletStatus.connected && !walletStatus.networkCorrect && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertDescription className="text-red-800">
                                <strong>Wrong Network:</strong> You are connected to chain ID {walletStatus.chainId}. Please switch to Polygon Amoy Testnet (Chain ID {AMOY_CHAIN_ID}).
                            </AlertDescription>
                        </Alert>
                    )}

                    {walletStatus.installed && walletStatus.connected && walletStatus.networkCorrect && (
                        <Alert className="border-green-200 bg-green-50">
                            <AlertDescription className="text-green-800">
                                <strong>✅ All good!</strong> Your wallet is properly configured and ready to use with MediChain on Polygon Amoy.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
