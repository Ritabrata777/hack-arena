

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Label } from '@/frontend/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Upload, FileText, ShieldCheck, Check, X, Eye, Download, Clock, CheckCircle, XCircle, History, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';
import { getPatientProfile, updatePatientProfile, getAccessRequestsByPatient, updateAccessRequestStatus, addAuditLog, getAuditLogsForPatient } from '@/backend/services/mongodb';
import {
    uploadHealthRecord,
    approveDoctorForRecord,
    revokeDoctorForRecord,
    canDoctorAccessRecord,
    createHash
} from '@/frontend/lib/blockchain';
import { v4 as uuidv4 } from 'uuid';

const ConsentManager = ({ activeWallet }) => {
    const { toast } = useToast();
    const [documents, setDocuments] = useState([]);
    const [accessRequests, setAccessRequests] = useState([]);
    const [activePermissions, setActivePermissions] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [documentCategory, setDocumentCategory] = useState('');
    const [selectedDocumentsForApproval, setSelectedDocumentsForApproval] = useState([]);
    const [approvalDuration, setApprovalDuration] = useState(24);
    const [currentApprovalRequest, setCurrentApprovalRequest] = useState(null);

    // Load all data on component mount
    useEffect(() => {
        const loadAllData = async () => {
            if (!activeWallet) return;

            try {
                // Load patient profile and documents
                const profile = await getPatientProfile(activeWallet);
                setDocuments(profile?.consentDocuments || []);

                // Filter out expired permissions
                const now = Date.now();
                const validPermissions = (profile?.consents || []).filter(p =>
                    !p.expiresAt || p.expiresAt > now
                );
                setActivePermissions(validPermissions);

                // Update profile with cleaned permissions if needed
                if (validPermissions.length !== (profile?.consents || []).length) {
                    await updatePatientProfile(activeWallet, {
                        ...profile,
                        consents: validPermissions
                    });
                }

                // Load access requests
                const requests = await getAccessRequestsByPatient(activeWallet);
                const serializedRequests = (requests || []).map(req => ({
                    id: req.id,
                    doctorId: req.doctorId,
                    patientId: req.patientId,
                    documentIds: req.documentIds || [],
                    durationHours: req.durationHours,
                    status: req.status,
                    requestDate: req.requestDate
                }));
                setAccessRequests(serializedRequests);

                // Load audit logs
                const logs = await getAuditLogsForPatient(activeWallet);
                setAuditLogs(logs || []);
            } catch (error) {
                console.error('Error loading data:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load data.'
                });
            }
        };

        loadAllData();
    }, [activeWallet, toast]);

    const handleFileUpload = async () => {
        if (!selectedFile || !documentCategory) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a file and category.'
            });
            return;
        }

        setIsUploading(true);
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUri = e.target.result;

                // Create a hash for the file content (simulating IPFS hash)
                const fileHash = await createHash(dataUri);

                const newDocument = {
                    id: uuidv4(),
                    name: selectedFile.name,
                    category: documentCategory,
                    dataUri: dataUri,
                    ipfsHash: fileHash, // Store the hash for blockchain
                    uploadedAt: new Date().toISOString(),
                    size: selectedFile.size,
                    type: selectedFile.type
                };

                // Upload to blockchain first
                try {
                    const blockchainResult = await uploadHealthRecord(fileHash);
                    newDocument.blockchainRecordId = blockchainResult.recordId;
                    newDocument.txHash = blockchainResult.txHash;

                    toast({
                        title: 'Blockchain Success',
                        description: `Record uploaded to blockchain. TX: ${blockchainResult.txHash.slice(0, 10)}...`
                    });
                } catch (blockchainError) {
                    console.warn('Blockchain upload failed, continuing with local storage:', blockchainError);
                    toast({
                        variant: 'destructive',
                        title: 'Blockchain Warning',
                        description: 'Failed to upload to blockchain, but saved locally.'
                    });
                }

                // Update patient profile
                const profile = await getPatientProfile(activeWallet);
                const updatedDocuments = [...(profile?.consentDocuments || []), newDocument];
                await updatePatientProfile(activeWallet, {
                    ...profile,
                    consentDocuments: updatedDocuments
                });

                setDocuments(updatedDocuments);
                setSelectedFile(null);
                setDocumentCategory('');

                // Add audit log
                await addAuditLog({
                    actor: activeWallet,
                    subject: activeWallet,
                    action: 'record.upload',
                    details: {
                        documentId: newDocument.id,
                        fileName: newDocument.name,
                        blockchainRecordId: newDocument.blockchainRecordId,
                        txHash: newDocument.txHash
                    }
                });

                toast({
                    title: 'Success',
                    description: 'Document uploaded successfully.'
                });
            };
            reader.readAsDataURL(selectedFile);
        } catch (error) {
            console.error('Error uploading file:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to upload document.'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleApproveRequest = async (requestId) => {
        if (selectedDocumentsForApproval.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select at least one document to share.'
            });
            return;
        }

        try {
            const request = accessRequests.find(req => req.id === requestId);
            if (!request) return;

            const blockchainResults = [];
            for (const documentId of selectedDocumentsForApproval) {
                const document = documents.find(doc => doc.id === documentId);
                if (document && document.blockchainRecordId) {
                    try {
                        const result = await approveDoctorForRecord(
                            document.blockchainRecordId,
                            request.doctorId
                        );
                        blockchainResults.push({
                            documentId,
                            txHash: result.txHash,
                            success: true,
                            timestamp: result.timestamp
                        });
                    } catch (blockchainError) {
                        console.warn(`Blockchain approval failed for document ${documentId}:`, blockchainError);
                        blockchainResults.push({
                            documentId,
                            success: false,
                            error: blockchainError.message
                        });
                    }
                }
            }

            await updateAccessRequestStatus(requestId, 'approved');
            setAccessRequests(prev =>
                prev.map(req => req.id === requestId ? { ...req, status: 'approved' } : req)
            );

            const profile = await getPatientProfile(activeWallet);

            const existingPermissions = profile?.consents || [];
            const filteredPermissions = existingPermissions.filter(p =>
                p.address?.toLowerCase() !== request.doctorId.toLowerCase()
            );

            const newPermission = {
                address: request.doctorId,
                scope: 'read-records',
                grantedAt: Date.now(),
                expiresAt: Date.now() + (approvalDuration * 60 * 60 * 1000),
                documentIds: selectedDocumentsForApproval,
                blockchainResults: blockchainResults,
                requestId: requestId
            };

            const updatedPermissions = [...filteredPermissions, newPermission];
            await updatePatientProfile(activeWallet, {
                ...profile,
                consents: updatedPermissions
            });
            setActivePermissions(updatedPermissions);

            const auditDetails = {
                requestId,
                doctorId: request?.doctorId,
                documentIds: selectedDocumentsForApproval,
                durationHours: approvalDuration,
                transactions: blockchainResults.map(result => ({
                    documentId: result.documentId,
                    txHash: result.txHash,
                    status: result.success ? 'success' : 'failed',
                    timestamp: result.timestamp ? new Date(result.timestamp * 1000).toISOString() : new Date().toISOString()
                }))
            };

            await addAuditLog({
                actor: activeWallet,
                subject: activeWallet,
                action: 'access.approve',
                details: auditDetails,
                timestamp: new Date().toISOString()
            });

            const updatedLogs = await getAuditLogsForPatient(activeWallet);
            setAuditLogs(updatedLogs || []);

            setSelectedDocumentsForApproval([]);
            setApprovalDuration(24);
            setCurrentApprovalRequest(null);

            const successCount = blockchainResults.filter(r => r.success).length;
            const totalCount = blockchainResults.length;

            toast({
                title: 'Approved',
                description: `Access granted for ${selectedDocumentsForApproval.length} document(s) for ${approvalDuration} hours. ${successCount}/${totalCount} documents approved on blockchain.`
            });
        } catch (error) {
            console.error('Error approving request:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to approve request.'
            });
        }
    };

    const handleDenyRequest = async (requestId) => {
        try {
            await updateAccessRequestStatus(requestId, 'denied');
            setAccessRequests(prev =>
                prev.map(req => req.id === requestId ? { ...req, status: 'denied' } : req)
            );

            await addAuditLog({
                actor: activeWallet,
                subject: activeWallet,
                action: 'access.deny',
                details: { requestId }
            });

            toast({ title: 'Denied', description: 'Access request denied.' });
        } catch (error) {
            console.error('Error denying request:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to deny request.'
            });
        }
    };

    const handleRevokePermission = async (permissionIndex) => {
        try {
            const permission = activePermissions[permissionIndex];
            if (!permission) return;

            const blockchainResults = [];
            for (const documentId of permission.documentIds) {
                const document = documents.find(doc => doc.id === documentId);
                if (document && document.blockchainRecordId) {
                    try {
                        const result = await revokeDoctorForRecord(
                            document.blockchainRecordId,
                            permission.address
                        );
                        blockchainResults.push({
                            documentId,
                            txHash: result.txHash,
                            success: true,
                            timestamp: result.timestamp
                        });
                    } catch (blockchainError) {
                        console.warn(`Blockchain revocation failed for document ${documentId}:`, blockchainError);
                        blockchainResults.push({
                            documentId,
                            success: false,
                            error: blockchainError.message
                        });
                    }
                }
            }

            const profile = await getPatientProfile(activeWallet);
            const updatedPermissions = profile?.consents?.filter((_, index) => index !== permissionIndex) || [];

            await updatePatientProfile(activeWallet, {
                ...profile,
                consents: updatedPermissions
            });
            setActivePermissions(updatedPermissions);

            const auditDetails = {
                doctorId: permission.address,
                documentIds: permission.documentIds,
                transactions: blockchainResults.map(result => ({
                    documentId: result.documentId,
                    txHash: result.txHash,
                    status: result.success ? 'success' : 'failed',
                    timestamp: result.timestamp ? new Date(result.timestamp * 1000).toISOString() : new Date().toISOString()
                }))
            };

            await addAuditLog({
                actor: activeWallet,
                subject: permission.address,
                action: 'consent.revoked',
                details: auditDetails,
                timestamp: new Date().toISOString()
            });

            const updatedLogs = await getAuditLogsForPatient(activeWallet);
            setAuditLogs(updatedLogs || []);

            const successCount = blockchainResults.filter(r => r.success).length;
            const totalCount = blockchainResults.length;

            toast({
                title: 'Revoked',
                description: `Access revoked successfully. ${successCount}/${totalCount} documents revoked on blockchain.`
            });
        } catch (error) {
            console.error('Error revoking permission:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to revoke permission.'
            });
        }
    };

    const handleDeleteDocument = async (documentId) => {
        try {
            const profile = await getPatientProfile(activeWallet);
            const updatedDocuments = (profile?.consentDocuments || []).filter(doc => doc.id !== documentId);

            await updatePatientProfile(activeWallet, {
                ...profile,
                consentDocuments: updatedDocuments
            });

            setDocuments(updatedDocuments);

            await addAuditLog({
                actor: activeWallet,
                subject: activeWallet,
                action: 'record.delete',
                details: { documentId }
            });

            toast({ title: 'Deleted', description: 'Document deleted successfully.' });
        } catch (error) {
            console.error('Error deleting document:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete document.'
            });
        }
    };

    const formatWalletAddress = (address) => {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const toggleDocumentSelection = (documentId) => {
        setSelectedDocumentsForApproval(prev =>
            prev.includes(documentId)
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    const startApprovalProcess = (request) => {
        setCurrentApprovalRequest(request);
        setSelectedDocumentsForApproval([]);
        setApprovalDuration(24);
    };

    const cancelApprovalProcess = () => {
        setCurrentApprovalRequest(null);
        setSelectedDocumentsForApproval([]);
        setApprovalDuration(24);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'denied':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'pending':
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2">Welcome to your MediVault</h1>
                <p className="text-muted-foreground text-lg">
                    Here you can manage your medical records, control access permissions, and view your audit log.
                    Your health data is now securely in your hands.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Medical Records</CardTitle>
                            <CardDescription>
                                View, upload, and manage your health documents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Select File</Label>
                                        <Input
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.pdf"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                        />
                                    </div>
                                    <div>
                                        <Label>Category</Label>
                                        <Select value={documentCategory} onValueChange={setDocumentCategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="prescription">Prescription</SelectItem>
                                                <SelectItem value="lab-report">Lab Report</SelectItem>
                                                <SelectItem value="x-ray">X-Ray</SelectItem>
                                                <SelectItem value="mri">MRI</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleFileUpload}
                                    disabled={!selectedFile || !documentCategory || isUploading}
                                    className="w-full"
                                >
                                    {isUploading ? (
                                        <Clock className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Upload Record
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {documents.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No records found. Upload one to get started.</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-64">
                                        <div className="space-y-2">
                                            {documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        <div>
                                                            <p className="font-medium text-sm">{doc.name}</p>
                                                            <p className="text-sm text-muted-foreground">{doc.category} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (doc.dataUri) {
                                                                    if (doc.name.toLowerCase().endsWith('.pdf')) {
                                                                        window.open(doc.dataUri, '_blank');
                                                                    } else {
                                                                        const newWindow = window.open('', '_blank');
                                                                        newWindow.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0; text-align:center; background:#f5f5f5;"><img src="${doc.dataUri}" style="max-width:100%; max-height:90vh;" alt="${doc.name}" /></body></html>`);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (doc.dataUri) {
                                                                    const link = document.createElement('a');
                                                                    link.href = doc.dataUri;
                                                                    link.download = doc.name;
                                                                    link.click();
                                                                }
                                                            }}
                                                        >
                                                            <Download className="h-3 w-3 mr-1" />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDeleteDocument(doc.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Requests</CardTitle>
                            <CardDescription>
                                Approve or deny access to your records.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {accessRequests.filter(req => req.status === 'pending' || req.status === 'denied').length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No pending requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {accessRequests.filter(req => req.status === 'pending' || req.status === 'denied').map((request) => (
                                        <div key={request.id} className="p-4 bg-muted/30 rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(request.status)}
                                                    <span className="text-sm font-medium">
                                                        Dr. {formatWalletAddress(request.doctorId)}
                                                    </span>
                                                </div>
                                                <Badge variant={request.status === 'approved' ? 'secondary' : request.status === 'denied' ? 'destructive' : 'default'}>
                                                    {request.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Requested: {new Date(request.requestDate).toLocaleString()}
                                            </p>

                                            {request.status === 'pending' && !currentApprovalRequest && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => startApprovalProcess(request)}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDenyRequest(request.id)}
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        Deny
                                                    </Button>
                                                </div>
                                            )}

                                            {request.status === 'denied' && (
                                                <div className="text-sm text-muted-foreground">
                                                    Access denied
                                                </div>
                                            )}

                                            {request.status === 'pending' && currentApprovalRequest?.id === request.id && (
                                                <div className="space-y-4">
                                                    <div className="space-y-3">
                                                        <Label className="text-sm font-medium">Select documents to share:</Label>
                                                        {documents.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">No documents available to share.</p>
                                                        ) : (
                                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                                {documents.map((doc) => (
                                                                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`doc-${doc.id}`}
                                                                            checked={selectedDocumentsForApproval.includes(doc.id)}
                                                                            onChange={() => toggleDocumentSelection(doc.id)}
                                                                            className="rounded"
                                                                        />
                                                                        <label htmlFor={`doc-${doc.id}`} className="flex-1 text-sm cursor-pointer">
                                                                            {doc.name} ({doc.category})
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Access duration (hours):</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                max="168"
                                                                value={approvalDuration}
                                                                onChange={(e) => setApprovalDuration(parseInt(e.target.value) || 24)}
                                                                className="w-20"
                                                            />
                                                            <span className="text-sm text-muted-foreground">hours</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleApproveRequest(request.id)}
                                                            disabled={selectedDocumentsForApproval.length === 0}
                                                        >
                                                            <Check className="h-3 w-3 mr-1" />
                                                            Grant Access
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={cancelApprovalProcess}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Active Permissions</CardTitle>
                            <CardDescription>
                                Manage currently active access grants.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activePermissions.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No active permissions.</p>
                            ) : (
                                <div className="space-y-2">
                                    {activePermissions.map((permission, index) => (
                                        <div key={index} className="p-3 bg-muted/30 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">Dr. {formatWalletAddress(permission.address)}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Expires: {permission.expiresAt ? new Date(permission.expiresAt).toLocaleDateString() : 'Never'}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Documents: {permission.documentIds?.length || 0}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRevokePermission(index)}
                                                >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Revoke
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Audit Log
                            </CardTitle>
                            <CardDescription>
                                Transparent log of all activities with blockchain transactions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {auditLogs.length === 0 ? (
                                <div className="text-muted-foreground text-center py-4">
                                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No audit logs yet.</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-64 pr-4">
                                    <div className="space-y-3">
                                        {auditLogs.slice().reverse().map((log, index) => (
                                            <div key={index} className="p-3 bg-muted/30 rounded-lg w-full">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {log.action === 'access.approve' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                        {log.action === 'consent.revoked' && <XCircle className="h-4 w-4 text-red-500" />}
                                                        {log.action === 'record.upload' && <Upload className="h-4 w-4 text-blue-500" />}
                                                        {log.action === 'record.delete' && <Trash2 className="h-4 w-4 text-orange-500" />}
                                                        <span className="text-sm font-medium">
                                                            {log.action === 'access.approve' && 'Access Approved'}
                                                            {log.action === 'consent.revoked' && 'Access Revoked'}
                                                            {log.action === 'record.upload' && 'Record Uploaded'}
                                                            {log.action === 'record.delete' && 'Record Deleted'}
                                                            {log.action === 'access.deny' && 'Access Denied'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </span>
                                                </div>

                                                {log.details?.transactions && log.details.transactions.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Blockchain Transactions:</p>
                                                        {log.details.transactions.map((tx, txIndex) => (
                                                            <div key={txIndex} className="flex items-center justify-between text-xs bg-background/50 p-2 rounded">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant={tx.success ? 'secondary' : 'destructive'} className="text-xs">
                                                                        {tx.success ? 'Success' : 'Failed'}
                                                                    </Badge>
                                                                    <span className="font-mono">
                                                                        {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-muted-foreground">
                                                                    {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {log.details?.doctorId && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Doctor: {formatWalletAddress(log.details.doctorId)}
                                                    </p>
                                                )}

                                                {log.details?.documentIds && log.details.documentIds.length > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Documents: {log.details.documentIds.length}
                                                    </p>
                                                )}

                                                {log.details?.durationHours && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Duration: {log.details.durationHours} hours
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ConsentManager;

