
'use client';
import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Textarea } from '@/frontend/components/ui/textarea';
import { useToast } from "@/frontend/hooks/use-toast";
import { generateEmergencyCode, getActiveEmergencyCode, revokeEmergencyCode, getPatientProfile, updatePatientProfile } from '@/backend/services/mongodb';
import { encryptData, decryptData } from '@/backend/lib/crypto';
import { Loader2, UploadCloud, FileText, Trash2, KeyRound, Copy, RefreshCw, ShieldOff, Download, ShieldPlus, Eye, Search, Shield, Upload, QrCode, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Badge } from '@/frontend/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/frontend/components/ui/tooltip';
// import { grantConsent, revokeConsent } from '@/frontend/lib/blockchain';
import { v4 as uuidv4 } from 'uuid';
// import { ethers } from 'ethers';

const fileToDataUri = (file) => new Promise((resolve, reject) => {
    if (!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

// Roughly estimate data URI size in bytes
const estimateBytesFromDataUri = (dataUri) => {
    if (!dataUri || typeof dataUri !== 'string') return 0;
    const base64 = dataUri.split(',')[1] || '';
    // 4 base64 chars ~ 3 bytes
    return Math.floor((base64.length * 3) / 4);
}

const normalizeEmergencySummary = (summary = {}) => ({
    bloodGroup: summary.bloodGroup || '',
    allergies: summary.allergies || '',
    activeMedicines: summary.activeMedicines || '',
    conditions: summary.conditions || '',
    emergencyContact: summary.emergencyContact || '',
    notes: summary.notes || '',
});

const EmergencyVault = ({ activeWallet, setActiveTab }) => {
    const [profile, setProfile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [activeCode, setActiveCode] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [isSavingSummary, setIsSavingSummary] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [emergencySummary, setEmergencySummary] = useState(normalizeEmergencySummary());
    const [emergencyAccessUrl, setEmergencyAccessUrl] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    // Consent UI moved to dedicated tab
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [corruptedDocuments, setCorruptedDocuments] = useState([]);

    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!activeWallet) return;
        setIsLoading(true);
        try {
            const [profileData, codeData] = await Promise.all([
                getPatientProfile(activeWallet),
                getActiveEmergencyCode(activeWallet)
            ]);
            setProfile(profileData);
            setEmergencySummary(normalizeEmergencySummary(profileData?.emergencySummary));
            const docs = profileData?.healthDocuments || [];
            setDocuments(docs);
            setActiveCode(codeData);

            // Check for corrupted documents
            const corrupted = [];
            docs.forEach(doc => {
                try {
                    if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string' || doc.encryptedUri.trim() === '') {
                        corrupted.push({ ...doc, errorMessage: 'No encrypted data found for document' });
                    } else {
                        decryptData(doc.encryptedUri);
                    }
                } catch (error) {
                    corrupted.push({ ...doc, errorMessage: error.message });
                }
            });
            setCorruptedDocuments(corrupted);
        } catch (error) {
            console.error("Failed to fetch vault data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load your health vault.' });
        } finally {
            setIsLoading(false);
        }
    }, [activeWallet, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let isMounted = true;

        const buildQr = async () => {
            if (!activeCode?.code || typeof window === 'undefined') {
                setEmergencyAccessUrl('');
                setQrDataUrl('');
                return;
            }

            const accessUrl = `${window.location.origin}/emergency-access?code=${encodeURIComponent(activeCode.code)}`;
            setEmergencyAccessUrl(accessUrl);

            try {
                const dataUrl = await QRCode.toDataURL(accessUrl, {
                    width: 280,
                    margin: 2,
                    errorCorrectionLevel: 'M',
                });
                if (isMounted) setQrDataUrl(dataUrl);
            } catch (error) {
                console.error('Failed to generate emergency QR code:', error);
                if (isMounted) setQrDataUrl('');
            }
        };

        buildQr();

        return () => {
            isMounted = false;
        };
    }, [activeCode?.code]);

    const handleFileUpload = async (e, category, emergencyVisible) => {
        const file = e.target.files[0];
        if (!file || !category) return;

        setIsUploading(true);
        try {
            if (file.size > 5_000_000) { // 5MB limit
                throw new Error("File size should be less than 5MB.");
            }

            // Convert file to data URI
            const dataUri = await fileToDataUri(file);
            if (!dataUri || !dataUri.startsWith('data:')) {
                throw new Error("Failed to convert file to data URI");
            }

            // Encrypt the data URI
            const encryptedUri = encryptData(dataUri);
            if (!encryptedUri || typeof encryptedUri !== 'string') {
                throw new Error("Failed to encrypt file data");
            }

            // Validate encryption by trying to decrypt
            try {
                const testDecrypt = decryptData(encryptedUri);
                if (!testDecrypt) {
                    throw new Error("Encryption validation failed");
                }
            } catch (decryptError) {
                throw new Error("Encryption validation failed: " + decryptError.message);
            }

            const newDocument = {
                id: uuidv4(),
                name: file.name,
                category,
                encryptedUri,
                uploadedAt: new Date().toISOString(),
                fileSize: file.size,
                fileType: file.type,
                emergencyVisible: Boolean(emergencyVisible)
            };

            const updatedDocuments = [...documents, newDocument];
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            toast({ title: 'File Uploaded', description: `${file.name} has been securely uploaded and validated.` });
        } catch (error) {
            console.error("File upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };


    const handleRemoveDocument = async (docId) => {
        const updatedDocuments = documents.filter(doc => doc.id !== docId);
        try {
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            toast({ title: 'Document Removed', description: 'The document has been removed from your vault.' });
        } catch (error) {
            console.error("Failed to remove document:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the document.' });
        }
    };

    const handleRemoveCorruptedDocument = async (docId) => {
        try {
            // Find the document
            const doc = documents.find(d => d.id === docId);
            if (!doc) return;

            // Try to decrypt it first to confirm it's corrupted
            try {
                if (doc.encryptedUri && typeof doc.encryptedUri === 'string') {
                    decryptData(doc.encryptedUri);
                    // If we get here, it's not corrupted, so don't remove it
                    toast({ variant: 'destructive', title: 'Document Not Corrupted', description: 'This document can be decrypted successfully.' });
                    return;
                }
            } catch (decryptError) {
                // Document is indeed corrupted, proceed with removal
                console.log('Confirmed corrupted document:', doc.name, decryptError.message);
            }

            // Remove the corrupted document
            const updatedDocuments = documents.filter(doc => doc.id !== docId);
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            toast({ title: 'Corrupted Document Removed', description: `${doc.name} has been removed due to corruption.` });
        } catch (error) {
            console.error("Failed to remove corrupted document:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the corrupted document.' });
        }
    };

    const handleReuploadDocument = async (docId, newFile, category) => {
        try {
            if (newFile.size > 5_000_000) {
                toast({ variant: 'destructive', title: 'File Too Large', description: 'File size should be less than 5MB.' });
                return;
            }

            // Convert file to data URI
            const dataUri = await fileToDataUri(newFile);
            if (!dataUri || !dataUri.startsWith('data:')) {
                throw new Error("Failed to convert file to data URI");
            }

            // Encrypt the data URI
            const encryptedUri = encryptData(dataUri);
            if (!encryptedUri || typeof encryptedUri !== 'string') {
                throw new Error("Failed to encrypt file data");
            }

            // Validate encryption
            try {
                const testDecrypt = decryptData(encryptedUri);
                if (!testDecrypt) {
                    throw new Error("Encryption validation failed");
                }
            } catch (decryptError) {
                throw new Error("Encryption validation failed: " + decryptError.message);
            }

            // Update the document
            const updatedDocuments = documents.map(doc =>
                doc.id === docId
                    ? {
                        ...doc,
                        name: newFile.name,
                        encryptedUri,
                        uploadedAt: new Date().toISOString(),
                        fileSize: newFile.size,
                        fileType: newFile.type
                    }
                    : doc
            );

            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            toast({ title: 'Document Fixed', description: `${newFile.name} has been successfully re-uploaded and encrypted.` });
        } catch (error) {
            console.error("Failed to re-upload document:", error);
            toast({ variant: 'destructive', title: 'Re-upload Failed', description: error.message });
        }
    };

    const handleViewDocument = (doc) => {
        try {
            if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string') {
                throw new Error('No encrypted data found for document');
            }

            const decrypted = decryptData(doc.encryptedUri);
            if (!decrypted || !decrypted.startsWith('data:')) {
                throw new Error('Unsupported file format or decryption failed');
            }
            const win = window.open();
            if (win) {
                win.document.write(`<iframe src="${decrypted}" style="width:100%;height:100%" frameborder="0"></iframe>`);
            }
        } catch (error) {
            console.error('Preview failed:', error);
            toast({ variant: 'destructive', title: 'Preview failed', description: 'Could not preview file. The file may be corrupted.' });
        }
    };

    const handleDownloadDocument = (doc) => {
        try {
            if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string') {
                throw new Error('No encrypted data found for document');
            }

            const decrypted = decryptData(doc.encryptedUri);
            if (!decrypted) {
                throw new Error('Decryption failed');
            }

            const link = document.createElement('a');
            link.href = decrypted;
            link.download = doc.name || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            toast({ variant: 'destructive', title: 'Download failed', description: 'Could not download file. The file may be corrupted.' });
        }
    };

    const handleSaveEmergencySummary = async () => {
        setIsSavingSummary(true);
        try {
            const summary = normalizeEmergencySummary(emergencySummary);
            await updatePatientProfile(activeWallet, { ...profile, emergencySummary: summary });
            setProfile(prev => ({ ...(prev || {}), emergencySummary: summary }));
            setEmergencySummary(summary);
            toast({ title: 'Emergency Summary Saved', description: 'Critical emergency information was updated.' });
        } catch (error) {
            console.error('Failed to save emergency summary:', error);
            toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update emergency information.' });
        } finally {
            setIsSavingSummary(false);
        }
    };

    const handleBackupVault = async () => {
        try {
            const payload = {
                wallet: activeWallet,
                exportedAt: new Date().toISOString(),
                documents,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `medichain-vault-${activeWallet?.slice(0, 6)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Backup failed', description: 'Could not export your vault' });
        }
    };

    const handleRestoreFromFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            if (!json?.documents || !Array.isArray(json.documents)) throw new Error('Invalid backup file');
            const merged = [...documents, ...json.documents];
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: merged });
            setDocuments(merged);
            toast({ title: 'Vault Restored', description: 'Imported documents from backup' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Restore failed', description: error.message || 'Invalid backup file' });
        } finally {
            e.target.value = '';
        }
    };

    const handleGenerateCode = async () => {
        setIsGenerating(true);
        try {
            const codeData = await generateEmergencyCode(activeWallet);
            setActiveCode(codeData);
            toast({ title: 'Code Generated', description: `Your new emergency code is ${codeData.code}` });
        } catch (error) {
            console.error("Failed to generate code:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate a new code.' });
        } finally {
            setIsGenerating(false);
        }
    };


    const handleRevokeCode = async () => {
        if (!activeCode) return;
        setIsRevoking(true);
        try {
            await revokeEmergencyCode(activeCode.code);
            setActiveCode(null);
            toast({ title: 'Code Revoked', description: 'Your emergency access code has been revoked.' });
        } catch (error) {
            console.error("Failed to revoke code:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not revoke the code.' });
        } finally {
            setIsRevoking(false);
        }
    };

    const copyTextToClipboard = async (text) => {
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) { }
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (e) {
            return false;
        }
    };

    const copyToClipboard = async () => {
        if (activeCode) {
            const ok = await copyTextToClipboard(activeCode.code);
            if (ok) {
                toast({ title: 'Copied!', description: 'Access code copied to clipboard.' });
            } else {
                toast({ variant: 'destructive', title: 'Copy failed', description: 'Unable to copy to clipboard. Please copy manually.' });
            }
        }
    }

    const copyEmergencyLink = async () => {
        if (!emergencyAccessUrl) return;
        const ok = await copyTextToClipboard(emergencyAccessUrl);
        if (ok) {
            toast({ title: 'Link Copied', description: 'Emergency QR link copied to clipboard.' });
        } else {
            toast({ variant: 'destructive', title: 'Copy failed', description: 'Unable to copy link. Please copy manually.' });
        }
    };

    const downloadQrCard = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `medichain-emergency-qr-${activeCode?.code || 'card'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalBytes = useMemo(() => {
        try {
            return documents.reduce((sum, d) => {
                try {
                    if (!d.encryptedUri || typeof d.encryptedUri !== 'string') {
                        return sum;
                    }
                    const decrypted = decryptData(d.encryptedUri);
                    return sum + estimateBytesFromDataUri(decrypted || '');
                } catch (_) {
                    return sum;
                }
            }, 0);
        } catch (_) {
            return 0;
        }
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        const q = query.trim().toLowerCase();
        return documents.filter((d) => {
            const matchesQuery = !q || d.name?.toLowerCase().includes(q);
            const matchesCategory = categoryFilter === 'all' || (d.category || '').toLowerCase() === categoryFilter.toLowerCase();
            return matchesQuery && matchesCategory;
        });
    }, [documents, query, categoryFilter]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldPlus />Emergency Vault</CardTitle>
                        <CardDescription>Store and manage your important medical files like prescriptions, lab reports, and emergency documents.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Backup buttons removed */}

                        <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Critical Emergency Summary</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Blood Group</Label>
                                    <Input
                                        value={emergencySummary.bloodGroup}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, bloodGroup: e.target.value }))}
                                        placeholder="O+, AB-, unknown..."
                                    />
                                </div>
                                <div>
                                    <Label>Emergency Contact</Label>
                                    <Input
                                        value={emergencySummary.emergencyContact}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, emergencyContact: e.target.value }))}
                                        placeholder="Name and phone"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Allergies</Label>
                                    <Textarea
                                        value={emergencySummary.allergies}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, allergies: e.target.value }))}
                                        placeholder="Penicillin, peanuts, latex..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Active Medicines</Label>
                                    <Textarea
                                        value={emergencySummary.activeMedicines}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, activeMedicines: e.target.value }))}
                                        placeholder="Metformin 500mg, insulin..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Known Conditions</Label>
                                    <Textarea
                                        value={emergencySummary.conditions}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, conditions: e.target.value }))}
                                        placeholder="Diabetes, asthma, cardiac history..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Emergency Notes</Label>
                                    <Textarea
                                        value={emergencySummary.notes}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Implants, care instructions, preferred hospital..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <Button type="button" onClick={handleSaveEmergencySummary} disabled={isSavingSummary}>
                                {isSavingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Save Emergency Summary
                            </Button>
                        </div>

                        <UploadSection onUpload={handleFileUpload} isUploading={isUploading} />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                            <h3 className="font-semibold">Your Emergency Documents</h3>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name..." className="pl-8" />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="sm:w-48"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="Prescription">Prescription</SelectItem>
                                        <SelectItem value="Lab Report">Lab Report</SelectItem>
                                        <SelectItem value="Vaccination">Vaccination</SelectItem>
                                        <SelectItem value="Consultation Summary">Consultation Summary</SelectItem>
                                        <SelectItem value="Emergency Contact">Emergency Contact</SelectItem>
                                        <SelectItem value="Insurance Card">Insurance Card</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="border rounded-lg max-h-96 overflow-y-auto divide-y">
                            {filteredDocuments.length > 0 ? (
                                filteredDocuments.map(doc => {
                                    let sizeMb = 0;
                                    try {
                                        if (doc.encryptedUri && typeof doc.encryptedUri === 'string') {
                                            const decrypted = decryptData(doc.encryptedUri);
                                            sizeMb = estimateBytesFromDataUri(decrypted || '') / (1024 * 1024);
                                        }
                                    } catch (_) { sizeMb = 0; }
                                    return (
                                        <div key={doc.id} className="flex items-center justify-between p-3 gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate" title={doc.name}>{doc.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="secondary">{doc.category || 'Document'}</Badge>
                                                        {doc.emergencyVisible && <Badge variant="outline">Emergency</Badge>}
                                                        <span>{new Date(doc.uploadedAt).toLocaleString()}</span>
                                                        <span>• {sizeMb.toFixed(2)} MB</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <TooltipProvider>
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="outline" size="icon" onClick={() => handleViewDocument(doc)} aria-label="View">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>View</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="secondary" size="icon" onClick={() => handleDownloadDocument(doc)} aria-label="Download">
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Download</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveDocument(doc.id)} aria-label="Delete">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TooltipProvider>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-muted-foreground p-8">No emergency documents found. Upload important files like prescriptions, lab reports, or emergency contacts.</p>
                            )}
                        </div>

                        {corruptedDocuments.length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                                    <FileText className="h-4 w-4" />
                                    Corrupted Documents ({corruptedDocuments.length})
                                </h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                                    The following documents have corrupted data and cannot be accessed:
                                </p>
                                <div className="space-y-2">
                                    {corruptedDocuments.map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-red-600" />
                                                <div>
                                                    <p className="font-medium text-sm text-red-800 dark:text-red-200">{doc.name}</p>
                                                    <p className="text-xs text-red-600">{doc.errorMessage}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Create a file input to re-upload the document
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
                                                        input.onchange = (e) => {
                                                            if (e.target.files[0]) {
                                                                handleReuploadDocument(doc.id, e.target.files[0], doc.category);
                                                            }
                                                        };
                                                        input.click();
                                                    }}
                                                >
                                                    <Upload className="h-4 w-4 mr-1" />
                                                    Re-upload
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRemoveCorruptedDocument(doc.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card className="sticky top-20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound />Emergency Access Code</CardTitle>
                        <CardDescription>Generate a secure code for emergency access to your medical documents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeCode ? (
                            <div className="space-y-4">
                                <div>
                                    <Label>Your Emergency Code</Label>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value={activeCode.code} className="font-mono text-lg tracking-widest bg-muted" />
                                        <Button variant="outline" size="icon" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <QrCode className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-semibold text-sm">Emergency QR Card</p>
                                            <p className="text-xs text-muted-foreground">Scan to open the critical medical summary.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center rounded-md bg-white p-3">
                                        {qrDataUrl ? (
                                            <img src={qrDataUrl} alt="Emergency access QR code" className="h-48 w-48" />
                                        ) : (
                                            <div className="flex h-48 w-48 items-center justify-center text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <Input readOnly value={emergencyAccessUrl} className="text-xs" />
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button type="button" variant="outline" onClick={copyEmergencyLink}>
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Copy QR Link
                                        </Button>
                                        <Button type="button" variant="outline" onClick={downloadQrCard} disabled={!qrDataUrl}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download QR
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => window.open(emergencyAccessUrl, '_blank')} disabled={!emergencyAccessUrl}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Test Access Page
                                        </Button>
                                    </div>
                                </div>
                                <Button className="w-full" variant="destructive" onClick={handleRevokeCode} disabled={isRevoking}>
                                    {isRevoking ? <Loader2 className="mr-2 animate-spin" /> : <ShieldOff className="mr-2" />}
                                    Revoke Access Code
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button className="w-full" onClick={handleGenerateCode} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCw className="mr-2" />}
                                    Generate Emergency Code
                                </Button>
                                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        <strong>Why create an emergency code?</strong><br />
                                        Allows trusted people to access your critical medical documents during emergencies when you cannot provide access yourself.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const VaultToolbar = () => null;

const UploadSection = ({ onUpload, isUploading }) => {
    const [category, setCategory] = useState('');
    const [emergencyVisible, setEmergencyVisible] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files[0] && category) {
            onUpload(e, category, emergencyVisible);
        }
    };

    const handleCategoryChange = (value) => {
        setCategory(value);
        setEmergencyVisible(['Medical ID', 'Allergy List', 'Emergency Contact', 'Prescription', 'Vaccination'].includes(value));
    };

    return (
        <div className="p-4 border border-dashed rounded-lg space-y-4">
            <h3 className="font-semibold">Upload New Document</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Document Category</Label>
                    <Select value={category} onValueChange={handleCategoryChange}>
                        <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Prescription">🧾 Prescription</SelectItem>
                            <SelectItem value="Lab Report">🧪 Lab Report</SelectItem>
                            <SelectItem value="Vaccination">💉 Vaccination</SelectItem>
                            <SelectItem value="Consultation Summary">📄 Consultation Summary</SelectItem>
                            <SelectItem value="Emergency Contact">🚨 Emergency Contact</SelectItem>
                            <SelectItem value="Insurance Card">💳 Insurance Card</SelectItem>
                            <SelectItem value="Medical ID">🆔 Medical ID</SelectItem>
                            <SelectItem value="Allergy List">⚠️ Allergy List</SelectItem>
                            <SelectItem value="Other">📄 Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>File</Label>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading || !category}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || !category}
                    >
                        {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
                        Select File
                    </Button>
                </div>
            </div>
            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={emergencyVisible}
                    onChange={(e) => setEmergencyVisible(e.target.checked)}
                    className="mt-1"
                />
                <span>Expose this document through emergency code access</span>
            </label>
        </div>
    )
}


export default EmergencyVault;
