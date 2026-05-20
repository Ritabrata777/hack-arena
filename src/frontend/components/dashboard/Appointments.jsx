
'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Badge } from '@/frontend/components/ui/badge';
import { Check, X, CalendarDays, Loader2 } from 'lucide-react';
import { updateAppointmentStatus } from '@/backend/services/mongodb';
import ManageTimeSlots from '@/frontend/components/dashboard/ManageTimeSlots';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';

const Appointments = ({ appointments, setAppointments, patientProfiles, refreshData, activeWallet }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(null); // Store ID of loading request

    const handleStatusUpdate = async (id, status) => {
        setIsLoading(id);
        try {
            await updateAppointmentStatus(id, status);
            // Optimistic update
            const updatedAppointments = appointments.map(req => 
                req.id === id ? { ...req, status } : req
            );
            setAppointments(updatedAppointments);
            toast({
                title: "Status Updated",
                description: `Appointment has been ${status}.`
            });
            if (refreshData) refreshData();
        } catch (error) {
            console.error("Failed to update status:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update appointment status." });
        } finally {
            setIsLoading(null);
        }
    };
    
    const sortedAppointments = [...appointments].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.requestDate) - new Date(a.requestDate);
    });

    return (
        <Tabs defaultValue="requests" className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="requests">Appointment Requests</TabsTrigger>
                <TabsTrigger value="slots">Add New Time Slot</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Appointment Requests</CardTitle>
                        <CardDescription>Manage patient requests for new appointments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[60vh] rounded-md border">
                            {sortedAppointments.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Request Date</TableHead>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Requested Time</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedAppointments.map(req => {
                                            const patient = patientProfiles[req.patientId.toLowerCase()];
                                            return (
                                                <TableRow key={req.id}>
                                                    <TableCell>{new Date(req.requestDate).toLocaleString()}</TableCell>
                                                    <TableCell>{patient?.name || req.patientId.substring(0, 12) + '...'}</TableCell>
                                                    <TableCell>{new Date(req.appointmentTime).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            req.status === 'confirmed' ? 'secondary' : 
                                                            req.status === 'denied' ? 'destructive' : 'default'
                                                        } className={req.status === 'confirmed' && 'text-green-500 border-green-500'}>
                                                            {req.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="space-x-2">
                                                        {req.status === 'pending' ? (
                                                            isLoading === req.id ? <Loader2 className="animate-spin" /> :
                                                            <>
                                                                <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'confirmed')}><Check className="mr-2 h-4 w-4" />Confirm</Button>
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
                                    <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold">No Appointment Requests</h3>
                                    <p className="text-sm text-muted-foreground">You have no pending or past appointment requests.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">{appointments.length} total request(s).</p>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="slots">
                <ManageTimeSlots activeWallet={activeWallet} />
            </TabsContent>
        </Tabs>
    );
};

export default Appointments;
