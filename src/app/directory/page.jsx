'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAllDoctorProfiles, createAppointment } from '@/backend/services/mongodb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ShieldCheck, Star, MapPin, CalendarPlus, BriefcaseMedical } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


const AppointmentModal = ({ doctor, onAppointmentBooked }) => {
    const [appointmentTime, setAppointmentTime] = useState('');
    const [notes, setNotes] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [activePatientWallet] = useLocalStorage('activePatientWallet', null);
    const { toast } = useToast();
    const router = useRouter();

    const handleBookAppointment = async () => {
        if (!activePatientWallet) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please log in as a patient to book an appointment.' });
            router.push('/dashboard/patient');
            return;
        }
        if (!appointmentTime) {
            toast({ variant: 'destructive', title: 'Missing Date', description: 'Please select a date and time for the appointment.' });
            return;
        }
        setIsBooking(true);
        try {
            await createAppointment({
                patientId: activePatientWallet,
                doctorId: doctor.walletAddress,
                appointmentTime,
                notes
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

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Book Appointment with Dr. {doctor.name}</DialogTitle>
                <DialogDescription>Select a time and add any relevant notes for your appointment.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="appointmentTime">Date and Time</Label>
                    <Input id="appointmentTime" type="datetime-local" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="notes">Reason for Visit (Optional)</Label>
                    <Textarea id="notes" placeholder="e.g., General check-up, follow-up..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
            </div>
            <CardFooter>
                <Button onClick={handleBookAppointment} disabled={isBooking} className="w-full">
                    {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Request Appointment
                </Button>
            </CardFooter>
        </DialogContent>
    )
}


const DoctorDirectoryPage = () => {
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchDoctors = async () => {
            setIsLoading(true);
            const profiles = await getAllDoctorProfiles();
            const verifiedDoctors = Object.values(profiles).filter(p => p.verified && !p.banned);
            setDoctors(verifiedDoctors);
            setIsLoading(false);
        };
        fetchDoctors();
    }, []);
    
    const filteredDoctors = useMemo(() => {
        if (!searchQuery) return doctors;
        return doctors.filter(doc => 
            doc.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [doctors, searchQuery]);

    useEffect(() => {
        const doctorId = searchParams.get('book');
        if (doctorId && doctors.length > 0) {
            const doc = doctors.find(d => d.walletAddress.toLowerCase() === doctorId.toLowerCase());
            if (doc) {
                setSelectedDoctor(doc);
                setIsModalOpen(true);
            }
        }
    }, [searchParams, doctors]);
    
    const handleOpenModal = (doctor) => {
        setSelectedDoctor(doctor);
        setIsModalOpen(true);
        router.push(`/directory?book=${doctor.walletAddress}`, { scroll: false });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        router.push('/directory', { scroll: false });
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
        <div className="min-h-screen gradient-bg-services">
            <header className="bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                     <h1 className="text-2xl font-bold font-headline text-gradient">Find a Doctor</h1>
                     <Button variant="outline" onClick={() => router.push('/')}>Back to Home</Button>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 <div className="mb-8 text-center max-w-xl mx-auto">
                    <p className="text-lg text-muted-foreground">Browse our directory of trusted and verified medical professionals.</p>
                     <div className="mt-4 relative">
                        <Input 
                            placeholder="Search by doctor's wallet address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 text-center"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
                {filteredDoctors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                        <div className="flex items-center gap-1 text-sm text-yellow-400 mt-1">
                                            <Star className="w-4 h-4 fill-current"/> N/A
                                        </div>
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
                ) : (
                    <div className="text-center py-20">
                        <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Doctors Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                           Your search for "{searchQuery}" did not match any verified doctors. Try clearing the search.
                        </p>
                    </div>
                )}
            </main>
        </div>
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
            {selectedDoctor && <AppointmentModal doctor={selectedDoctor} onAppointmentBooked={handleCloseModal} />}
        </Dialog>
        </>
    );
};

const DoctorDirectoryPageWithSuspense = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DoctorDirectoryPage />
        </Suspense>
    );
};

export default DoctorDirectoryPageWithSuspense;
