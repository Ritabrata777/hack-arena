
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { FileText, PlusCircle, MessageSquare, User, HeartHandshake, Calendar, Stethoscope, Clock } from 'lucide-react';
import { useMemo } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/frontend/components/ui/accordion"


const PatientDashboard = ({ setActiveTab, consultations, activeWallet, doctorProfiles }) => {

    const patientConsultations = activeWallet
        ? (consultations || []).filter(c => c.patientId?.toLowerCase() === activeWallet.toLowerCase())
        : [];

    const uniqueDoctorsCount = [...new Set(patientConsultations.map(c => c.doctorWallet))].length;

    // Function to get doctor name from wallet address
    const getDoctorName = (doctorWallet) => {
        if (!doctorWallet || !doctorProfiles) return 'Unknown Doctor';

        const doctorProfile = doctorProfiles[doctorWallet.toLowerCase()];
        if (doctorProfile && doctorProfile.name) {
            return doctorProfile.name;
        }

        // Fallback: show first and last 4 characters of wallet
        return `Dr. ${doctorWallet.substring(0, 6)}...${doctorWallet.substring(doctorWallet.length - 4)}`;
    };

    // Get recent consultations (last 5) sorted by date
    const recentConsultations = useMemo(() => {
        return patientConsultations
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
    }, [patientConsultations]);

    // Format date for display
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format time for display
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="grid gap-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Welcome!</h1>
                <p className="text-muted-foreground">Here's a quick overview of your MediChain health journey.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="cursor-pointer hover:bg-accent/30 bg-accent/20 border-accent/50" onClick={() => setActiveTab('fundraising')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-accent-foreground/80">Request Fundraiser</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-accent-foreground">Need Help?</div>
                        <p className="text-xs text-accent-foreground/70">
                            Request financial aid for treatment.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Doctors Consulted</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uniqueDoctorsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            unique doctors you have seen
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="p-6">
                            <div>
                                <CardTitle>Recent Consultations</CardTitle>
                                <CardDescription className="text-left">Your latest consultation history and details.</CardDescription>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="p-6 pt-0">
                                {recentConsultations.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentConsultations.map((consultation, index) => (
                                            <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                                                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <Stethoscope className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-semibold text-foreground">
                                                            Consultation #{consultation.id || index + 1}
                                                        </h4>
                                                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{formatDate(consultation.timestamp)}</span>
                                                            <Clock className="h-3 w-3 ml-2" />
                                                            <span>{formatTime(consultation.timestamp)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-2">
                                                        <p className="text-xs text-muted-foreground mb-1">Doctor:</p>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {getDoctorName(consultation.doctorWallet)}
                                                        </p>
                                                    </div>

                                                    {consultation.summary && (
                                                        <div className="mb-2">
                                                            <p className="text-xs text-muted-foreground mb-1">Summary:</p>
                                                            <p className="text-sm text-foreground line-clamp-2">
                                                                {consultation.summary}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {consultation.prescription && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">Prescription:</p>
                                                            <p className="text-sm text-foreground line-clamp-2">
                                                                {consultation.prescription}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {patientConsultations.length > 5 && (
                                            <div className="text-center pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setActiveTab('logs')}
                                                    className="text-sm"
                                                >
                                                    View All {patientConsultations.length} Consultations
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground mb-2">No Consultations Yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            You haven't had any consultations yet. Book your first appointment to get started!
                                        </p>
                                        <Button onClick={() => setActiveTab('book-appointment')}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Book Appointment
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>View All Records</CardTitle>
                        <CardDescription>Browse your complete, secure consultation history.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button onClick={() => setActiveTab('logs')}>
                            <FileText className="mr-2 h-4 w-4" /> View My Records
                        </Button>
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Manage Your Profile</CardTitle>
                        <CardDescription>Update your info and manage family accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button variant="outline" onClick={() => setActiveTab('profile')}>
                            <User className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                    </CardContent>
                </Card>
            </div>


        </div>
    );
};

export default PatientDashboard;
