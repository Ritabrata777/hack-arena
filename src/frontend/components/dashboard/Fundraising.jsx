
'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Badge } from '@/frontend/components/ui/badge';
import { Check, X, HeartHandshake, Loader2, FileText, Eye, Download, ShieldCheck } from 'lucide-react';
import { updateFundraiserRequestStatus } from '@/backend/services/mongodb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/dialog"
import Image from 'next/image';

const ViewRequestDialog = ({ request, patient }) => (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
            <DialogTitle>Fundraiser Request from {patient?.name}</DialogTitle>
            <DialogDescription>Review the details and documents before approving or denying.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div>
                <h4 className="font-semibold">Campaign Title</h4>
                <p>{request.title}</p>
            </div>
             <div>
                <h4 className="font-semibold">Patient's Story</h4>
                <p className="text-muted-foreground">{request.description}</p>
            </div>
             <div>
                <h4 className="font-semibold">Goal Amount</h4>
                <p>{request.goalAmount} APT</p>
            </div>
            <div>
                 <h4 className="font-semibold">Supporting Documents</h4>
                 <div className="mt-2 space-y-2">
                    {request.documents?.map((doc, index) => (
                         <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                                {doc.uri.startsWith('data:image') ?
                                    <Image src={doc.uri} alt={doc.name} width={32} height={32} className="rounded" /> :
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                }
                                <span className="text-sm font-medium">{doc.name}</span>
                            </div>
                            <a href={doc.uri} download={doc.name} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm"><Download className="mr-2"/>Download</Button>
                            </a>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    </DialogContent>
);


const Fundraising = ({ fundraiserRequests, setFundraiserRequests, patientProfiles, refreshData, activeWallet }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(null); // Store ID of loading request

    const handleStatusUpdate = async (id, status) => {
        setIsLoading(id);
        try {
            // Doctors now only approve for admin review or deny
            const newStatus = status === 'approved' ? 'pending_admin_approval' : 'denied';
            await updateFundraiserRequestStatus(id, newStatus);
            
            toast({ 
                title: status === 'approved' ? "Request Sent for Admin Review" : "Request Denied",
                description: status === 'approved' ? "The request is now pending final admin verification." : "The request has been denied."
            });
            
            if (refreshData) await refreshData();

        } catch (error) {
            console.error("Failed to update status:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Could not update fundraiser status." });
        } finally {
            setIsLoading(null);
        }
    };
    
    const sortedRequests = [...fundraiserRequests].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.requestDate) - new Date(a.requestDate);
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="default">Pending Your Review</Badge>;
            case 'pending_admin_approval':
                return <Badge variant="secondary" className="text-orange-500 border-orange-500">Pending Admin</Badge>;
            case 'approved':
                 return <Badge variant="secondary" className="text-green-500 border-green-500">Live on Chain</Badge>;
            case 'denied':
                return <Badge variant="destructive">Denied</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Fundraiser Requests</CardTitle>
                <CardDescription>Review and approve patient-initiated requests for financial aid. Approved requests will be sent for final admin verification.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] rounded-md border">
                    {sortedRequests.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request Date</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Goal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedRequests.map(req => {
                                    const patient = patientProfiles[req.patientId.toLowerCase()];
                                    return (
                                        <TableRow key={req.id}>
                                            <TableCell>{new Date(req.requestDate).toLocaleString()}</TableCell>
                                            <TableCell>{patient?.name || req.patientId.substring(0, 12) + '...'}</TableCell>
                                            <TableCell>{req.title}</TableCell>
                                            <TableCell>{req.goalAmount} APT</TableCell>
                                            <TableCell>
                                                {getStatusBadge(req.status)}
                                            </TableCell>
                                            <TableCell className="space-x-2 flex items-center">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                         <Button size="sm" variant="outline"><Eye className="mr-2"/>View</Button>
                                                    </DialogTrigger>
                                                    <ViewRequestDialog request={req} patient={patient}/>
                                                </Dialog>
                                                {req.status === 'pending' ? (
                                                    isLoading === req.id ? <Loader2 className="animate-spin" /> :
                                                    <>
                                                        <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'approved', req)}><ShieldCheck className="mr-2"/>Approve</Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(req.id, 'denied', req)}><X className="mr-2"/>Deny</Button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm ml-2">Actioned</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                            <HeartHandshake className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No Fundraiser Requests</h3>
                            <p className="text-sm text-muted-foreground">You have no pending or past fundraiser requests from patients.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">{fundraiserRequests.length} total request(s).</p>
            </CardFooter>
        </Card>
    );
};

export default Fundraising;
