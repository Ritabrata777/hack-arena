'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Label } from '@/frontend/components/ui/label';
import { createFundraiserRequest } from '@/backend/services/mongodb';
import { Loader2, PlusCircle, UploadCloud, FileText, Download, HeartHandshake, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import Image from 'next/image';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

const RequestForm = ({ activeWallet, consultations, doctorProfiles, refreshData }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [documents, setDocuments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const previouslyConsultedDoctorIds = useMemo(() => {
        const ids = new Set(
            (consultations || [])
                .filter(c => c.patientId?.toLowerCase && activeWallet && c.patientId.toLowerCase() === activeWallet.toLowerCase())
                .map(c => c.doctorWallet.toLowerCase())
        );
        return Array.from(ids);
    }, [consultations, activeWallet]);

    const previouslyConsultedDoctors = previouslyConsultedDoctorIds.map(id => doctorProfiles[id]).filter(Boolean);
    const doctorOptions = previouslyConsultedDoctors.length > 0
        ? previouslyConsultedDoctors
        : Object.values(doctorProfiles || {});

    const fileToDataUri = (file) => new Promise((resolve, reject) => {
        if (!file) resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            if (file.size > 5_000_000) {
                toast({ variant: "destructive", title: "File too large", description: `${file.name} is larger than 5MB.` });
                continue;
            }
            const dataUri = await fileToDataUri(file);
            const newDocument = {
                name: file.name,
                type: file.type,
                uri: dataUri,
            };
            setDocuments(prev => [...prev, newDocument]);
        }
    };

    const handleRemoveDocument = (index) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    }

    const handleSubmit = async () => {
        if (!title || !description || !goalAmount || !doctorId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields and select a doctor.' });
            return;
        }
        if (parseFloat(goalAmount) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Goal Amount', description: 'Goal amount must be greater than 0.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await createFundraiserRequest({
                patientId: activeWallet,
                doctorId,
                title,
                description,
                goalAmount: parseFloat(goalAmount),
                documents,
            });
            toast({ title: 'Request Submitted', description: 'Your request has been sent to the selected doctor for verification.' });
            // Reset form
            setTitle('');
            setDescription('');
            setGoalAmount('');
            setDoctorId('');
            setDocuments([]);
            if (refreshData) refreshData();
        } catch (error) {
            console.error('Failed to create fundraiser request', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit your request.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create a New Fundraiser Request</CardTitle>
                <CardDescription>Fill out the details below. A doctor you've previously consulted with must approve this request before it goes live.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="title">Campaign Title *</Label>
                    <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Help with my surgery costs" />
                </div>
                <div>
                    <Label htmlFor="description">Your Story *</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain your medical situation and why you need financial support." />
                </div>
                <div>
                    <Label htmlFor="goalAmount">Goal Amount (in APT) *</Label>
                    <Input id="goalAmount" type="number" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} placeholder="e.g., 500" />
                </div>
                <div>
                    <Label htmlFor="doctorId">Verifying Doctor *</Label>
                    <Select onValueChange={setDoctorId} value={doctorId}>
                        <SelectTrigger><SelectValue placeholder="Select a doctor to verify your case..." /></SelectTrigger>
                        <SelectContent>
                            {doctorOptions.length === 0 && (
                                <SelectItem value="__none__" disabled>
                                    No registered doctors found
                                </SelectItem>
                            )}
                            {doctorOptions.map(doc => (
                                <SelectItem key={doc.walletAddress} value={doc.walletAddress}>
                                    {doc.name} ({doc.specialization})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">{previouslyConsultedDoctors.length > 0 ? 'Only doctors you have consulted with via MediChain can verify a request.' : 'Showing all registered doctors. If you have prior consultations, those doctors will be prioritized.'}</p>
                </div>
                <div className="space-y-2">
                    <Label>Supporting Documents (Medical reports, bills, etc.)</Label>
                    <div className="p-4 border border-dashed rounded-lg space-y-4">
                        {documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                <div className="flex items-center gap-2">
                                    {doc.uri.startsWith('data:image') ?
                                        <Image src={doc.uri} alt={doc.name} width={32} height={32} className="rounded" /> :
                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                    }
                                    <span className="text-sm font-medium truncate">{doc.name}</span>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDocument(index)}>
                                    <X className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <label htmlFor="doc-upload" className="flex items-center justify-center gap-2 text-primary cursor-pointer hover:text-primary/80 w-full border border-primary/20 p-2 rounded-md">
                            <UploadCloud />
                            <span>Upload Files</span>
                        </label>
                        <Input id="doc-upload" type="file" multiple className="sr-only" onChange={handleFileUpload} />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <HeartHandshake className="mr-2" />}
                    Submit for Verification
                </Button>
            </CardFooter>
        </Card>
    )
}

const StatusTracker = ({ requests, doctorProfiles }) => {
    if (!requests || requests.length === 0) {
        return (
            <div className="text-center py-20">
                <HeartHandshake className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Requests Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Submit a request from the 'New Request' tab to get started.
                </p>
            </div>
        )
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { icon: <Clock className="text-yellow-500" />, variant: 'default', text: 'Pending Doctor Approval' };
            case 'approved':
                return { icon: <CheckCircle2 className="text-green-500" />, variant: 'secondary', text: 'Approved & Live!' };
            case 'denied':
                return { icon: <AlertTriangle className="text-red-500" />, variant: 'destructive', text: 'Request Denied' };
            default:
                return { icon: <Clock />, variant: 'default', text: 'Unknown' };
        }
    };

    return (
        <ScrollArea className="h-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Verifying Doctor</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map(req => {
                        const doctor = doctorProfiles[req.doctorId];
                        const statusInfo = getStatusInfo(req.status);
                        return (
                            <TableRow key={req.id}>
                                <TableCell>{new Date(req.requestDate).toLocaleString()}</TableCell>
                                <TableCell>{req.title}</TableCell>
                                <TableCell>{doctor?.name || 'Unknown Doctor'}</TableCell>
                                <TableCell>
                                    <Badge variant={statusInfo.variant} className="flex items-center gap-2">
                                        {statusInfo.icon}
                                        {statusInfo.text}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}


const RequestFundraiser = ({ activeWallet, consultations, doctorProfiles, fundraiserRequests, refreshData }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Request a Fundraiser</CardTitle>
                <CardDescription>Create and track requests for financial assistance, verified by your doctor.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="new-request">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="new-request"><PlusCircle className="mr-2" />New Request</TabsTrigger>
                        <TabsTrigger value="status-tracker">Status Tracker</TabsTrigger>
                    </TabsList>
                    <TabsContent value="new-request" className="mt-4">
                        <RequestForm
                            activeWallet={activeWallet}
                            consultations={consultations}
                            doctorProfiles={doctorProfiles}
                            refreshData={refreshData}
                        />
                    </TabsContent>
                    <TabsContent value="status-tracker" className="mt-4 h-[60vh]">
                        <StatusTracker requests={fundraiserRequests} doctorProfiles={doctorProfiles} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default RequestFundraiser;
