'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Save, Wallet, ShieldCheck, Star } from 'lucide-react';
import { connectWallet } from '@/lib/wallet';
import { Badge } from '@/components/ui/badge';
import { updateDoctorProfile } from '@/services/mongodb';

const Profile = ({ consultations, doctorProfiles, setDoctorProfiles, activeWallet, setActiveWallet }) => {
    const [profileData, setProfileData] = useState({
        name: '',
        specialization: '',
        licenseId: '',
        walletAddress: '',
        verified: false
    });
    const { toast } = useToast();

    useEffect(() => {
        if (activeWallet && doctorProfiles[activeWallet.toLowerCase()]) {
            setProfileData(doctorProfiles[activeWallet.toLowerCase()]);
        } else {
             setProfileData({
                name: '',
                specialization: '',
                licenseId: '',
                walletAddress: activeWallet || '',
                verified: false
            });
        }
    }, [activeWallet, doctorProfiles]);
    
    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleConnectWallet = async () => {
        const account = await connectWallet();
        if (account) {
            setActiveWallet(account);
            setProfileData(prev => ({...prev, walletAddress: account }));
            toast({
                title: "Wallet Connected",
                description: `Address: ${account.substring(0, 6)}...${account.substring(account.length - 4)}`,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description: "Could not connect to wallet.",
            });
        }
    };
    
    const handleVerify = async () => {
        if (activeWallet) {
            const updatedProfile = { ...profileData, verified: true };
            await updateDoctorProfile(activeWallet, updatedProfile);
            setDoctorProfiles({
                ...doctorProfiles,
                [activeWallet.toLowerCase()]: updatedProfile
            });
            setProfileData(updatedProfile); // Update local component state
            toast({ title: "Profile Verified", description: "Your profile now has a verified status." });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeWallet) {
            try {
                await updateDoctorProfile(activeWallet, profileData);
                // Optimistically update parent state, using lowercase for consistency
                setDoctorProfiles({
                    ...doctorProfiles,
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
             toast({ variant: "destructive", title: "Error", description: "Please connect your wallet first." });
        }
    };

    const doctorConsultations = (consultations || []).filter(c => c.doctorWallet?.toLowerCase() === activeWallet?.toLowerCase());
    const ratings = doctorConsultations.map(c => c.rating).filter(r => r && typeof r === 'number');
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;


    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Doctor Profile</CardTitle>
                    <CardDescription>Manage your professional information. This data is saved to the database.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" value={profileData.name} onChange={handleChange} placeholder="Dr. John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="specialization">Specialization</Label>
                            <Input id="specialization" name="specialization" value={profileData.specialization} onChange={handleChange} placeholder="Cardiology" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="licenseId">Medical License ID</Label>
                            <Input id="licenseId" name="licenseId" value={profileData.licenseId} onChange={handleChange} placeholder="MD12345678" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="walletAddress">Wallet Address (UID)</Label>
                             <div className="flex items-center gap-2">
                                <Input id="walletAddress" name="walletAddress" value={profileData.walletAddress} readOnly placeholder="0x...YourWalletAddress"/>
                                <Button type="button" variant="outline" onClick={handleConnectWallet}><Wallet className="mr-2 h-4 w-4" />Connect</Button>
                            </div>
                             <p className="text-xs text-muted-foreground">Your wallet address is your unique identifier. Click Connect to link your wallet.</p>
                        </div>
                         <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" />
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                     <div className="flex justify-between items-center w-full p-4 border rounded-lg">
                        <div>
                            <h4 className="font-semibold">Verification Status</h4>
                            <p className="text-sm text-muted-foreground">Get verified to build trust with patients.</p>
                        </div>
                        {profileData.verified ? (
                            <Badge variant="secondary" className="text-green-600 border-green-600"><ShieldCheck className="mr-2 h-4 w-4" />Verified</Badge>
                        ) : (
                            <Button variant="outline" onClick={handleVerify} disabled={!activeWallet || !profileData.licenseId}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Get Verified
                            </Button>
                        )}
                    </div>

                     <div className="flex justify-between items-center w-full p-4 border rounded-lg">
                        <div>
                            <h4 className="font-semibold">Reputation Score</h4>
                            <p className="text-sm text-muted-foreground">Based on {ratings.length} patient rating(s).</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-lg font-bold">{avgRating.toFixed(1)} / 5.0</span>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Profile;
