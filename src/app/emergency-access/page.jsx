
'use client';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { useToast } from '@/frontend/hooks/use-toast';
import { getEmergencyVaultData } from '@/backend/services/mongodb';
import { decryptData } from '@/backend/lib/crypto';
import { Loader2, KeyRound, User, FileText, Download } from 'lucide-react';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import Image from 'next/image';

const EmergencyAccessPage = () => {
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [vaultData, setVaultData] = useState(null);
    const { toast } = useToast();

    const handleAccessVault = async () => {
        if (accessCode.length < 6) {
            toast({ variant: 'destructive', title: 'Invalid Code', description: 'Access code must be at least 6 characters.' });
            return;
        }

        setIsLoading(true);
        setVaultData(null);

        try {
            const data = await getEmergencyVaultData(accessCode);
            if (data && data.patientProfile) {
                // Decrypt documents
                const decryptedDocuments = (data.patientProfile.healthDocuments || []).map(doc => ({
                    ...doc,
                    decryptedUri: decryptData(doc.encryptedUri),
                }));

                setVaultData({
                    patientProfile: data.patientProfile,
                    healthDocuments: decryptedDocuments,
                });

                toast({ title: 'Access Granted', description: `Viewing records for ${data.patientProfile.name || 'patient'}.` });
            } else {
                toast({ variant: 'destructive', title: 'Access Denied', description: 'The access code is invalid or has expired.' });
            }
        } catch (error) {
            console.error('Failed to access vault:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not retrieve health records. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gradient-bg-services p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <KeyRound className="h-12 w-12 mx-auto text-primary mb-4" />
                    <CardTitle className="font-headline text-3xl">Emergency Health Vault</CardTitle>
                    <CardDescription>Enter the patient's unique access code to view their critical health documents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center gap-2">
                        <Input
                            id="accessCode"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            placeholder="e.g., MED12345"
                            className="text-lg text-center font-mono tracking-widest max-w-xs"
                        />
                        <Button onClick={handleAccessVault} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
                            Access Records
                        </Button>
                    </div>
                </CardContent>

                {vaultData && (
                    <CardFooter className="flex-col items-start gap-4 pt-6 border-t">
                        <div className="flex items-center gap-4">
                            <User className="h-8 w-8 text-muted-foreground"/>
                            <div>
                                <h3 className="font-semibold text-lg">{vaultData.patientProfile.name || 'Patient Profile'}</h3>
                                <p className="text-sm text-muted-foreground">{vaultData.patientProfile.walletAddress}</p>
                            </div>
                        </div>

                        <h4 className="font-semibold mt-4">Uploaded Health Documents:</h4>
                        <ScrollArea className="h-64 w-full rounded-md border p-4">
                            {vaultData.healthDocuments.length > 0 ? (
                                <div className="space-y-4">
                                {vaultData.healthDocuments.map((doc, index) => (
                                    <div key={index} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                                        <div className="flex items-center gap-3">
                                            {doc.decryptedUri.startsWith('data:image') ?
                                                <Image src={doc.decryptedUri} alt={doc.name} width={40} height={40} className="rounded object-cover" /> :
                                                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                            }
                                            <div>
                                                <p className="font-medium text-sm">{doc.name}</p>
                                                <p className="text-xs text-muted-foreground">{doc.category || 'Document'}</p>
                                            </div>
                                        </div>
                                         <a href={doc.decryptedUri} download={doc.name} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm"><Download className="mr-2"/>View/Download</Button>
                                        </a>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No documents found in the vault.</p>
                            )}
                        </ScrollArea>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default EmergencyAccessPage;
