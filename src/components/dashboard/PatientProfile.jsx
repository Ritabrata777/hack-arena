'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Save, Wallet } from 'lucide-react';
import { connectWallet } from '@/lib/wallet';
import { updatePatientProfile } from '@/services/mongodb';

const PatientProfile = ({ patientProfiles, setPatientProfiles, activeWallet, setActiveWallet }) => {
    const [profileData, setProfileData] = useState({ name: '', walletAddress: '', profilePhoto: '' });
    const { toast } = useToast();

    useEffect(() => {
        if (activeWallet && patientProfiles[activeWallet.toLowerCase()]) {
            const currentProfile = patientProfiles[activeWallet.toLowerCase()];
            setProfileData({
                name: currentProfile.name || '',
                walletAddress: currentProfile.walletAddress || '',
                profilePhoto: currentProfile.profilePhoto || '',
            });
        } else {
            setProfileData({ name: '', walletAddress: activeWallet || '', profilePhoto: '' });
        }
    }, [activeWallet, patientProfiles]);

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleConnectWallet = async () => {
        const account = await connectWallet();
        if (account) {
            setActiveWallet(account);
            setProfileData(prev => ({ ...prev, walletAddress: account }));
            toast({
                title: "Wallet Connected",
                description: `Address: ${account.substring(0, 6)}...${account.substring(account.length - 4)}`,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description: "Could not connect to wallet. Please check your wallet extension and try again.",
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeWallet) {
            try {
                // This function now saves to MongoDB
                await updatePatientProfile(activeWallet, profileData);
                 // Optimistically update parent state, using lowercase key for consistency
                setPatientProfiles({
                    ...patientProfiles,
                    [activeWallet.toLowerCase()]: profileData
                });
                toast({
                    title: "Profile Saved",
                    description: "Your information has been saved to the database.",
                });
            } catch(error) {
                 toast({
                    variant: "destructive",
                    title: "Save Error",
                    description: "Could not save your profile to the database.",
                });
                console.error("Profile save error:", error);
            }
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please connect your wallet first.",
            });
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Patient Profile</CardTitle>
                    <CardDescription>Manage your personal information. This data is saved to the database.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" value={profileData.name} onChange={handleChange} placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="walletAddress">Wallet Address (Your UID)</Label>
                             <div className="flex items-center gap-2">
                                <Input id="walletAddress" name="walletAddress" value={profileData.walletAddress} readOnly placeholder="0x...YourWalletAddress"/>
                                <Button type="button" variant="outline" onClick={handleConnectWallet}><Wallet className="mr-2 h-4 w-4" />Connect</Button>
                            </div>
                             <p className="text-xs text-muted-foreground">Your wallet address is your unique identifier for viewing your records.</p>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" />
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default PatientProfile;
