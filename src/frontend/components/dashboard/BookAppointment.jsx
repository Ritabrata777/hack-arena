
'use client';
import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createAppointment, getAllDoctorProfiles, getAvailableTimeSlots } from '@/backend/services/mongodb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import { Loader2, Search, Star, MapPin, CalendarPlus, BriefcaseMedical, Calendar, Users } from 'lucide-react';
import { useLocalStorage } from '@/frontend/hooks/useLocalStorage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/frontend/components/ui/dialog"
import { useToast } from '@/frontend/hooks/use-toast';
import { Label } from '@/frontend/components/ui/label';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';


const AppointmentModal = ({ doctor, onAppointmentBooked, patientProfile }) => {
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [timeSlots, setTimeSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(true);
    const [notes, setNotes] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [activePatientWallet] = useLocalStorage('activePatientWallet', null);
    const { toast } = useToast();

    useEffect(() => {
        if (doctor?.walletAddress) {
            setIsLoadingSlots(true);
            getAvailableTimeSlots(doctor.walletAddress)
                .then(slots => setTimeSlots(slots))
                .catch(err => console.error('Failed to fetch time slots:', err))
                .finally(() => setIsLoadingSlots(false));
        }
    }, [doctor]);

    const handleBookAppointment = async () => {
        if (!activePatientWallet || !patientProfile) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Cannot find active patient profile.' });
            return;
        }
        if (!selectedTimeSlot) {
            toast({ variant: 'destructive', title: 'Missing Time Slot', description: 'Please select an available time slot.' });
            return;
        }
        setIsBooking(true);
        try {
            await createAppointment({
                patientId: activePatientWallet,
                doctorId: doctor.walletAddress,
                timeSlotId: selectedTimeSlot.id,
                notes,
            });
            toast({ title: 'Appointment Requested', description: `Your request has been sent to Dr. ${doctor.name}.` });
            onAppointmentBooked();
        } catch (error) {
            console.error("Appointment booking failed:", error);
            toast({ variant: 'destructive', title: 'Booking Failed', description: 'Could not request an appointment. Please try again.' });
        } finally {
            setIsBooking(false);
        }
    }

    const formatTime = (time) => new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Book Appointment with Dr. {doctor.name}</DialogTitle>
                <DialogDescription>Select an available time slot for your appointment.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label>Available Time Slots</Label>
                    {isLoadingSlots ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : timeSlots.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {timeSlots.map((slot) => (
                                <Button key={slot.id} variant={selectedTimeSlot?.id === slot.id ? "default" : "outline"} className="justify-start text-left h-auto" onClick={() => setSelectedTimeSlot(slot)}>
                                    <div>
                                        <div className="font-medium">{formatDate(slot.date)}</div>
                                        <div className="text-sm text-muted-foreground">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground"><Calendar className="mx-auto h-8 w-8 mb-2" /><p>No available time slots</p></div>
                    )}
                </div>
                <div>
                    <Label htmlFor="notes">Reason for Visit (Optional)</Label>
                    <Textarea id="notes" placeholder="e.g., General check-up, follow-up..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
            </div>
            <CardFooter>
                <Button onClick={handleBookAppointment} disabled={isBooking || !selectedTimeSlot || isLoadingSlots} className="w-full">
                    {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Request Appointment
                </Button>
            </CardFooter>
        </DialogContent>
    )
}

const MyAppointments = ({ appointments, doctorProfiles }) => {
    if (!appointments || appointments.length === 0) {
        return (
             <div className="text-center py-20">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Appointments Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">You haven't booked any appointments yet.</p>
            </div>
        )
    }

    const sortedAppointments = [...appointments].sort((a,b) => new Date(b.requestDate) - new Date(a.requestDate));

     return (
        <ScrollArea className="h-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Appointment Time</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedAppointments.map(appt => {
                        const doctor = doctorProfiles[appt.doctorId];
                        return (
                            <TableRow key={appt.id}>
                                <TableCell>{doctor?.name || 'Unknown Doctor'}</TableCell>
                                <TableCell>{new Date(appt.appointmentTime).toLocaleString()}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        appt.status === 'confirmed' ? 'secondary' : 
                                        appt.status === 'denied' ? 'destructive' : 'default'
                                    } className={appt.status === 'confirmed' ? 'text-green-500 border-green-500' : ''}>
                                        {appt.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}


const BookAppointment = ({ appointments, doctorProfiles, patientProfiles, activeWallet, refreshData }) => {
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const patientProfile = patientProfiles[activeWallet.toLowerCase()];

    useEffect(() => {
        const fetchDoctors = async () => {
            setIsLoading(true);
            try {
                const profiles = await getAllDoctorProfiles();
                const verifiedDoctors = Object.values(profiles).filter(p => p.verified && !p.banned);
                setDoctors(verifiedDoctors);
            } catch (error) {
                console.error("Failed to fetch doctors:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    const filteredDoctors = useMemo(() => {
        if (!searchQuery) return doctors;
        const query = searchQuery.toLowerCase();
        return doctors.filter(doc => 
            doc.name?.toLowerCase().includes(query) ||
            doc.specialization?.toLowerCase().includes(query) ||
            doc.walletAddress.toLowerCase().includes(query)
        );
    }, [doctors, searchQuery]);
    
    const handleOpenModal = (doctor) => {
        setSelectedDoctor(doctor);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDoctor(null);
        if(refreshData) refreshData();
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Book an Appointment</CardTitle>
                    <CardDescription>Find a verified doctor and schedule your next consultation.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="directory">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="directory">Doctor Directory</TabsTrigger>
                            <TabsTrigger value="my-appointments">My Appointments</TabsTrigger>
                        </TabsList>
                        <TabsContent value="directory" className="mt-4">
                             <div className="mb-4 relative">
                                <Input 
                                    placeholder="Search by name, specialization, or wallet..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            </div>
                             {isLoading ? (
                                <div className="h-[60vh] flex items-center justify-center">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                </div>
                            ) : filteredDoctors.length > 0 ? (
                                <ScrollArea className="h-[60vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                                    {filteredDoctors.map(doc => (
                                        <Card key={doc.walletAddress} className="flex flex-col">
                                            <CardHeader className="flex-row gap-4 items-start">
                                                <Avatar className="w-16 h-16 border-2 border-primary">
                                                    <AvatarImage src={doc.documents?.photo} alt={doc.name} />
                                                    <AvatarFallback><BriefcaseMedical className="w-8 h-8"/></AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle className="font-headline text-xl">{doc.name}</CardTitle>
                                                    <CardDescription>{doc.specialization}</CardDescription>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow space-y-2">
                                                <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4"/>{doc.location}</p>
                                                 <p className="flex items-center gap-2 text-sm text-muted-foreground"><BriefcaseMedical className="w-4 h-4"/>{doc.experience || 'N/A'} years of experience</p>
                                            </CardContent>
                                            <CardFooter>
                                                <Button className="w-full" onClick={() => handleOpenModal(doc)}>
                                                    <CalendarPlus className="mr-2"/> Book Appointment
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-20">
                                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">No Doctors Found</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Your search for "{searchQuery}" did not match any verified doctors.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="my-appointments" className="mt-4">
                            <MyAppointments appointments={appointments} doctorProfiles={doctorProfiles} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                {selectedDoctor && <AppointmentModal doctor={selectedDoctor} onAppointmentBooked={handleCloseModal} patientProfile={patientProfile} />}
            </Dialog>
        </>
    );
};

export default BookAppointment;
