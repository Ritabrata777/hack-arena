'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { getActiveCampaignsFromChain, donateDirectToWallet, getDonorsForCampaign, checkCampaignExists, clearRPCCache } from '@/backend/lib/blockchain';
import { addDirectDonation, getDirectDonationsForCampaign, getAllPatientProfiles, getAllDoctorProfiles, getFundraiserRequests, getAllDirectDonations } from '@/backend/services/mongodb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HeartHandshake, FileText, Download, Users, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const DonateModal = ({ campaign, onDonationSuccess }) => {
    const [amount, setAmount] = useState('');
    const [patientAddress, setPatientAddress] = useState('');
    const [isDonating, setIsDonating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Set to campaign beneficiary address
        setPatientAddress(campaign.beneficiary);
    }, [campaign]);

    const handleDonate = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid donation amount.' });
            return;
        }
        // Check if wallet is available
        if (typeof window.ethereum === 'undefined') {
            toast({ variant: 'destructive', title: 'Wallet Not Found', description: 'Please install and connect MetaMask to make a donation.' });
            return;
        }
        setIsDonating(true);
        try {
            if (!patientAddress) {
                toast({ variant: 'destructive', title: 'Patient Wallet Required', description: 'Please enter the patient\'s wallet address.' });
                setIsDonating(false);
                return;
            }
            const { txHash } = await donateDirectToWallet(patientAddress, amount);
            try {
                // Get donor address from provider
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const donorAddress = await signer.getAddress();

                if (donorAddress) {
                    await addDirectDonation({ campaignId: campaign.id, donor: donorAddress, amount: parseFloat(amount), txHash });
                } else {
                    console.warn('No donor address available for donation tracking');
                }
            } catch (error) {
                console.error('Failed to track donation:', error);
            }
            toast({
                title: 'Donation Successful!',
                description: `${amount} APT has been transferred to the admin wallet for "${campaign.title}". Tx: ${txHash?.substring(0, 10)}...`
            });
            onDonationSuccess();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Donation Failed', description: error.message || 'Could not process your donation.' });
        } finally {
            setIsDonating(false);
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Donate to "{campaign.title}"</DialogTitle>
                <DialogDescription>
                    Your donation will be transferred to the patient's wallet address on Polygon Amoy Testnet.
                    <br />
                    <span className="text-sm text-muted-foreground">
                        Patient Wallet: {patientAddress}
                    </span>
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <div className="space-y-1">
                    <label htmlFor="patientAddress" className="text-sm font-medium">Patient Wallet Address</label>
                    <Input id="patientAddress" value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} placeholder="0x0000000000000000000000000000000000000000000000000000000000000000" />
                </div>
                <label htmlFor="amount" className="text-sm font-medium">Amount in APT</label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 10" />
            </div>
            <DialogFooter>
                <Button onClick={handleDonate} disabled={isDonating} className="w-full">
                    {isDonating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HeartHandshake className="mr-2" />}
                    Confirm Donation
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

const ViewDocumentsDialog = ({ request }) => (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
            <DialogTitle>Supporting Documents</DialogTitle>
            <DialogDescription>
                These documents were provided by the patient to support their fundraising request.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            {(request?.documents && request.documents.length > 0) ? (
                request.documents.map((doc, index) => (
                    <div key={`doc-${index}-${doc.name}`} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                        <div className="flex items-center gap-2">
                            {doc.uri.startsWith('data:image') ?
                                <Image src={doc.uri} alt={doc.name} width={32} height={32} className="rounded object-cover" /> :
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
                <p className="text-muted-foreground text-center py-4">No documents were provided for this campaign.</p>
            )}
        </div>
    </DialogContent>
)

const ViewProofsDialog = ({ campaign }) => (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
            <DialogTitle>Fund Usage Proof</DialogTitle>
            <DialogDescription>
                Receipts uploaded by the patient to show how donated funds were spent.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            {(campaign?.proofs && campaign.proofs.length > 0) ? (
                campaign.proofs.map((proof) => (
                    <div key={proof.id} className="flex items-center justify-between gap-3 bg-muted/50 p-3 rounded-md">
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{proof.title}</p>
                            <p className="text-xs text-muted-foreground">{proof.amount} APT - {new Date(proof.uploadedAt).toLocaleString()}</p>
                            {proof.note && <p className="text-xs text-muted-foreground truncate">{proof.note}</p>}
                        </div>
                        {proof.receipt?.uri && (
                            <a href={proof.receipt.uri} download={proof.receipt.name || 'receipt'} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Receipt</Button>
                            </a>
                        )}
                    </div>
                ))
            ) : (
                <p className="text-muted-foreground text-center py-4">No spending receipts have been uploaded yet.</p>
            )}
        </div>
    </DialogContent>
)

const ViewStoryDialog = ({ campaign }) => (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
            <DialogTitle>{campaign.title}</DialogTitle>
            <DialogDescription>A fundraising campaign for {campaign.patientName}.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-2">Patient's Story</h4>
            <p className="text-foreground whitespace-pre-wrap">{campaign.description}</p>
        </ScrollArea>
    </DialogContent>
);


const ViewDonationsDialog = ({ campaignId, patientProfiles = {}, doctorProfiles = {} }) => {
    const [donors, setDonors] = useState([]);
    const [directDonations, setDirectDonations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [campaignExists, setCampaignExists] = useState(null);

    const checkCampaignAndFetchDonors = useCallback(async () => {
        if (!campaignId) return;

        console.log(`ViewDonationsDialog: Fetching donors for campaign ID: ${campaignId}`);
        setIsLoading(true);
        setError(null);

        try {
            const exists = await checkCampaignExists(campaignId);
            setCampaignExists(exists);

            if (!exists) {
                console.log(`ViewDonationsDialog: Campaign ${campaignId} does not exist on blockchain`);
                setError('This campaign does not exist on the blockchain.');
                setDonors([]);
                setDirectDonations([]);
                return;
            }

            const [donorList, directDonationList] = await Promise.all([
                getDonorsForCampaign(campaignId),
                getDirectDonationsForCampaign(campaignId)
            ]);

            console.log(`ViewDonationsDialog: Found ${donorList.length} blockchain donors for campaign ${campaignId}:`, donorList);
            console.log(`ViewDonationsDialog: Found ${directDonationList.length} direct donations for campaign ${campaignId}:`, directDonationList);

            setDonors(donorList);
            setDirectDonations(directDonationList);

        } catch (err) {
            if (String(err.message).includes('Too Many Requests') || String(err.message).includes('rate limit')) {
                setError('Network is busy. Please wait a moment and try again.');
            } else if (String(err.message).includes('require(false)') || String(err.message).includes('execution reverted')) {
                setError('This campaign does not exist on the blockchain.');
                setCampaignExists(false);
            } else {
                setError('Failed to load donation history. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        // Reset state when campaignId changes
        setDonors([]);
        setDirectDonations([]);
        setError(null);
        checkCampaignAndFetchDonors();
    }, [checkCampaignAndFetchDonors]);

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Donation History</DialogTitle>
                <DialogDescription>
                    A transparent record of all donations made to this campaign, including both blockchain and direct donations.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-4">
                        <p className="text-destructive text-sm">{error}</p>
                        <div className="flex gap-2 justify-center mt-2">
                            <Button variant="outline" size="sm" onClick={() => { setError(null); setIsLoading(true); checkCampaignAndFetchDonors(); }}>
                                Try Again
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { clearRPCCache(); setError(null); setIsLoading(true); checkCampaignAndFetchDonors(); }}>
                                Refresh Cache
                            </Button>
                        </div>
                    </div>
                ) : (donors.length > 0 || directDonations.length > 0) ? (
                    <ScrollArea className="h-64">
                        <Table>
                            <TableHeader><TableRow><TableHead>Donor Address</TableHead><TableHead className="text-right">Amount (APT)</TableHead><TableHead className="text-right">Type</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {donors.map((donation, index) => (
                                    <TableRow key={`blockchain-${donation.donor}-${index}`}>
                                        <TableCell className="font-mono text-xs">
                                            <div>
                                                <div>{donation.donor}</div>
                                                {donation.txHash && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <span className="cursor-pointer hover:text-primary underline"
                                                            onClick={() => {
                                                                // Open transaction in PolygonScan
                                                                const hash = donation.txHash;
                                                                const explorerUrl = `https://amoy.polygonscan.com/tx/${hash}`;
                                                                window.open(explorerUrl, '_blank', 'noopener,noreferrer');
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                try {
                                                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                                                        navigator.clipboard.writeText(donation.txHash);
                                                                    } else {
                                                                        // Fallback for older browsers
                                                                        const textArea = document.createElement('textarea');
                                                                        textArea.value = donation.txHash;
                                                                        document.body.appendChild(textArea);
                                                                        textArea.select();
                                                                        document.execCommand('copy');
                                                                        document.body.removeChild(textArea);
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to copy transaction hash:', err);
                                                                }
                                                            }}
                                                            title="Click to view transaction on PolygonScan, Right-click to copy hash">
                                                            TX: {donation.txHash.slice(0, 10)}...{donation.txHash.slice(-8)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{donation.amount}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">Blockchain</TableCell>
                                    </TableRow>
                                ))}
                                {directDonations.map((donation, index) => (
                                    <TableRow key={`direct-${donation.donor}-${index}`}>
                                        <TableCell className="font-mono text-xs">
                                            <div>
                                                <div>{donation.donor && donation.donor.trim() !== '' ? donation.donor : 'Anonymous'}</div>
                                                {donation.txHash && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <span className="cursor-pointer hover:text-primary underline"
                                                            onClick={() => {
                                                                // Open transaction in PolygonScan
                                                                const hash = donation.txHash;
                                                                const explorerUrl = `https://amoy.polygonscan.com/tx/${hash}`;
                                                                window.open(explorerUrl, '_blank', 'noopener,noreferrer');
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                try {
                                                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                                                        navigator.clipboard.writeText(donation.txHash);
                                                                    } else {
                                                                        // Fallback for older browsers
                                                                        const textArea = document.createElement('textarea');
                                                                        textArea.value = donation.txHash;
                                                                        document.body.appendChild(textArea);
                                                                        textArea.select();
                                                                        document.execCommand('copy');
                                                                        document.body.removeChild(textArea);
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to copy transaction hash:', err);
                                                                }
                                                            }}
                                                            title="Click to view transaction on PolygonScan, Right-click to copy hash">
                                                            TX: {donation.txHash.slice(0, 10)}...{donation.txHash.slice(-8)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{donation.amount}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">Direct</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No donations have been made to this campaign yet.</p>
                )}
            </div>
        </DialogContent>
    );
};

const DonationProgress = ({ campaign }) => {
    const [directTotal, setDirectTotal] = useState(0);
    const [percent, setPercent] = useState(0);

    const compute = useCallback(async () => {
        try {
            console.log(`Fetching donations for campaign ID: ${campaign.id}`);
            const donations = await getDirectDonationsForCampaign(campaign.id);
            console.log(`Found ${donations.length} donations for campaign ${campaign.id}:`, donations);
            const extra = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            console.log(`Total for campaign ${campaign.id}: ${extra}`);
            setDirectTotal(extra);
            const total = extra || 0; // Only use direct donations, not campaign.totalDonations
            const goal = parseFloat(campaign.goalAmount || '0');
            const p = goal > 0 ? Math.min(100, Math.floor((total / goal) * 100)) : 0;
            setPercent(p);
        } catch (e) {
            console.error(`Error fetching donations for campaign ${campaign.id}:`, e);
            setDirectTotal(0);
            const goal = parseFloat(campaign.goalAmount || '0');
            const p = 0; // No donations if error
            setPercent(p);
        }
    }, [campaign.id, campaign.goalAmount]);

    useEffect(() => {
        compute();
    }, [compute]);

    const displayedTotal = (directTotal || 0).toFixed(4);
    const goalAmount = parseFloat(campaign.goalAmount || '0');

    // Don't show progress if goal amount is invalid or zero
    if (!goalAmount || goalAmount <= 0) {
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Goal amount not set</span>
                    <span className="text-sm font-medium text-muted-foreground">0%</span>
                </div>
                <Progress value={0} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-primary">{displayedTotal} / {goalAmount.toFixed(4)} APT Raised</span>
                <span className="text-sm font-medium">{percent}%</span>
            </div>
            <Progress value={percent} />
        </div>
    );
};

const CampaignCard = ({ campaign, patient, doctor, fetchCampaignData }) => {
    const isCampaignComplete = !campaign.isActive || parseInt(campaign.progress, 10) >= 100;
    const campaignWithPatientName = { ...campaign, patientName: patient?.name };

    return (
        <Card key={campaign.id} className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-xl">{campaign.title}</CardTitle>
                        <CardDescription>For patient <span className="font-semibold text-foreground">{patient?.name || 'Unknown'}</span></CardDescription>
                    </div>
                    <Avatar className="w-12 h-12 border-2 border-primary">
                        <AvatarImage src={patient?.profilePhoto} alt={patient?.name} />
                        <AvatarFallback>{patient?.name ? patient.name.charAt(0) : 'P'}</AvatarFallback>
                    </Avatar>
                </div>
                <Badge variant="secondary" className="mt-2 w-fit">
                    Verified by Dr. {doctor?.name || 'Unknown'}
                </Badge>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground h-16 overflow-hidden text-ellipsis">{campaign.description}</p>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-primary">Read More</Button>
                        </DialogTrigger>
                        <ViewStoryDialog campaign={campaignWithPatientName} />
                    </Dialog>
                </div>
                <DonationProgress key={`progress-${campaign.id}`} campaign={campaign} />
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-2">
                {isCampaignComplete ? (
                    <Button className="w-full" disabled><CheckCircle className="mr-2" /> Campaign Funded!</Button>
                ) : (
                    <Dialog><DialogTrigger asChild><Button className="w-full"><HeartHandshake className="mr-2" /> Donate Now</Button></DialogTrigger><DonateModal campaign={campaign} onDonationSuccess={fetchCampaignData} /></Dialog>
                )}
                <div className="flex w-full space-x-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full flex items-center justify-center">
                                <FileText className="mr-2 h-4 w-4" /> View Docs
                            </Button>
                        </DialogTrigger>
                        <ViewDocumentsDialog request={campaign} />
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full flex items-center justify-center">
                                <CheckCircle className="mr-2 h-4 w-4" /> Proofs
                            </Button>
                        </DialogTrigger>
                        <ViewProofsDialog campaign={campaign} />
                    </Dialog>
                </div>
                <div className="flex w-full">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full flex items-center justify-center">
                                <Users className="mr-2 h-4 w-4" /> View Donors
                            </Button>
                        </DialogTrigger>
                        <ViewDonationsDialog key={`donations-${campaign.id}`} campaignId={campaign.id} patientProfiles={{ [patient?.walletAddress]: patient }} doctorProfiles={{ [doctor?.walletAddress]: doctor }} />
                    </Dialog>
                </div>
            </CardFooter>
        </Card>
    );
}

const FundraisingPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [patientProfiles, setPatientProfiles] = useState({});
    const [doctorProfiles, setDoctorProfiles] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchCampaignData = useCallback(async () => {
        setIsLoading(true);
        try {
            clearRPCCache();
            const [activeCampaigns, profiles, requests, doctorProfilesMap] = await Promise.all([
                getActiveCampaignsFromChain(),
                getAllPatientProfiles(),
                getFundraiserRequests(),
                getAllDoctorProfiles()
            ]);


            // Get approved requests from database and convert them to campaign format
            const approvedRequests = requests.filter(r => r.status === 'approved');
            console.log('Approved requests:', approvedRequests);
            const campaignsFromRequests = approvedRequests.map((request, index) => {
                const campaignId = request.campaignId || `db-${request.id || `request-${index}-${Date.now()}`}`;
                console.log(`Creating campaign for request ${request.id} with campaignId: ${campaignId}`);
                return {
                    id: campaignId, // Ensure unique ID
                    beneficiary: request.patientId,
                    creator: request.doctorId,
                    goalAmount: request.goalAmount || '0', // Ensure goalAmount is set
                    totalDonations: '0', // Will be calculated dynamically per campaign
                    title: request.title || 'Untitled Campaign',
                    description: request.description || 'No description provided',
                    isActive: true,
                    documents: request.documents || [],
                    proofs: request.proofs || [],
                };
            });

            // Try to get blockchain campaigns and merge with database campaigns
            let campaignsWithDetails = campaignsFromRequests;
            if (activeCampaigns && activeCampaigns.length > 0) {
                // If we have blockchain campaigns, merge them with database campaigns
                campaignsWithDetails = activeCampaigns.map((c, index) => {
                    const request = requests.find(r => r.status === 'approved' && c.id.toString() === r.campaignId);
                    return {
                        ...c,
                        id: c.id.toString() || `blockchain-${index}`, // Ensure unique ID
                        documents: request?.documents || [],
                        proofs: request?.proofs || [],
                    };
                });
            } else {
                // Use database campaigns as fallback
                campaignsWithDetails = campaignsFromRequests;
            }

            // No fallback campaigns - only show campaigns from legitimate fundraiser requests

            const sorted = [...campaignsWithDetails].sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));

            // Ensure we only show campaigns with valid data
            const validCampaigns = sorted.filter(campaign =>
                campaign.id &&
                campaign.title &&
                campaign.goalAmount &&
                parseFloat(campaign.goalAmount) > 0
            );

            setCampaigns(validCampaigns);
            setPatientProfiles(profiles);
            setDoctorProfiles(doctorProfilesMap);
        } catch (error) {
            console.error("Failed to fetch campaign data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCampaignData();
    }, [fetchCampaignData]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center gradient-bg-services"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
    }

    return (
        <div className="min-h-screen gradient-bg-services">
            <header className="bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    <h1 className="text-2xl font-bold font-headline text-gradient">Medical Fundraisers</h1>
                    <Button variant="outline" onClick={() => router.push('/')}>Back to Home</Button>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 text-center max-w-2xl mx-auto">
                    <p className="text-lg text-muted-foreground">Support patients in need of funds for critical medical procedures. All campaigns are verified by a MediChain doctor and donations are tracked transparently on the blockchain.</p>
                </div>

                {campaigns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {campaigns.map((campaign, index) => {
                            const patient = patientProfiles[campaign.beneficiary.toLowerCase()];
                            const doctor = doctorProfiles[campaign.creator.toLowerCase()];
                            return <CampaignCard key={`${campaign.id}-${index}`} campaign={campaign} patient={patient} doctor={doctor} fetchCampaignData={fetchCampaignData} />
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <HeartHandshake className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Active Campaigns</h3>
                        <p className="mt-1 text-sm text-muted-foreground">There are currently no active fundraising campaigns.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FundraisingPage;
