
'use client';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { useToast } from '@/frontend/hooks/use-toast';
import { getEmergencyVaultData } from '@/backend/services/mongodb';
import { decryptData } from '@/backend/lib/crypto';
import { Loader2, KeyRound, User, FileText, Download, Eye } from 'lucide-react';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import Image from 'next/image';

const EmergencyAccess = () => {
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
                // Decrypt documents with error handling
                const allDocuments = (data.patientProfile.healthDocuments || []).map(doc => {
                    try {
                        // Validate encrypted data exists and is a string
                        if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string' || doc.encryptedUri.trim() === '') {
                            throw new Error('No encrypted data found for document');
                        }
                        
                        const decryptedUri = decryptData(doc.encryptedUri);
                        if (!decryptedUri) {
                            throw new Error('Decryption returned null');
                        }
                        
                        return {
                            ...doc,
                            decryptedUri: decryptedUri,
                            decryptError: false,
                        };
                    } catch (decryptError) {
                        console.warn(`Failed to decrypt document ${doc.name}:`, decryptError);
                        console.warn(`Encrypted data preview:`, doc.encryptedUri ? doc.encryptedUri.substring(0, 100) + '...' : 'No data');
                        return {
                            ...doc,
                            decryptedUri: null,
                            decryptError: true,
                            errorMessage: decryptError.message,
                        };
                    }
                });
                
                const decryptedDocuments = allDocuments.filter(doc => !doc.decryptError);
                const failedDocuments = allDocuments.filter(doc => doc.decryptError);

                setVaultData({
                    patientProfile: data.patientProfile,
                    healthDocuments: decryptedDocuments,
                    failedDocuments: failedDocuments,
                });

                // Debug logging
                console.log('Emergency Access Success:', {
                    patientName: data.patientProfile.name,
                    totalDocuments: data.patientProfile.healthDocuments?.length || 0,
                    accessibleDocuments: decryptedDocuments.length,
                    failedDocuments: failedDocuments.length
                });

                toast({ 
                    title: 'Access Granted', 
                    description: `Successfully loaded ${decryptedDocuments.length} documents for ${data.patientProfile.name || 'patient'}.` 
                });
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
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader className="text-center">
                    <KeyRound className="h-12 w-12 mx-auto text-primary mb-4" />
                    <CardTitle className="font-headline text-3xl">Emergency Access Portal</CardTitle>
                    <CardDescription>Access patient's emergency medical documents using their emergency access code.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-center gap-2">
                            <Input
                                id="accessCode"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                placeholder="Enter emergency code (e.g., MED12345)"
                                className="text-lg text-center font-mono tracking-widest max-w-sm"
                            />
                            <Button onClick={handleAccessVault} disabled={isLoading || accessCode.length < 6}>
                                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                Access Records
                            </Button>
                        </div>
                        
                    </div>
                </CardContent>
            </Card>

            {vaultData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Patient Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <User className="h-10 w-10 text-muted-foreground"/>
                            <div>
                                <h3 className="font-semibold text-lg">{vaultData.patientProfile.name || 'Patient Profile'}</h3>
                                <p className="text-sm text-muted-foreground">Wallet: {vaultData.patientProfile.walletAddress}</p>
                            </div>
                        </div>


                        <div>
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Emergency Medical Documents ({vaultData.healthDocuments.length})
                            </h4>
                            
                            
                            {vaultData.healthDocuments.length > 0 ? (
                                <ScrollArea className="h-80 w-full rounded-md border p-4">
                                    <div className="space-y-3">
                                        {vaultData.healthDocuments.map((doc, index) => (
                                            <div key={index} className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                                                <div className="flex items-center gap-3">
                                                    {doc.decryptedUri.startsWith('data:image') ?
                                                        <Image src={doc.decryptedUri} alt={doc.name} width={48} height={48} className="rounded object-cover border" /> :
                                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                                            <FileText className="h-6 w-6 text-primary" />
                                                        </div>
                                                    }
                                                    <div>
                                                        <p className="font-medium">{doc.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {doc.category || 'Document'} • {new Date(doc.uploadedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => {
                                                            // Open in new tab for viewing
                                                            const win = window.open();
                                                            if (win) {
                                                                if (doc.decryptedUri.startsWith('data:image')) {
                                                                    win.document.write(`<img src="${doc.decryptedUri}" style="max-width:100%;height:auto;" />`);
                                                                } else if (doc.decryptedUri.includes('pdf')) {
                                                                    win.document.write(`<iframe src="${doc.decryptedUri}" style="width:100%;height:100vh;" frameborder="0"></iframe>`);
                                                                } else {
                                                                    win.document.write(`<iframe src="${doc.decryptedUri}" style="width:100%;height:100vh;" frameborder="0"></iframe>`);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4"/>
                                                        View
                                                    </Button>
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm"
                                                        onClick={() => {
                                                            // Download the file
                                                            const link = document.createElement('a');
                                                            link.href = doc.decryptedUri;
                                                            link.download = doc.name;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                    >
                                                        <Download className="mr-2 h-4 w-4"/>
                                                        Download
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-12 bg-muted/30 rounded-lg border">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No emergency documents found in this patient's vault.</p>
                                </div>
                            )}
                        </div>
                        
                        {vaultData.failedDocuments && vaultData.failedDocuments.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-4 flex items-center gap-2 text-amber-600">
                                    <FileText className="h-4 w-4" />
                                    Documents with Access Issues ({vaultData.failedDocuments.length})
                                </h4>
                                <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                                        The following documents could not be decrypted and are not accessible:
                                    </p>
                                    <div className="space-y-3">
                                        {vaultData.failedDocuments.map((doc, index) => (
                                            <div key={index} className="p-3 bg-amber-100 dark:bg-amber-900 rounded-lg border border-amber-300 dark:border-amber-700">
                                                <div className="flex items-center gap-2 text-sm mb-2">
                                                    <FileText className="h-4 w-4 text-amber-600" />
                                                    <span className="font-medium text-amber-800 dark:text-amber-200">{doc.name}</span>
                                                    <span className="text-xs text-amber-600">({doc.category || 'Document'})</span>
                                                </div>
                                                <div className="text-xs text-amber-700 dark:text-amber-300">
                                                    <strong>Error:</strong> {doc.errorMessage || 'Decryption failed'}
                                                </div>
                                                <div className="text-xs text-amber-600 mt-1">
                                                    <strong>Data preview:</strong> {doc.encryptedUri ? doc.encryptedUri.substring(0, 50) + '...' : 'No encrypted data'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default EmergencyAccess;
