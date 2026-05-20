
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Badge } from '@/frontend/components/ui/badge';
import { Label } from '@/frontend/components/ui/label';
import { Textarea } from '@/frontend/components/ui/textarea';
import {
    FileText, Loader2, Send, Clock, CheckCircle, XCircle, Eye,
    RefreshCw, Search, Filter, ArrowLeft, ShieldCheck, Brain
} from 'lucide-react';
import { useToast } from "@/frontend/hooks/use-toast";
import { getAccessRequestsByDoctor, createAccessRequest, getPatientProfile, addAuditLog } from '@/backend/services/mongodb';
import { summarizeMedicalRecord } from '@/backend/ai/flows/summarize-medical-record';
import { canDoctorAccessRecord } from '@/frontend/lib/blockchain';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/frontend/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';

const SharedDocuments = ({ activeWallet }) => {
    const { toast } = useToast();
    const [patientWallet, setPatientWallet] = useState('');
    const [accessReason, setAccessReason] = useState('');
    const [requestedDurationHours, setRequestedDurationHours] = useState(24);
    const [isRequesting, setIsRequesting] = useState(false);
    const [accessRequests, setAccessRequests] = useState([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [patientNames, setPatientNames] = useState({});
    const [expiredRequests, setExpiredRequests] = useState(new Set());

    // Vault View State
    const [selectedPatient, setSelectedPatient] = useState(null); // { id, name, requestId }
    const [sharedDocs, setSharedDocs] = useState([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [activeGrant, setActiveGrant] = useState(null); // The specific permission object
    const [summaries, setSummaries] = useState({});
    const [summarizingDocId, setSummarizingDocId] = useState(null);

    // Load doctor's access requests on component mount
    const loadRequests = useCallback(async () => {
        if (!activeWallet) return;
        setIsLoadingRequests(true);
        try {
            const requests = await getAccessRequestsByDoctor(activeWallet);
            setAccessRequests(requests || []);

            // Fetch patient names for all unique patient IDs
            const uniquePatientIds = [...new Set((requests || []).map(req => req.patientId))];
            const namesMap = {};

            for (const patientId of uniquePatientIds) {
                try {
                    const profile = await getPatientProfile(patientId);
                    namesMap[patientId] = profile?.name || 'Unknown Patient';
                } catch (error) {
                    console.error(`Error fetching patient profile for ${patientId}:`, error);
                    namesMap[patientId] = 'Unknown Patient';
                }
            }

            setPatientNames(namesMap);
        } catch (error) {
            console.error('Error loading access requests:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load access requests.'
            });
        } finally {
            setIsLoadingRequests(false);
        }
    }, [activeWallet, toast]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const checkRequestExpiration = async (request) => {
        if (request.status !== 'approved') return false;

        try {
            const profile = await getPatientProfile(request.patientId);
            if (!profile) return false;

            const consents = Array.isArray(profile?.consents) ? profile.consents : [];
            const now = Date.now();
            const granted = consents.find(c =>
                c.address?.toLowerCase() === (activeWallet || '').toLowerCase() &&
                c.requestId === request.id
            );

            if (!granted || !granted.expiresAt) return false;

            return granted.expiresAt <= now;
        } catch (error) {
            console.error('Error checking expiration:', error);
            return false;
        }
    };

    // Check expiration for all approved requests
    useEffect(() => {
        const checkAllExpirations = async () => {
            const expiredSet = new Set();
            for (const request of accessRequests) {
                if (request.status === 'approved') {
                    const isExpired = await checkRequestExpiration(request);
                    if (isExpired) {
                        expiredSet.add(request.id);
                    }
                }
            }
            setExpiredRequests(expiredSet);
        };

        if (accessRequests.length > 0) {
            checkAllExpirations();
        }
    }, [accessRequests, activeWallet]);

    const handleRequestAccess = async () => {
        if (!patientWallet.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a patient wallet address.' });
            return;
        }
        if (!accessReason.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter why you need access.' });
            return;
        }
        if (!activeWallet) {
            toast({ variant: 'destructive', title: 'Error', description: 'Wallet not connected.' });
            return;
        }

        setIsRequesting(true);
        try {
            const request = await createAccessRequest({
                doctorId: activeWallet,
                patientId: patientWallet.trim(),
                documentIds: [],
                durationHours: requestedDurationHours,
                reason: accessReason.trim()
            });
            setAccessRequests(prev => [request, ...prev]);
            setPatientWallet('');
            setAccessReason('');
            setRequestedDurationHours(24);
            toast({ title: 'Request Sent', description: 'Access request sent to patient. Waiting for approval...' });
        } catch (error) {
            console.error('Error creating access request:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send access request.' });
        } finally {
            setIsRequesting(false);
        }
    };

    // --- Vault View Logic ---

    const openPatientVault = async (patientId, requestId) => {
        setIsLoadingDocs(true);
        setSelectedPatient({
            id: patientId,
            name: patientNames[patientId],
            requestId
        });
        setSharedDocs([]);
        setActiveGrant(null);

        try {
            const profile = await getPatientProfile(patientId);
            if (!profile) throw new Error('Patient profile not found');

            const consents = Array.isArray(profile?.consents) ? profile.consents : [];
            const now = Date.now();

            // Find specific permission
            const granted = consents.find(c =>
                c.address?.toLowerCase() === (activeWallet || '').toLowerCase() &&
                c.requestId === requestId &&
                c.documentIds && c.documentIds.length > 0
            );

            if (!granted) {
                throw new Error('Access permissions not found or revoked.');
            }

            if (granted.expiresAt && granted.expiresAt <= now) {
                throw new Error('Access has expired.');
            }

            setActiveGrant(granted);

            const allowedIds = new Set(Array.isArray(granted?.documentIds) ? granted.documentIds : []);
            const allDocs = Array.isArray(profile?.consentDocuments) ? profile.consentDocuments : [];
            const shared = allDocs.filter(d => allowedIds.has(d.id));

            // Validate blockchain access interactively for better UI
            // For now, load them all, we will validate on view
            setSharedDocs(shared);

        } catch (error) {
            console.error('Error opening vault:', error);
            toast({
                variant: 'destructive',
                title: 'Access Error',
                description: error.message
            });
            setSelectedPatient(null); // Go back to list
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const handleBackToList = () => {
        setSelectedPatient(null);
        setSharedDocs([]);
        setSearchQuery('');
        setCategoryFilter('all');
        setSummaries({});
    };

    const filteredDocs = useMemo(() => {
        return sharedDocs.filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || doc.category.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [sharedDocs, searchQuery, categoryFilter]);

    const extractTextFromDataUri = (dataUri = '') => {
        try {
            if (!dataUri.startsWith('data:text')) return '';
            const [, payload = ''] = dataUri.split(',');
            const binary = atob(payload);
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            return new TextDecoder().decode(bytes).slice(0, 12000);
        } catch {
            return '';
        }
    };

    const handleSummarizeRecord = async (event, doc) => {
        event.stopPropagation();
        setSummarizingDocId(doc.id);
        try {
            const result = await summarizeMedicalRecord({
                recordName: doc.name || 'Medical record',
                category: doc.category || 'Record',
                recordDate: doc.metadata?.recordDate || doc.uploadedAt,
                notes: doc.metadata?.notes || '',
                text: extractTextFromDataUri(doc.dataUri || ''),
            });
            setSummaries(prev => ({ ...prev, [doc.id]: result }));
            toast({ title: 'Summary Ready', description: 'AI notes were generated for this record.' });
        } catch (error) {
            console.error('Medical record summary failed:', error);
            toast({ variant: 'destructive', title: 'Summary Failed', description: error.message || 'Could not summarize this record.' });
        } finally {
            setSummarizingDocId(null);
        }
    };

    // Secure Viewer Logic (Single File)
    const openSecureDocument = async (doc) => {
        try {
            // Blockchain Verification
            if (doc.blockchainRecordId) {
                const hasAccess = await canDoctorAccessRecord(doc.blockchainRecordId, activeWallet, selectedPatient.id);
                if (!hasAccess) {
                    toast({
                        variant: 'destructive',
                        title: 'Blockchain Verification Failed',
                        description: 'You do not have on-chain permission to view this specific document.'
                    });
                    return;
                }
            }

            if (!doc.dataUri) {
                await addAuditLog({
                    actor: activeWallet,
                    subject: selectedPatient.id,
                    action: 'record.view',
                    details: {
                        doctorId: activeWallet,
                        requestId: selectedPatient.requestId,
                        documentId: doc.id,
                        documentName: doc.name,
                        reason: activeGrant?.reason || 'Clinical review',
                        metadataOnly: true
                    }
                });

                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.write(`
                        <html>
                            <head>
                                <title>${escapeHtml(doc.name)} - Metadata</title>
                                <style>
                                    body { margin: 0; padding: 32px; font-family: sans-serif; background: #f8fafc; color: #0f172a; }
                                    main { max-width: 720px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }
                                    dl { display: grid; grid-template-columns: 160px 1fr; gap: 12px; }
                                    dt { color: #64748b; font-weight: 600; }
                                    dd { margin: 0; }
                                </style>
                            </head>
                            <body>
                                <main>
                                    <h1>${escapeHtml(doc.name)}</h1>
                                    <dl>
                                        <dt>Category</dt><dd>${escapeHtml(doc.category || 'Record')}</dd>
                                        <dt>Record date</dt><dd>${escapeHtml(doc.metadata?.recordDate || 'Not specified')}</dd>
                                        <dt>Notes</dt><dd>${escapeHtml(doc.metadata?.notes || 'No notes added')}</dd>
                                        <dt>Access reason</dt><dd>${escapeHtml(activeGrant?.reason || 'Clinical review')}</dd>
                                    </dl>
                                </main>
                            </body>
                        </html>
                    `);
                    newWindow.document.close();
                }
                return;
            }

            // Generate Secure Viewer HTML
            let dataUrl = doc.dataUri;
            if (doc.name.toLowerCase().endsWith('.pdf') && !dataUrl.startsWith('data:application/pdf')) {
                dataUrl = `data:application/pdf;base64,${doc.dataUri.split(',')[1] || doc.dataUri}`;
            } else if (doc.name.toLowerCase().match(/\.(jpg|jpeg|png)$/) && !dataUrl.startsWith('data:image')) {
                // simple fix for types
                const ext = doc.name.split('.').pop().toLowerCase();
                dataUrl = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${doc.dataUri.split(',')[1] || doc.dataUri}`;
            }

            const newWindow = window.open('', '_blank');
            if (newWindow) {
                const expiryTime = activeGrant ? activeGrant.expiresAt : Date.now() + 3600000;
                await addAuditLog({
                    actor: activeWallet,
                    subject: selectedPatient.id,
                    action: 'record.view',
                    details: {
                        doctorId: activeWallet,
                        requestId: selectedPatient.requestId,
                        documentId: doc.id,
                        documentName: doc.name,
                        reason: activeGrant?.reason || 'Clinical review'
                    }
                });

                // Write secure viewer HTML
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>${escapeHtml(doc.name)} - Secure View</title>
                            <style>
                                body { margin: 0; padding: 0; font-family: sans-serif; background: #1a1a1a; color: white; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
                                .header { background: #0f172a; padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
                                .expiry-banner { background: #b91c1c; color: white; text-align: center; padding: 5px; font-size: 0.8rem; }
                                .content { flex: 1; display: flex; justify-content: center; align-items: center; background: #333; overflow: auto; position: relative; }
                                iframe, img { max-width: 100%; max-height: 100%; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
                                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 8rem; color: rgba(255,255,255,0.05); pointer-events: none; white-space: nowrap; z-index: 10; }
                            </style>
                            <script>
                                document.addEventListener('contextmenu', e => e.preventDefault());
                                document.addEventListener('keydown', e => {
                                    if(e.key === 'PrintScreen' || (e.ctrlKey && (e.key === 'p' || e.key === 's'))) {
                                        e.preventDefault();
                                        alert('Screen capture and printing are disabled for this sensitive document.');
                                    }
                                });
                                
                                setInterval(() => {
                                    const now = Date.now();
                                    const left = ${expiryTime} - now;
                                    if(left <= 0) {
                                        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;background:#000;color:red;font-size:2rem;">SESSION EXPIRED</div>';
                                    } else {
                                        const mins = Math.floor(left / 60000);
                                        const secs = Math.floor((left % 60000) / 1000);
                                        document.getElementById('timer').innerText = \`Session expires in: \${mins}m \${secs}s\`;
                                    }
                                }, 1000);
                            </script>
                        </head>
                        <body>
                             <div class="expiry-banner" id="timer">Calculating session time...</div>
                            <div class="header">
                                <div>
                                    <strong>${escapeHtml(doc.name)}</strong>
                                    <span style="opacity:0.7; font-size:0.8rem; margin-left:10px;">${escapeHtml(doc.category)}</span>
                                </div>
                                <div style="background:#2563eb; padding:4px 8px; border-radius:4px; font-size:0.75rem;">SECURE MODE</div>
                            </div>
                            <div class="content">
                                <div class="watermark">CONFIDENTIAL</div>
                                ${doc.name.toLowerCase().endsWith('.pdf')
                        ? `<iframe src="${dataUrl}#toolbar=0" style="width:100%;height:100%;border:none;"></iframe>`
                        : `<img src="${dataUrl}" alt="${escapeHtml(doc.name)}" />`
                    }
                            </div>
                        </body>
                    </html>
                `);
                newWindow.document.close();
            } else {
                toast({ variant: 'destructive', title: 'Popup Blocked', description: 'Please allow popups to view the document.' });
            }

        } catch (error) {
            console.error('Error viewing document:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to open document.' });
        }
    };


    // --- Utils ---
    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'denied': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'revoked': return <XCircle className="h-4 w-4 text-orange-500" />;
            default: return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'approved': return 'secondary';
            case 'denied': return 'destructive';
            case 'revoked': return 'outline';
            default: return 'default';
        }
    };

    const formatWalletAddress = (address) => activeWallet && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown';
    const formatDuration = (hours) => Number(hours) === 168 ? '7 days' : `${Number(hours) || 24} hours`;
    const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));


    // --- RENDER ---

    if (selectedPatient) {
        // Vault View
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBackToList}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedPatient.name}'s Medical Vault</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span>Secure Access Granted</span>
                            <span>•</span>
                            <span>Expires: {activeGrant?.expiresAt ? new Date(activeGrant.expiresAt).toLocaleTimeString() : 'Unknown'}</span>
                        </div>
                        {activeGrant?.reason && (
                            <p className="text-sm text-muted-foreground mt-1">Reason: {activeGrant.reason}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="prescription">Prescription</SelectItem>
                            <SelectItem value="lab-report">Lab Report</SelectItem>
                            <SelectItem value="x-ray">X-Ray</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isLoadingDocs ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredDocs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-lg font-medium">No documents found</h3>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocs.map((doc) => (
                            <Card key={doc.id} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => openSecureDocument(doc)}>
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                        <FileText className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate" title={doc.name}>{doc.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 mb-2 capitalize">{doc.category}</p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                            <span>{doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : 'Metadata'}</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 w-full"
                                            onClick={(event) => handleSummarizeRecord(event, doc)}
                                            disabled={summarizingDocId === doc.id}
                                        >
                                            {summarizingDocId === doc.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                                            Summarize
                                        </Button>
                                        {summaries[doc.id] && (
                                            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs space-y-2">
                                                <p className="font-medium text-foreground">Doctor Notes</p>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{summaries[doc.id].summary}</p>
                                                {summaries[doc.id].keyFindings?.length > 0 && (
                                                    <p className="text-muted-foreground">
                                                        <span className="font-medium text-foreground">Key:</span> {summaries[doc.id].keyFindings.join('; ')}
                                                    </p>
                                                )}
                                                {summaries[doc.id].followUps?.length > 0 && (
                                                    <p className="text-muted-foreground">
                                                        <span className="font-medium text-foreground">Follow-up:</span> {summaries[doc.id].followUps.join('; ')}
                                                    </p>
                                                )}
                                                {summaries[doc.id].cautions?.length > 0 && (
                                                    <p className="text-muted-foreground">
                                                        <span className="font-medium text-foreground">Caution:</span> {summaries[doc.id].cautions.join('; ')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Default List View
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2">Shared Patient Records</h1>
                <p className="text-muted-foreground text-lg">
                    Manage your access to patient medical records. Request new access or view authorized documents.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Access Requests / Patients */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Active Patient Access
                                </CardTitle>
                                <CardDescription>
                                    Patients who have granted you access to their records
                                </CardDescription>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={loadRequests} disabled={isLoadingRequests}>
                                            <RefreshCw className={`h-4 w-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Refresh Requests</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardHeader>
                        <CardContent>
                            {isLoadingRequests ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="ml-2 text-muted-foreground">Loading...</span>
                                </div>
                            ) : accessRequests.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                    <h3 className="text-lg font-medium text-muted-foreground">No records found</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Request access to a patient to get started.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {accessRequests.map((request) => (
                                        <Card key={request.id} className="hover:shadow-md transition-shadow bg-card/50">
                                            <CardContent className="p-4">
                                                <div className="space-y-3">
                                                    {/* Header with status */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(request.status)}
                                                            <Badge variant={getStatusBadgeVariant(request.status)} className="text-xs">
                                                                {request.status}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(request.requestDate).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    {/* Patient info */}
                                                    <div className="space-y-1">
                                                        <h3 className="font-semibold text-base">
                                                            {patientNames[request.patientId] || 'Loading...'}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground font-mono truncate" title={request.patientId}>
                                                            {formatWalletAddress(request.patientId)}
                                                        </p>
                                                        {request.reason && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                Reason: {request.reason}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">
                                                            Requested duration: {formatDuration(request.durationHours)}
                                                        </p>
                                                    </div>

                                                    {/* Action button */}
                                                    {request.status === 'approved' && !expiredRequests.has(request.id) && (
                                                        <Button
                                                            onClick={() => openPatientVault(request.patientId, request.id)}
                                                            className="w-full gap-2 mt-2"
                                                            size="sm"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View Vault
                                                        </Button>
                                                    )}

                                                    {/* Expired state */}
                                                    {request.status === 'approved' && expiredRequests.has(request.id) && (
                                                        <div className="w-full text-center py-2 px-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md text-sm font-medium mt-2">
                                                            Expired
                                                        </div>
                                                    )}

                                                    {/* Status-specific messages */}
                                                    {request.status === 'pending' && (
                                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 rounded mt-2">
                                                            Awaiting approval
                                                        </div>
                                                    )}
                                                    {request.status === 'denied' && (
                                                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded mt-2">
                                                            Denied
                                                        </div>
                                                    )}
                                                    {request.status === 'revoked' && (
                                                        <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded mt-2">
                                                            Revoked by patient
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Request Access */}
                <div>
                    <Card className="sticky top-6 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Send className="h-5 w-5 text-primary" />
                                Request Access
                            </CardTitle>
                            <CardDescription>
                                Send a new request to view medical documents
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>
                                    Patient Wallet Address
                                </Label>
                                <Input
                                    placeholder="0x..."
                                    value={patientWallet}
                                    onChange={(e) => setPatientWallet(e.target.value)}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ask the patient for their connected wallet address.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Why do you need access?</Label>
                                <Textarea
                                    value={accessReason}
                                    onChange={(e) => setAccessReason(e.target.value)}
                                    placeholder="Clinical review, follow-up appointment, medication reconciliation..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Requested Duration</Label>
                                <Select
                                    value={String(requestedDurationHours)}
                                    onValueChange={(value) => setRequestedDurationHours(Number(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24">24 hours</SelectItem>
                                        <SelectItem value="168">7 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleRequestAccess}
                                disabled={!patientWallet.trim() || !accessReason.trim() || isRequesting}
                                className="w-full"
                            >
                                {isRequesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Send Request
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SharedDocuments;
