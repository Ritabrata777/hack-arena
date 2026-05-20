
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Label } from '@/frontend/components/ui/label';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { Save, Wallet, ShieldCheck, Star, Info } from 'lucide-react';
import { connectWallet } from '@/frontend/lib/wallet';
import { Badge } from '@/frontend/components/ui/badge';
import { updateDoctorProfile } from '@/backend/services/mongodb';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/frontend/components/ui/tooltip"

const Profile = ({ consultations, doctorProfiles, setDoctorProfiles, activeWallet, setActiveWallet, refreshData }) => {
    const [profileData, setProfileData] = useState({
        name: '',
        specialization: '',
        licenseId: '',
        walletAddress: '',
        verified: false,
        email: '',
        phone: '',
    });
    const { toast } = useToast();

    useEffect(() => {
        if (activeWallet && doctorProfiles[activeWallet.toLowerCase()]) {
            const currentProfile = doctorProfiles[activeWallet.toLowerCase()];
            setProfileData({
                name: currentProfile.name || '',
                specialization: currentProfile.specialization || '',
                licenseId: currentProfile.licenseId || '',
                walletAddress: currentProfile.walletAddress || activeWallet,
                verified: currentProfile.verified || false,
                email: currentProfile.email || '',
                phone: currentProfile.phone || '',
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
             const profileToUpdate = { ...doctorProfiles[activeWallet.toLowerCase()], verified: true };
            try {
                await updateDoctorProfile(activeWallet, profileToUpdate);
                toast({ title: "Profile Verified", description: "Your profile now has a verified status." });
                if(refreshData) await refreshData(); 
            } catch (error) {
                console.error("Verification failed:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not verify profile." });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeWallet) {
            try {
                // Ensure we are updating the full existing profile with changes
                const fullProfile = doctorProfiles[activeWallet.toLowerCase()] || {};
                const updatedProfile = { 
                    ...fullProfile, 
                    email: profileData.email, 
                    phone: profileData.phone 
                };
                
                await updateDoctorProfile(activeWallet, updatedProfile);
                
                setDoctorProfiles(prev => ({
                    ...prev,
                    [activeWallet.toLowerCase()]: updatedProfile
                }));

                toast({
                    title: "Profile Saved",
                    description: "Your contact information has been updated.",
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
                    <CardDescription>Manage your professional information. Core identity details are locked for security.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" value={profileData.name} readOnly disabled placeholder="Dr. John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="specialization">Specialization</Label>
                            <Input id="specialization" name="specialization" value={profileData.specialization} readOnly disabled placeholder="Cardiology" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="licenseId">Medical License ID</Label>
                            <Input id="licenseId" name="licenseId" value={profileData.licenseId} readOnly disabled placeholder="MD12345678" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address (Editable)</Label>
                            <Input id="email" name="email" type="email" value={profileData.email} onChange={handleChange} placeholder="doctor@example.com" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (Editable)</Label>
                            <Input id="phone" name="phone" type="tel" value={profileData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="walletAddress">Wallet Address (UID)</Label>
                             <div className="flex items-center gap-2">
                                <Input id="walletAddress" name="walletAddress" value={profileData.walletAddress} readOnly disabled placeholder="0x...YourWalletAddress"/>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Your wallet address is your permanent, unique identifier and cannot be changed.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                         <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" />
                                Save Contact Info
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                     <div className="flex justify-between items-center w-full p-4 border rounded-lg">
                        <div>
                            <h4 className="font-semibold">Verification Status</h4>
                            <p className="text-sm text-muted-foreground">This is handled by the admin after registration.</p>
                        </div>
                        {profileData.verified ? (
                            <Badge variant="secondary" className="text-green-600 border-green-600"><ShieldCheck className="mr-2 h-4 w-4" />Verified</Badge>
                        ) : (
                             <Badge variant="outline"><ShieldCheck className="mr-2 h-4 w-4" />Pending Verification</Badge>
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
