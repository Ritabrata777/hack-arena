'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Badge } from '@/frontend/components/ui/badge';
import { Check, X, Bell, Loader2 } from 'lucide-react';
import { updateRenewalRequestStatus } from '@/backend/services/mongodb';

const Renewals = ({ renewalRequests, setRenewalRequests, patientProfiles }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(null); // Store ID of loading request

    const handleStatusUpdate = async (id, status) => {
        setIsLoading(id);
        try {
            await updateRenewalRequestStatus(id, status);
            // Optimistic update
            const updatedRequests = renewalRequests.map(req => 
                req.id === id ? { ...req, status } : req
            );
            setRenewalRequests(updatedRequests);
            toast({
                title: "Status Updated",
                description: `Request has been ${status}.`
            });
        } catch (error) {
            console.error("Failed to update status:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update renewal status." });
        } finally {
            setIsLoading(null);
        }
    };
    
    const sortedRequests = [...renewalRequests].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.requestDate) - new Date(a.requestDate);
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Prescription Renewal Requests</CardTitle>
                <CardDescription>Manage patient requests for prescription renewals.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] rounded-md border">
                    {sortedRequests.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request Date</TableHead>
                                    <TableHead>Patient</TableHead>
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
                                            <TableCell>
                                                <Badge variant={
                                                    req.status === 'approved' ? 'secondary' : 
                                                    req.status === 'denied' ? 'destructive' : 'default'
                                                } className={req.status === 'approved' && 'text-green-500 border-green-500'}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="space-x-2">
                                                {req.status === 'pending' ? (
                                                    isLoading === req.id ? <Loader2 className="animate-spin" /> :
                                                    <>
                                                        <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(req.id, 'denied')}><X className="mr-2 h-4 w-4" />Deny</Button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Actioned</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No Renewal Requests</h3>
                            <p className="text-sm text-muted-foreground">You have no pending or past renewal requests.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">{renewalRequests.length} total request(s).</p>
            </CardFooter>
        </Card>
    );
};

export default Renewals;
