
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Label } from '@/frontend/components/ui/label';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { Save, Wallet, UploadCloud, File as FileIcon, Trash2, UserPlus, Users, Loader2, Camera, X } from 'lucide-react';
import { connectWallet } from '@/frontend/lib/wallet';
import { updatePatientProfile } from '@/backend/services/mongodb';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/frontend/components/ui/dialog"


const DependentForm = ({ onAddDependent }) => {
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');

    const handleAdd = () => {
        if (name && dob) {
            onAddDependent({ id: uuidv4(), name, dob });
            setName('');
            setDob('');
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Dependent</DialogTitle>
                <DialogDescription>
                    Create a new profile for a family member you manage.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="dep-name">Dependent's Full Name</Label>
                    <Input id="dep-name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dep-dob">Dependent's Date of Birth</Label>
                    <Input id="dep-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button onClick={handleAdd}>Add Dependent</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}


const PatientProfile = ({ patientProfiles, setPatientProfiles, activeWallet, setActiveWallet, refreshData }) => {
    const [profileData, setProfileData] = useState({ name: '', walletAddress: '', documents: [], dependents: [], profilePhoto: '' });
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (activeWallet && patientProfiles[activeWallet.toLowerCase()]) {
            const currentProfile = patientProfiles[activeWallet.toLowerCase()];
            console.log('🔍 Loading profile data:', currentProfile);
            console.log('🔍 Profile photo:', currentProfile.profilePhoto);
            console.log('🔍 Profile photo length:', (currentProfile.profilePhoto || '').length);
            setProfileData({
                name: currentProfile.name || '',
                walletAddress: currentProfile.walletAddress || '',
                documents: currentProfile.documents || [],
                dependents: currentProfile.dependents || [],
                profilePhoto: currentProfile.profilePhoto || '',
            });
        } else {
            setProfileData({ name: '', walletAddress: activeWallet || '', documents: [], dependents: [], profilePhoto: '' });
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
        }
    };
    
    const fileToDataUri = (file) => new Promise((resolve, reject) => {
        if(!file) resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleProfilePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5_000_000) {
            toast({ variant: "destructive", title: "File too large", description: "Please upload files smaller than 5MB." });
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast({ variant: "destructive", title: "Invalid file type", description: "Please upload an image file (JPG, PNG, etc.)." });
            return;
        }

        try {
            const dataUri = await fileToDataUri(file);
            setProfileData(prev => ({
                ...prev,
                profilePhoto: dataUri
            }));
            toast({
                title: "Profile Photo Updated",
                description: "Your profile photo has been updated. Don't forget to save your profile!",
            });
        } catch (error) {
            toast({ variant: "destructive", title: "Upload Error", description: "Could not upload profile photo. Please try again." });
        }
    };

    const removeProfilePhoto = () => {
        setProfileData(prev => ({
            ...prev,
            profilePhoto: null
        }));
        toast({
            title: "Profile Photo Removed",
            description: "Your profile photo has been removed. Don't forget to save your profile!",
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5_000_000) {
            toast({ variant: "destructive", title: "File too large", description: "Please upload files smaller than 5MB." });
            return;
        }

        const dataUri = await fileToDataUri(file);
        const newDocument = {
            name: file.name,
            type: file.type,
            uri: dataUri,
            uploadedAt: new Date().toISOString()
        };
        
        setProfileData(prev => ({
            ...prev,
            documents: [...(prev.documents || []), newDocument]
        }));
    };
    
    const handleRemoveDocument = (index) => {
        setProfileData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index)
        }));
    };

    const handleAddDependent = (dependent) => {
        setProfileData(prev => ({
            ...prev,
            dependents: [...(prev.dependents || []), dependent]
        }));
    };

    const handleRemoveDependent = (id) => {
         setProfileData(prev => ({
            ...prev,
            dependents: prev.dependents.filter(dep => dep.id !== id)
        }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeWallet) {
            setIsSubmitting(true);
            try {
                await updatePatientProfile(activeWallet, profileData);
                setPatientProfiles(prev => ({
                    ...prev,
                    [activeWallet.toLowerCase()]: profileData
                }));
                toast({
                    title: "Profile Saved",
                    description: "Your information has been saved.",
                });
                if (refreshData) refreshData();
            } catch(error) {
                 toast({ variant: "destructive", title: "Save Error", description: "Could not save your profile."});
                 console.error("Profile save error:", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Your Profile</CardTitle>
                        <CardDescription>Manage your personal information, profile photo, documents, and family accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Photo Section */}
                        <div className="space-y-4">
                            <Label>Profile Photo</Label>
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    {(() => {
                                        console.log('🔍 Render check - profilePhoto:', profileData.profilePhoto);
                                        console.log('🔍 Render check - profilePhoto truthy:', !!profileData.profilePhoto);
                                        console.log('🔍 Render check - profilePhoto length:', (profileData.profilePhoto || '').length);
                                        return profileData.profilePhoto ? (
                                            <div className="relative">
                                                <Image 
                                                    src={profileData.profilePhoto} 
                                                    alt="Profile Photo" 
                                                    width={120} 
                                                    height={120} 
                                                    className="rounded-full border-4 border-primary/20 object-cover"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                                                    onClick={removeProfilePhoto}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="w-30 h-30 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                                                <Camera className="h-12 w-12 text-muted-foreground" />
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Upload a clear photo of yourself. This will be visible to doctors and in your profile.
                                    </p>
                                    <label htmlFor="profile-photo-upload" className="flex items-center justify-center gap-2 text-primary cursor-pointer hover:text-primary/80 w-full border border-primary/20 p-3 rounded-md hover:bg-primary/5 transition-colors">
                                        <UploadCloud className="h-4 w-4" />
                                        <span>{profileData.profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}</span>
                                    </label>
                                    <Input 
                                        id="profile-photo-upload" 
                                        type="file" 
                                        accept="image/*"
                                        className="sr-only" 
                                        onChange={handleProfilePhotoUpload} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" value={profileData.name || ''} onChange={handleChange} placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="walletAddress">Wallet Address (Your UID)</Label>
                             <div className="flex items-center gap-2">
                                <Input id="walletAddress" name="walletAddress" value={profileData.walletAddress} readOnly placeholder="0x...YourWalletAddress"/>
                                <Button type="button" variant="outline" onClick={handleConnectWallet}><Wallet className="mr-2 h-4 w-4" />Connect</Button>
                            </div>
                        </div>

                        {/* Dependents Management */}
                        <div className="space-y-4">
                            <Label>Family Accounts (Dependents)</Label>
                            <div className="p-4 border border-dashed rounded-lg space-y-4">
                                {(profileData.dependents || []).length > 0 ? (profileData.dependents.map((dep) => (
                                    <div key={dep.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-6 w-6 text-muted-foreground" />
                                            <div className="text-sm">
                                                <p className="font-medium">{dep.name}</p>
                                                <p className="text-xs text-muted-foreground">Born: {new Date(dep.dob).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDependent(dep.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))) : <p className="text-sm text-muted-foreground text-center">No dependents added.</p>}

                                 <Dialog>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" className="w-full">
                                            <UserPlus className="mr-2 h-4 w-4"/> Add Dependent
                                        </Button>
                                    </DialogTrigger>
                                    <DependentForm onAddDependent={handleAddDependent} />
                                </Dialog>
                            </div>
                        </div>

                         <div className="space-y-4">
                            <Label>Your Documents</Label>
                            <div className="p-4 border border-dashed rounded-lg space-y-4">
                                {(profileData.documents || []).map((doc, index) => (
                                    <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                            {doc.uri.startsWith('data:image') ?
                                                <Image src={doc.uri} alt={doc.name} width={32} height={32} className="rounded" /> :
                                                <FileIcon className="h-8 w-8 text-muted-foreground" />
                                            }
                                            <div className="text-sm">
                                                <a href={doc.uri} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{doc.name}</a>
                                                <p className="text-xs text-muted-foreground">Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDocument(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <label htmlFor="patient-doc-upload" className="flex items-center justify-center gap-2 text-primary cursor-pointer hover:text-primary/80 w-full border border-primary/20 p-2 rounded-md">
                                    <UploadCloud />
                                    <span>Upload New Document</span>
                                </label>
                                <Input id="patient-doc-upload" type="file" className="sr-only" onChange={handleFileUpload} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Save Profile
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default PatientProfile;
