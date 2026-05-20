'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { FileText, Users, ShieldCheck, AlertTriangle, Loader2, ShieldAlert, Wallet, ShieldX, CheckCircle2, Eye, Download, MoreHorizontal, Copy, HeartHandshake, Brain, RefreshCw } from 'lucide-react';
import { detectAnomalies } from '@/backend/ai/flows/detect-anomalies';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/frontend/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { Badge } from '@/frontend/components/ui/badge';
import { useToast } from "@/frontend/hooks/use-toast";
import { getAllConsultations, getAllDoctorProfiles, getAllPatientProfiles, updateDoctorProfile, updatePatientProfile, getFundraiserRequests, approveFundraiserRequest, updateFundraiserRequestStatus } from '@/backend/services/mongodb';
import { connectWallet } from '@/frontend/lib/wallet';
import { verifyDoctorOnBlockchain, banUserOnBlockchain, unbanUserOnBlockchain, checkDoctorVerificationStatus, debugContractInteraction } from '@/backend/lib/blockchain';
import { createCampaignOnChain } from '@/frontend/services/blockchain';
import MediChain from '@/backend/artifacts/src/backend/contracts/MediChain.sol/MediChain.json';
import { useLocalStorage } from '@/frontend/hooks/useLocalStorage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/frontend/components/ui/dialog';
import Image from 'next/image';
import { ethers } from 'ethers';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';


const ViewRequestDialog = ({ request, patient, doctor, onCheckFraud, fraudScore, isCheckingFraud }) => (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
            <DialogTitle>Fundraiser Request for {patient?.name}</DialogTitle>
            <DialogDescription>
                Verified by Dr. {doctor?.name}. Review details before final approval.
            </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                    <div>
                        <h4 className="font-semibold flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-500" />
                            AI Fraud Risk Assessment
                        </h4>
                        <p className="text-sm text-muted-foreground">Analyze this request for potential fraud patterns.</p>
                    </div>
                    <div className="text-right">
                        {fraudScore ? (
                            <div>
                                <div className={`text-xl font-bold ${fraudScore.risk_score > 50 ? 'text-destructive' : 'text-green-600'}`}>
                                    {fraudScore.risk_score}% Risk
                                </div>
                                <Badge variant={fraudScore.risk_score > 50 ? "destructive" : "outline"}>
                                    {fraudScore.prediction}
                                </Badge>
                                {fraudScore.reasons && fraudScore.reasons.length > 0 && (
                                    <div className="mt-2 text-xs text-destructive text-left">
                                        <ul className="list-disc list-inside">
                                            {fraudScore.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Button size="sm" variant="secondary" onClick={() => onCheckFraud(request)} disabled={isCheckingFraud}>
                                {isCheckingFraud ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                                Analyze Risk
                            </Button>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold">Campaign Title</h4>
                    <p>{request.title}</p>
                </div>
                <div>
                    <h4 className="font-semibold">Patient's Story</h4>
                    <p className="text-muted-foreground">{request.description}</p>
                </div>
                <div>
                    <h4 className="font-semibold">Goal Amount</h4>
                    <p>{request.goalAmount} APT</p>
                </div>
                <div>
                    <h4 className="font-semibold">Supporting Documents</h4>
                    <div className="mt-2 space-y-2">
                        {(request.documents && request.documents.length > 0) ? (
                            request.documents.map((doc, index) => (
                                <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                    <div className="flex items-center gap-2">
                                        {doc.uri.startsWith('data:image') ?
                                            <Image src={doc.uri} alt={doc.name} width={32} height={32} className="rounded" /> :
                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                        }
                                        <span className="text-sm font-medium">{doc.name}</span>
                                    </div>
                                    <a href={doc.uri} download={doc.name} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm"><Download className="mr-2" />Download</Button>
                                    </a>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground">No documents were provided for this request.</p>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold">Fund Usage Proof</h4>
                    <div className="mt-2 space-y-2">
                        {(request.proofs && request.proofs.length > 0) ? (
                            request.proofs.map((proof) => (
                                <div key={proof.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{proof.title}</p>
                                        <p className="text-xs text-muted-foreground">{proof.amount} APT - {new Date(proof.uploadedAt).toLocaleString()}</p>
                                    </div>
                                    {proof.receipt?.uri && (
                                        <a href={proof.receipt.uri} download={proof.receipt.name || 'receipt'} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm"><Download className="mr-2" />Receipt</Button>
                                        </a>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground">No spending receipts have been uploaded yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </ScrollArea>
    </DialogContent>
);

const AdminDashboard = () => {
    const [activeWallet, setActiveWallet] = useLocalStorage('activeAdminWallet', null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [consultations, setConsultations] = useState([]);
    const [doctorProfiles, setDoctorProfiles] = useState({});
    const [patientProfiles, setPatientProfiles] = useState({});
    const [anomalies, setAnomalies] = useState([]);
    const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(null); // Store wallet of doctor being verified
    const [isBanning, setIsBanning] = useState(null); // Store wallet of user being banned/unbanned
    const [isClient, setIsClient] = useState(false); // New state to track client-side mount
    const [contractOwner, setContractOwner] = useState(null); // Store contract owner address
    const [supportsOnchainBan, setSupportsOnchainBan] = useState(false);
    const [fundraisingRequests, setFundraisingRequests] = useState([]);
    const [isProcessingFundraiser, setIsProcessingFundraiser] = useState(null); // request ID
    const [fraudScores, setFraudScores] = useState({}); // { requestId: { risk_score, prediction } }
    const [isCheckingFraud, setIsCheckingFraud] = useState(null); // request ID being checked
    const [isTrainingModel, setIsTrainingModel] = useState(false);
    const { toast } = useToast();

    // Configuration: Control Contract Owner badge display
    const SHOW_CONTRACT_OWNER_BADGE = process.env.NEXT_PUBLIC_SHOW_CONTRACT_OWNER_BADGE !== 'false';

    useEffect(() => {
        try {
            const hasBanFunction = Array.isArray(MediChain?.abi) && MediChain.abi.some(f => f.type === 'function' && f.name === 'setUserBanStatus');
            setSupportsOnchainBan(hasBanFunction);
        } catch {
            setSupportsOnchainBan(false);
        }
    }, []);

    const isContractOwner = (walletAddress) => {
        if (!contractOwner || !SHOW_CONTRACT_OWNER_BADGE) return false;
        return walletAddress.toLowerCase() === contractOwner.toLowerCase();
    };

    const fetchContractOwner = async () => {
        try {
            if (typeof window !== 'undefined' && window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(
                    process.env.NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS,
                    ['function owner() view returns (address)'],
                    provider
                );
                const owner = await contract.owner();
                setContractOwner(owner);
            }
        } catch (error) {
            console.warn('Could not fetch contract owner:', error);
            setContractOwner(null);
        }
    };

    useEffect(() => {
        setIsClient(true);
    }, []);

    const fetchAdminData = useCallback(async () => {
        setIsDataLoading(true);
        try {
            const [consultationsData, docProfilesData, patProfilesData, fundRequestsData] = await Promise.all([
                getAllConsultations(),
                getAllDoctorProfiles(),
                getAllPatientProfiles(),
                getFundraiserRequests({ status: 'pending_admin_approval' })
            ]);
            setConsultations(consultationsData);
            setDoctorProfiles(docProfilesData);
            setPatientProfiles(patProfilesData);
            setFundraisingRequests(fundRequestsData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load dashboard data.' });
            console.error("Data fetch error: ", error);
        } finally {
            setIsDataLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isClient) return;
        const checkAuth = () => {
            if (!process.env.NEXT_PUBLIC_ADMIN_WALLETS) {
                console.error("Admin wallets are not configured. Please set NEXT_PUBLIC_ADMIN_WALLETS in your .env file.");
                setIsAuthorized(false);
                return;
            }
            const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS.toLowerCase().split(',');
            if (activeWallet && adminWallets.includes(activeWallet.toLowerCase())) {
                setIsAuthorized(true);
                fetchContractOwner();
            } else {
                setIsAuthorized(false);
            }
        };
        checkAuth();
    }, [activeWallet, isClient]);

    useEffect(() => {
        if (isAuthorized) {
            fetchAdminData();
        } else {
            if (isDataLoading) setIsDataLoading(false);
        }
    }, [isAuthorized, fetchAdminData]);

    const handleConnectWallet = async () => {
        const account = await connectWallet();
        if (account) {
            setActiveWallet(account);
        }
    };

    const handleDetectAnomalies = async () => {
        setIsLoadingAnomalies(true);
        try {
            const result = await detectAnomalies({ consultations });
            setAnomalies(result.anomalies);
        } catch (error) {
            console.error("Anomaly detection failed:", error);
        } finally {
            setIsLoadingAnomalies(false);
        }
    };

    const handleToggleVerify = async (wallet) => {
        const lowerCaseWallet = wallet.toLowerCase();
        const doctor = doctorProfiles[lowerCaseWallet];
        if (!doctor) return;

        const formattedWallet = wallet;
        console.log('Admin verification - Wallet:', formattedWallet);
        console.log('Admin verification - Original wallet:', wallet);
        console.log('Admin verification - Formatted wallet:', formattedWallet);

        // First, check on-chain status to avoid needless tx and handle sync drift
        try {
            const chainStatus = await checkDoctorVerificationStatus(formattedWallet);
            if (chainStatus?.isVerified) {
                if (!doctor.verified) {
                    const updatedProfile = {
                        ...doctor,
                        verified: true,
                        verificationStatus: 'verified',
                        verifiedAt: new Date().toISOString(),
                        verifiedBy: activeWallet || 'admin',
                    };
                    await updateDoctorProfile(wallet, updatedProfile);
                    setDoctorProfiles(prev => ({ ...prev, [lowerCaseWallet]: updatedProfile }));
                }
                toast({ title: "Already Verified", description: `Doctor ${wallet.substring(0, 6)}... is already verified on-chain. Status synced.` });
                return;
            }
        } catch (_) { /* ignore pre-check errors and attempt tx */ }

        setIsVerifying(wallet);
        try {
            await verifyDoctorOnBlockchain(formattedWallet);
            const updatedProfile = {
                ...doctor,
                verified: true,
                verificationStatus: 'verified',
                verifiedAt: new Date().toISOString(),
                verifiedBy: activeWallet || 'admin',
            };
            await updateDoctorProfile(wallet, updatedProfile);
            setDoctorProfiles(prev => ({ ...prev, [lowerCaseWallet]: updatedProfile }));
            toast({ title: "Success", description: `Doctor ${wallet.substring(0, 6)}... has been verified.` });
        } catch (error) {
            console.error("Doctor verification failed:", error);
            const msg = String(error?.message || "");
            if (msg.toLowerCase().includes('already verified')) {
                // If chain says already verified, just sync our DB/state and show success
                const updatedProfile = {
                    ...doctor,
                    verified: true,
                    verificationStatus: 'verified',
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: activeWallet || 'admin',
                };
                try {
                    await updateDoctorProfile(wallet, updatedProfile);
                    setDoctorProfiles(prev => ({ ...prev, [lowerCaseWallet]: updatedProfile }));
                } catch (_) { }
                toast({ title: "Already Verified", description: `Doctor ${wallet.substring(0, 6)}... is already verified on-chain. Status synced.` });
            } else {
                toast({ variant: "destructive", title: "Verification Failed", description: error.message || "Could not verify the doctor." });
            }
        } finally {
            setIsVerifying(null);
        }
    };

    const handleRejectDoctor = async (wallet) => {
        const lowerCaseWallet = wallet.toLowerCase();
        const doctor = doctorProfiles[lowerCaseWallet];
        if (!doctor) return;

        setIsVerifying(wallet);
        try {
            const updatedProfile = {
                ...doctor,
                verified: false,
                verificationStatus: 'rejected',
                rejectedAt: new Date().toISOString(),
                rejectedBy: activeWallet || 'admin',
            };
            await updateDoctorProfile(wallet, updatedProfile);
            setDoctorProfiles(prev => ({ ...prev, [lowerCaseWallet]: updatedProfile }));
            toast({ title: "Doctor Rejected", description: `Registration for ${doctor.name || wallet.substring(0, 6)} was marked rejected.` });
        } catch (error) {
            console.error("Doctor rejection failed:", error);
            toast({ variant: "destructive", title: "Rejection Failed", description: error.message || "Could not reject the doctor." });
        } finally {
            setIsVerifying(null);
        }
    };

    const handleDebugContract = async () => {
        try {
            await debugContractInteraction();
            toast({ title: "Debug Complete", description: "Check browser console for contract debug information." });
        } catch (error) {
            console.error("Debug failed:", error);
            toast({ variant: "destructive", title: "Debug Failed", description: error.message || "Could not debug contract." });
        }
    };

    const handleToggleBan = async (wallet, userType) => {
        const lowerCaseWallet = wallet.toLowerCase();
        const isDoctor = userType === 'doctor';
        const profile = isDoctor ? doctorProfiles[lowerCaseWallet] : patientProfiles[lowerCaseWallet];
        if (!profile) return;

        const isCurrentlyBanned = profile.banned;
        setIsBanning(wallet);

        try {
            if (isCurrentlyBanned) {
                await unbanUserOnBlockchain(wallet);
            } else {
                await banUserOnBlockchain(wallet, userType);
            }

            const updatedProfile = { ...profile, banned: !isCurrentlyBanned };

            if (isDoctor) {
                await updateDoctorProfile(wallet, updatedProfile);
                setDoctorProfiles(prev => ({ ...prev, [lowerCaseWallet]: updatedProfile }));
            } else {
                await updatePatientProfile(wallet, updatedProfile);
                setPatientProfiles(prev => ({ ...prev, [lowerCaseWallet]: updatedProfile }));
            }

            const action = isCurrentlyBanned ? 'unbanned' : 'banned';
            toast({ title: "Success", description: `${isDoctor ? 'Doctor' : 'Patient'} has been ${action}.` });

        } catch (error) {
            console.error("Ban/Unban operation failed:", error);
            toast({ variant: "destructive", title: "Operation Failed", description: error.message || `Could not ${isCurrentlyBanned ? 'unban' : 'ban'} the user.` });
        } finally {
            setIsBanning(null);
        }
    };

    const handleFundraiserApproval = async (request, newStatus) => {
        setIsProcessingFundraiser(request.id);
        try {
            if (newStatus === 'approved') {
                if (parseFloat(request.goalAmount) <= 0) {
                    toast({ variant: 'destructive', title: 'Invalid Goal Amount', description: 'Cannot approve request with 0 goal amount.' });
                    setIsProcessingFundraiser(null);
                    return;
                }
                // Call blockchain function directly from client side
                const tx = await createCampaignOnChain({
                    beneficiary: request.patientId,
                    goalAmount: request.goalAmount,
                    title: request.title,
                    description: request.description,
                    creator: request.doctorId,
                    requestId: request.id,
                });

                // Update database with the transaction result
                await approveFundraiserRequest(request.id, tx.campaignId);
                toast({ title: "Campaign Approved", description: "The fundraiser is now live on the blockchain." });
            } else {
                await updateFundraiserRequestStatus(request.id, newStatus);
                toast({ title: "Request Denied", description: "The fundraiser request has been denied." });
            }
            await fetchAdminData();
        } catch (error) {
            console.error(`Failed to ${newStatus} fundraiser:`, error);
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message || `Could not ${newStatus} the request.` });
        } finally {
            setIsProcessingFundraiser(null);
        }
    };

    const handleCheckFraud = async (request) => {
        setIsCheckingFraud(request.id);
        try {
            const response = await fetch('/api/admin/predict-fraud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goalAmount: request.goalAmount,
                    title: request.title,
                    description: request.description,
                    documents: request.documents
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setFraudScores(prev => ({ ...prev, [request.id]: data }));
        } catch (error) {
            console.error("Fraud Check Failed:", error);
            toast({ variant: 'destructive', title: 'Fraud Check Failed', description: error.message });
        } finally {
            setIsCheckingFraud(null);
        }
    };

    const handleTrainModel = async () => {
        setIsTrainingModel(true);
        try {
            const response = await fetch('/api/cron/train-model');
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            toast({ title: 'Training Initiated', description: data.message });
        } catch (error) {
            console.error("Training Failed:", error);
            toast({ variant: 'destructive', title: 'Training Failed', description: error.message });
        } finally {
            setIsTrainingModel(false);
        }
    };

    const DocumentViewer = ({ docUri, docName }) => {
        if (!docUri) return <p className="text-muted-foreground">Not provided</p>;

        if (docUri.startsWith('data:image')) {
            return <Image src={docUri} alt={docName} width={300} height={200} className="rounded-md mt-2 border" />;
        }

        if (docUri.startsWith('data:application/pdf')) {
            const sanitizedUrl = DOMPurify.sanitize(docUri);
            return (
                <a href={sanitizedUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-2 mt-2">
                    <Download className="h-4 w-4" /> View {docName || 'PDF'}
                </a>
            );
        }

        return (
            <a href={docUri} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                View Document
            </a>
        );
    };

    if (!isClient || isDataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    if (!activeWallet) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <ShieldAlert className="h-16 w-16 mx-auto text-primary mb-4" />
                        <CardTitle className="font-headline">Admin Access Required</CardTitle>
                        <CardDescription>Please connect your wallet to verify your identity.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleConnectWallet}>
                            <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                        </Button>
                        <Button onClick={handleDebugContract} variant="outline" className="w-full mt-2">
                            <Eye className="mr-2 h-4 w-4" />
                            Debug Contract
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
                <Card className="max-w-md w-full text-center bg-destructive/10 border-destructive">
                    <CardHeader>
                        <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
                        <CardTitle className="font-headline">Access Denied</CardTitle>
                        <CardDescription className="text-destructive-foreground">The connected wallet ({`${activeWallet.substring(0, 6)}...${activeWallet.substring(activeWallet.length - 4)}`}) is not authorized for admin access.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => setActiveWallet(null)}>
                            Disconnect and Try Another Wallet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const uniqueDoctorsCount = Object.keys(doctorProfiles).length;
    const verifiedDoctorsCount = Object.values(doctorProfiles).filter(p => p.verified).length;

    return (
        <div className="min-h-screen flex flex-col gradient-bg-welcome text-foreground">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
                <div className="flex items-center">
                    <h1 className="font-headline text-xl font-bold text-foreground">MediChain Admin</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <div className="grid gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold font-headline">Audit & Management Dashboard</h1>
                        <p className="text-muted-foreground">An overview of the MediChain network activity and user management tools.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{consultations.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{uniqueDoctorsCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Verified Doctors</CardTitle>
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{verifiedDoctorsCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Fundraisers</CardTitle>
                                <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{fundraisingRequests.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="doctors">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="doctors">Manage Doctors</TabsTrigger>
                            <TabsTrigger value="patients">Manage Patients</TabsTrigger>
                            <TabsTrigger value="fundraising">Fundraising</TabsTrigger>
                            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
                        </TabsList>
                        <TabsContent value="doctors">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Manage Doctors</CardTitle>
                                    <CardDescription>Verify, ban, or unban doctor accounts.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[60vh] rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[350px]">Doctor</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>License</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.values(doctorProfiles).map(p => {
                                                    const shortWallet = `${p.walletAddress.substring(0, 6)}...${p.walletAddress.substring(p.walletAddress.length - 4)}`;
                                                    const verificationStatus = p.verificationStatus || (p.verified ? 'verified' : 'pending');
                                                    const licenseExpired = p.licenseExpiry ? new Date(p.licenseExpiry) < new Date() : false;
                                                    return (
                                                        <TableRow key={p.walletAddress}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-4">
                                                                    <Avatar>
                                                                        <AvatarImage src={p.documents?.photo} alt={p.name} />
                                                                        <AvatarFallback>{p.name ? p.name.charAt(0) : 'D'}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="font-medium">{p.name || 'N/A'}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-xs text-muted-foreground font-code">{shortWallet}</p>
                                                                            <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => { navigator.clipboard.writeText(p.walletAddress); toast({ title: "Copied!", description: "Wallet address copied to clipboard." }); }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1">
                                                                    {verificationStatus === 'verified' ? (
                                                                        <Badge variant="secondary" className="text-green-600 border-green-600 bg-green-50 w-fit">
                                                                            <ShieldCheck className="mr-1 h-3 w-3" />
                                                                            Verified
                                                                        </Badge>
                                                                    ) : verificationStatus === 'rejected' ? (
                                                                        <Badge variant="destructive" className="w-fit">
                                                                            <ShieldX className="mr-1 h-3 w-3" />
                                                                            Rejected
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-gray-600 w-fit">
                                                                            <ShieldAlert className="mr-1 h-3 w-3" />
                                                                            Pending
                                                                        </Badge>
                                                                    )}
                                                                    {p.banned && <Badge variant="destructive" className="w-fit">Banned</Badge>}
                                                                    {isContractOwner(p.walletAddress) && <Badge variant="secondary" className="w-fit">Owner</Badge>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <p className="text-sm font-medium">{p.licenseId || 'Not provided'}</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.licenseExpiry && (
                                                                            <Badge variant={licenseExpired ? 'destructive' : 'outline'} className="text-xs">
                                                                                {licenseExpired ? 'Expired' : 'Expires'} {new Date(p.licenseExpiry).toLocaleDateString()}
                                                                            </Badge>
                                                                        )}
                                                                        {p.documents?.license && <Badge variant="secondary" className="text-xs">License file</Badge>}
                                                                        {p.documents?.govtId && <Badge variant="outline" className="text-xs">ID proof</Badge>}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{p.email}</TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                            <span className="sr-only">Actions</span>
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />
                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                                                </DropdownMenuItem>
                                                                            </DialogTrigger>
                                                                            <DialogContent className="max-w-3xl">
                                                                                <DialogHeader>
                                                                                    <DialogTitle>Doctor Profile: {p.name}</DialogTitle>
                                                                                    <DialogDescription>{p.walletAddress}</DialogDescription>
                                                                                </DialogHeader>
                                                                                <ScrollArea className="h-[60vh] p-4">
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                                        <div className="space-y-4">
                                                                                            <h4 className="font-semibold text-lg">Personal Details</h4>
                                                                                            <p><strong>Email:</strong> {p.email}</p>
                                                                                            <p><strong>Phone:</strong> {p.phone || 'N/A'}</p>
                                                                                            <p><strong>Gender:</strong> {p.gender}</p>
                                                                                            <p><strong>DOB:</strong> {p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A'}</p>

                                                                                            <h4 className="font-semibold text-lg mt-4">Professional Details</h4>
                                                                                            <p><strong>License #:</strong> {p.licenseId}</p>
                                                                                            <p><strong>License Expiry:</strong> {p.licenseExpiry ? new Date(p.licenseExpiry).toLocaleDateString() : 'N/A'}</p>
                                                                                            <p><strong>Specialization:</strong> {p.specialization}</p>
                                                                                            <p><strong>Experience:</strong> {p.experience} years</p>
                                                                                            <p><strong>Clinic:</strong> {p.clinic || 'N/A'}</p>
                                                                                            <p><strong>Location:</strong> {p.location}</p>
                                                                                            <div className="rounded-md border p-3 space-y-2">
                                                                                                <h4 className="font-semibold">Verification Review</h4>
                                                                                                <p><strong>Status:</strong> {p.verificationStatus || (p.verified ? 'verified' : 'pending')}</p>
                                                                                                <p><strong>Submitted:</strong> {p.submittedAt ? new Date(p.submittedAt).toLocaleString() : 'Not recorded'}</p>
                                                                                                <p><strong>Verified:</strong> {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : 'Not yet'}</p>
                                                                                                <p><strong>Reviewed by:</strong> {p.verifiedBy || p.rejectedBy || 'Not recorded'}</p>
                                                                                                <div className="flex flex-wrap gap-2 pt-1">
                                                                                                    <Badge variant={p.licenseId ? 'secondary' : 'destructive'}>Registration number</Badge>
                                                                                                    <Badge variant={p.documents?.license ? 'secondary' : 'destructive'}>License certificate</Badge>
                                                                                                    <Badge variant={p.documents?.govtId ? 'outline' : 'secondary'}>Government ID</Badge>
                                                                                                    <Badge variant={p.licenseExpiry && new Date(p.licenseExpiry) < new Date() ? 'destructive' : 'outline'}>
                                                                                                        License expiry
                                                                                                    </Badge>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="space-y-4">
                                                                                            <h4 className="font-semibold text-lg">Uploaded Documents</h4>
                                                                                            <div>
                                                                                                <h5 className="font-medium">Profile Photo</h5>
                                                                                                <DocumentViewer docUri={p.documents?.photo} docName="Profile Photo" />
                                                                                            </div>
                                                                                            <div>
                                                                                                <h5 className="font-medium">Medical License</h5>
                                                                                                <DocumentViewer docUri={p.documents?.license} docName="Medical License" />
                                                                                            </div>
                                                                                            <div>
                                                                                                <h5 className="font-medium">Government ID</h5>
                                                                                                <DocumentViewer docUri={p.documents?.govtId} docName="Government ID" />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </ScrollArea>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                        <DropdownMenuItem onClick={() => handleToggleVerify(p.walletAddress)} disabled={p.verified || isVerifying === p.walletAddress}>
                                                                            {isVerifying === p.walletAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                                                            {p.verified ? 'Already Verified' : 'Verify Doctor'}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                            onClick={() => handleRejectDoctor(p.walletAddress)}
                                                                            disabled={p.verified || p.verificationStatus === 'rejected' || isVerifying === p.walletAddress}
                                                                        >
                                                                            {isVerifying === p.walletAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldX className="mr-2 h-4 w-4" />}
                                                                            {p.verificationStatus === 'rejected' ? 'Already Rejected' : 'Reject Registration'}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className={p.banned ? '' : 'text-destructive focus:bg-destructive/10 focus:text-destructive'}
                                                                            onClick={() => handleToggleBan(p.walletAddress, 'doctor')}
                                                                            disabled={isBanning === p.walletAddress || isContractOwner(p.walletAddress)}>
                                                                            {isBanning === p.walletAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : p.banned ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                                                            {p.banned ? 'Un-ban' : 'Ban'}
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="patients">
                            <Card>
                                <CardHeader><CardTitle>Manage Patients</CardTitle><CardDescription>Ban or unban patient accounts.</CardDescription></CardHeader>
                                <CardContent><ScrollArea className="h-72"><Table>
                                    <TableHeader><TableRow><TableHead>Wallet</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.values(patientProfiles).map(p => (
                                            <TableRow key={p.walletAddress}>
                                                <TableCell className="font-code text-xs">{p.walletAddress}</TableCell>
                                                <TableCell>{p.name || 'N/A'}</TableCell>
                                                <TableCell>{p.banned && <Badge variant="destructive">Banned</Badge>}</TableCell>
                                                <TableCell className="space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleToggleBan(p.walletAddress, 'patient')}
                                                        disabled={isBanning === p.walletAddress || isContractOwner(p.walletAddress)}
                                                        title={
                                                            isContractOwner(p.walletAddress)
                                                                ? 'Contract owner cannot be banned'
                                                                : supportsOnchainBan
                                                                    ? (p.banned ? 'Unban on-chain' : 'Ban on-chain')
                                                                    : 'On-chain ban unsupported; applies off-chain only'
                                                        }
                                                    >
                                                        {isBanning === p.walletAddress ? <Loader2 className="mr-2 animate-spin" /> : p.banned ? <CheckCircle2 className="mr-2" /> : <ShieldAlert className="mr-2" />}
                                                        {p.banned ? 'Un-ban' : 'Ban'}
                                                    </Button>
                                                    {isContractOwner(p.walletAddress) && (
                                                        <Badge variant="secondary" className="ml-2">Contract Owner</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table></ScrollArea></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="fundraising">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Fundraiser Verification</CardTitle>
                                            <CardDescription>Give final approval for doctor-verified fundraising campaigns.</CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleTrainModel} disabled={isTrainingModel} className="gap-2">
                                            {isTrainingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            Retrain AI Model
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-72">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Patient</TableHead>
                                                    <TableHead>Verifying Doctor</TableHead>
                                                    <TableHead>Campaign Title</TableHead>
                                                    <TableHead>Goal</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {fundraisingRequests.map(req => {
                                                    const patient = patientProfiles[req.patientId.toLowerCase()];
                                                    const doctor = doctorProfiles[req.doctorId.toLowerCase()];
                                                    return (
                                                        <TableRow key={req.id}>
                                                            <TableCell>{patient?.name || 'Unknown Patient'}</TableCell>
                                                            <TableCell>{doctor?.name || 'Unknown Doctor'}</TableCell>
                                                            <TableCell>{req.title}</TableCell>
                                                            <TableCell>{req.goalAmount} APT</TableCell>
                                                            <TableCell className="space-x-2">
                                                                {isProcessingFundraiser === req.id ? (
                                                                    <Loader2 className="animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Dialog>
                                                                            <DialogTrigger asChild><Button size="sm" variant="outline"><Eye className="mr-2" />Review</Button></DialogTrigger>
                                                                            <ViewRequestDialog
                                                                                request={req}
                                                                                patient={patient}
                                                                                doctor={doctor}
                                                                                onCheckFraud={handleCheckFraud}
                                                                                fraudScore={fraudScores[req.id]}
                                                                                isCheckingFraud={isCheckingFraud === req.id}
                                                                            />
                                                                        </Dialog>
                                                                        <Button size="sm" onClick={() => handleFundraiserApproval(req, 'approved')}><CheckCircle2 className="mr-2" />Approve</Button>
                                                                        <Button size="sm" variant="destructive" onClick={() => handleFundraiserApproval(req, 'denied')}><ShieldX className="mr-2" />Deny</Button>
                                                                    </>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="anomalies">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>AI-Powered Anomaly Detection</CardTitle>
                                            <CardDescription>Scan consultation logs for suspicious patterns.</CardDescription>
                                        </div>
                                        <Button onClick={handleDetectAnomalies} disabled={isLoadingAnomalies}>
                                            {isLoadingAnomalies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                                            Run Scan
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-64 rounded-md border">
                                        {anomalies.length > 0 ? (
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Doctor</TableHead><TableHead>Patient</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {anomalies.map((anomaly, index) => (
                                                        <TableRow key={index} className="bg-destructive/10">
                                                            <TableCell>{new Date(anomaly.consultation.timestamp).toLocaleString()}</TableCell>
                                                            <TableCell className="font-code text-xs">{anomaly.consultation.doctorWallet.substring(0, 12)}...</TableCell>
                                                            <TableCell className="font-code text-xs">{anomaly.consultation.patientId.substring(0, 12)}...</TableCell>
                                                            <TableCell>{anomaly.reason}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                                                <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold">No Anomalies Found</h3>
                                                <p className="text-sm text-muted-foreground">Run a scan to check for suspicious activity.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
