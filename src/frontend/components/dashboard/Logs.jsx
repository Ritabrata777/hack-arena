
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { decryptData } from '@/backend/lib/crypto';
import { useToast } from "@/frontend/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/frontend/components/ui/dialog"
import { ScrollArea } from "@/frontend/components/ui/scroll-area"
import { Eye, FileText, User, BriefcaseMedical, Star, ShieldCheck, Download, RefreshCw, Send, MessageSquare, Users, Loader2 } from 'lucide-react';
import { updateConsultationRatingAndReview, createRenewalRequest, getAllConsultations } from '@/backend/services/mongodb';

import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Label } from '@/frontend/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { hasConsent, createHash } from '@/frontend/lib/blockchain';

const StarRating = ({ rating, onRate, disabled }) => {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`cursor-pointer h-5 w-5 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    onClick={() => !disabled && onRate(star)}
                />
            ))}
        </div>
    );
};

const LogItem = ({ log, currentWalletAddress, setConsultations, consultations, isPatientViewLocked, doctorProfiles = {}, patientProfiles = {}, refreshData, setActiveTab }) => {
    const [decrypted, setDecrypted] = useState(null);
    const [reviewText, setReviewText] = useState(log.reviewText || '');
    const { toast } = useToast();

    const handleView = async () => {
        try {
            if (!isPatientViewLocked) {
                // Doctor trying to view patient record: require consent
                // For EVM, we use a simple hash function compatible with the contract
                const scopeId = await createHash('read:records');
                const ok = await hasConsent({ patient: log.patientId, grantee: currentWalletAddress, scopeId });
                if (!ok) {
                    toast({ variant: 'destructive', title: 'Access Denied', description: 'No active consent from patient.' });
                    return;
                }
            }
            const decryptedSummary = decryptData(log.encryptedSummary);
            setDecrypted(decryptedSummary);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Cannot view record', description: e.message || 'Consent check failed' });
        }
    };

    const handleRateAndReview = async (rating, review) => {
        try {
            await updateConsultationRatingAndReview(log.id, rating, review);

            const updatedConsultations = consultations.map(c => c.id === log.id ? { ...c, rating, reviewText: review } : c);
            setConsultations(updatedConsultations);

            toast({ title: "Feedback Submitted", description: `You rated this consultation ${rating} stars.` });
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not submit your feedback." });
        }
    };

    const handleRenewalRequest = async () => {
        try {
            await createRenewalRequest({
                patientId: log.patientId,
                consultationId: log.id,
                doctorWallet: log.doctorWallet,
            });
            toast({ title: "Renewal Request Sent", description: "Your doctor has been notified of your request." });
            if (refreshData) refreshData();
        } catch (error) {
            console.error("Failed to request renewal:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not send renewal request." });
        }
    };

    const handleDownloadPdf = () => {
        if (!log.pdfDataUri) return;
        const link = document.createElement('a');
        link.href = log.pdfDataUri;
        link.download = log.pdfFileName || 'consultation.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleMessageDoctor = () => {
        if (setActiveTab) {
            setActiveTab('messages');
        }
    }

    const isMyLogAsDoctor = log.doctorWallet?.toLowerCase() === currentWalletAddress?.toLowerCase();
    const doctorProfile = doctorProfiles[log.doctorWallet] || {};
    const patientProfile = patientProfiles[log.patientId.toLowerCase()] || {};

    const getDoctorName = (doctorWallet) => {
        if (!doctorWallet || !doctorProfiles) return 'Unknown Doctor';

        const doctorProfile = doctorProfiles[doctorWallet.toLowerCase()];
        if (doctorProfile && doctorProfile.name) {
            return doctorProfile.name;
        }

        return `Dr. ${doctorWallet.substring(0, 6)}...${doctorWallet.substring(doctorWallet.length - 4)}`;
    };

    const getPatientName = (patientId) => {
        if (!patientId || !patientProfiles) return 'Unknown Patient';
        const profile = patientProfiles[patientId.toLowerCase()];
        return profile?.name || `Patient: ${patientId.substring(0, 12)}...`;
    }

    return (
        <div className="flex items-center justify-between p-4 border-b last:border-b-0">
            <div className="flex items-center gap-4">
                {!isMyLogAsDoctor && doctorProfile.documents?.photo ? (
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={doctorProfile.documents.photo} alt={doctorProfile.name} />
                        <AvatarFallback>{doctorProfile.name ? doctorProfile.name.charAt(0) : 'D'}</AvatarFallback>
                    </Avatar>
                ) : (
                    isMyLogAsDoctor ? <BriefcaseMedical className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-accent" />
                )}
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{isMyLogAsDoctor ? getPatientName(log.patientId) : `Doctor: ${getDoctorName(log.doctorWallet)}`}</p>
                        {!isMyLogAsDoctor && doctorProfile.verified && <ShieldCheck className="h-4 w-4 text-green-500" title="Verified Doctor" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                    {isPatientViewLocked && log.consultationFor?.name && (
                        <p className="text-xs text-muted-foreground mt-1 font-semibold">For: {log.consultationFor.name}</p>
                    )}
                    {log.reviewText && !isPatientViewLocked && <p className="text-xs italic text-muted-foreground mt-1">Review: "{log.reviewText.substring(0, 50)}..."</p>}
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleView}><Eye className="mr-2 h-4 w-4" />View</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Consultation Summary</DialogTitle>
                        <DialogDescription>
                            Recorded on {new Date(log.timestamp).toLocaleString()} for {log.consultationFor?.name || 'Self'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <ScrollArea className="h-48 bg-muted p-4 rounded-md">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{decrypted || "Click 'View' to decrypt summary."}</p>
                        </ScrollArea>
                        {isPatientViewLocked && (
                            <div className="flex flex-col gap-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold">Rate this Consultation</h4>
                                        <p className="text-sm text-muted-foreground">Your feedback improves the system.</p>
                                    </div>
                                    <StarRating rating={log.rating || 0} onRate={(rating) => handleRateAndReview(rating, reviewText)} disabled={!!log.rating} />
                                </div>
                                {log.rating && (
                                    <div>
                                        <Label htmlFor="reviewText">Your Review</Label>
                                        <Textarea id="reviewText" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your experience..." disabled={!!log.reviewText} />
                                        {!log.reviewText && <Button size="sm" className="mt-2" onClick={() => handleRateAndReview(log.rating, reviewText)}><Send className="mr-2 h-4 w-4" />Submit Review</Button>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="justify-between w-full flex-wrap gap-2">
                        {isPatientViewLocked && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleRenewalRequest}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> Request Renewal
                                </Button>
                                <Button variant="secondary" onClick={handleMessageDoctor}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> Message Doctor
                                </Button>
                            </div>
                        )}
                        {log.pdfDataUri && (
                            <Button onClick={handleDownloadPdf}>
                                <Download className="mr-2 h-4 w-4" /> Download PDF
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Logs = ({
    activeWallet,
    patientProfiles,
    doctorProfiles,
    consultations,
    setConsultations,
    isPatientViewLocked = false,
    setActiveTab
}) => {
    const [isLoading, setIsLoading] = useState(!consultations || consultations.length === 0);
    const [memberFilter, setMemberFilter] = useState('all');

    const activeProfile = isPatientViewLocked
        ? (activeWallet ? patientProfiles?.[activeWallet.toLowerCase()] : null)
        : (activeWallet ? doctorProfiles?.[activeWallet.toLowerCase()] : null);

    const dependents = (isPatientViewLocked && activeProfile?.dependents) ? activeProfile.dependents : [];

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const consults = await getAllConsultations();
            setConsultations(consults || []);
        } catch (error) {
            console.error("Failed to fetch logs data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [setConsultations]);

    useEffect(() => {
        if (!consultations || consultations.length === 0) {
            fetchData();
        } else {
            setIsLoading(false);
        }
    }, [consultations, fetchData]);

    const filteredLogs = (consultations || [])
        .filter(log => {
            if (!activeWallet) return false;
            const activeWalletLower = activeWallet.toLowerCase();
            const logDoctorWallet = (log.doctorWallet || '').toLowerCase();
            const logPatientId = (log.patientId || '').toLowerCase();

            if (isPatientViewLocked) {
                if (logPatientId !== activeWalletLower) return false;
                if (memberFilter === 'all') return true;
                if (memberFilter === 'self') return !log.consultationFor || log.consultationFor.id === activeWalletLower;
                return log.consultationFor?.id === memberFilter;
            }

            return logDoctorWallet === activeWalletLower;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const getCardDescription = () => {
        if (isPatientViewLocked) {
            return "Viewing records where you are the patient. Use the filter to view dependent records.";
        }
        return "Viewing records you created as a doctor.";
    }

    const getNoLogsMessage = () => {
        let baseMessage = isPatientViewLocked ? "There are no consultation records." : "You haven't created any consultations yet.";
        if (memberFilter !== 'all' && isPatientViewLocked) {
            baseMessage = "No records found for this family member."
        }
        if (!activeWallet) {
            baseMessage += " Connect your wallet to see your logs.";
        }
        return baseMessage;
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline">Consultation Logs</CardTitle>
                        <CardDescription>{getCardDescription()}</CardDescription>
                    </div>
                    {isPatientViewLocked && dependents.length > 0 && (
                        <div className="w-[200px]">
                            <Select value={memberFilter} onValueChange={setMemberFilter}>
                                <SelectTrigger>
                                    <Users className="mr-2" />
                                    <SelectValue placeholder="Filter by family member..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Family</SelectItem>
                                    <SelectItem value="self">My Records</SelectItem>
                                    {dependents.map(dep => (
                                        <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] rounded-md border">
                    {filteredLogs.length > 0 ? (
                        filteredLogs.map(log => <LogItem
                            key={log.id}
                            log={log}
                            currentWalletAddress={activeWallet}
                            setConsultations={setConsultations}
                            consultations={consultations}
                            isPatientViewLocked={isPatientViewLocked}
                            doctorProfiles={doctorProfiles}
                            patientProfiles={patientProfiles}
                            refreshData={fetchData}
                            setActiveTab={setActiveTab}
                        />)
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No Logs Found</h3>
                            <p className="text-sm text-muted-foreground">{getNoLogsMessage()}</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">{filteredLogs.length} log(s) found.</p>
            </CardFooter>
        </Card>
    );
};

export default Logs;
