'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { decryptData } from '@/lib/crypto';
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, FileText, User, BriefcaseMedical, Star, ShieldCheck, Download } from 'lucide-react';
import { updateConsultationRating } from '@/services/mongodb';

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

const LogItem = ({ log, currentWalletAddress, setConsultations, consultations, isPatientViewLocked, doctorProfiles = {} }) => {
    const [decrypted, setDecrypted] = useState(null);
    const { toast } = useToast();

    const handleView = () => {
        const decryptedSummary = decryptData(log.encryptedSummary);
        setDecrypted(decryptedSummary);
    };
    
    const handleRate = async (rating) => {
        try {
            // Update Database
            await updateConsultationRating(log.id, rating);
            
            // Optimistically update local state to re-render UI instantly
            const updatedConsultations = consultations.map(c => c.id === log.id ? { ...c, rating } : c);
            setConsultations(updatedConsultations);

            toast({ title: "Rating Submitted", description: `You rated this consultation ${rating} stars.` });
        } catch (error) {
            console.error("Failed to submit rating:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not submit rating." });
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

    const isMyLogAsDoctor = log.doctorWallet?.toLowerCase() === currentWalletAddress?.toLowerCase();
    // Doctor wallet is stored in lowercase in the DB, so we look it up that way
    const doctorProfile = doctorProfiles[log.doctorWallet] || {};
    
    return (
        <div className="flex items-center justify-between p-4 border-b last:border-b-0">
            <div className="flex items-center gap-4">
               {isMyLogAsDoctor ? <BriefcaseMedical className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-accent" />}
                <div>
                    <div className="flex items-center gap-2">
                         <p className="font-semibold font-code text-sm">{isMyLogAsDoctor ? `Patient: ${log.patientId.substring(0, 12)}...` : `Doctor: ${log.doctorWallet.substring(0, 12)}...`}</p>
                         {!isMyLogAsDoctor && doctorProfile.verified && <ShieldCheck className="h-4 w-4 text-green-500" title="Verified Doctor" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
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
                        Recorded on {new Date(log.timestamp).toLocaleString()}
                    </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <ScrollArea className="h-48 bg-muted p-4 rounded-md">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{decrypted || "Click 'View' to decrypt summary."}</p>
                        </ScrollArea>
                        {isPatientViewLocked && (
                             <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h4 className="font-semibold">Rate this Consultation</h4>
                                    <p className="text-sm text-muted-foreground">Your feedback improves the system.</p>
                                </div>
                                <StarRating rating={log.rating || 0} onRate={handleRate} disabled={!!log.rating} />
                            </div>
                        )}
                    </div>
                     <DialogFooter>
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
    consultations,
    setConsultations, 
    activeWallet, 
    doctorProfiles,
    patientProfiles,
    isPatientViewLocked = false 
}) => {
    const [isPatientView, setIsPatientView] = useState(isPatientViewLocked);

    // This component is now controlled by parent state
    const activeProfile = isPatientViewLocked 
        ? (activeWallet ? patientProfiles[activeWallet.toLowerCase()] : null)
        : (isPatientView ? (activeWallet ? patientProfiles[activeWallet.toLowerCase()] : null) : (activeWallet ? doctorProfiles[activeWallet.toLowerCase()] : null));

    const filteredLogs = (consultations || [])
        .filter(log => {
            if (!activeWallet) return false;
            const activeWalletLower = activeWallet.toLowerCase();
            if (isPatientView || isPatientViewLocked) {
                // Patient ID is stored in lowercase in DB
                return log.patientId === activeWalletLower;
            }
            // Doctor wallet is stored in lowercase in DB
            return log.doctorWallet === activeWalletLower;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const getCardDescription = () => {
        if (isPatientViewLocked) {
            return "Viewing records where you are the patient.";
        }
        return isPatientView ? "Viewing records where you are the patient." : "Viewing records you created as a doctor.";
    }
    
    const getNoLogsMessage = () => {
        let baseMessage = isPatientView || isPatientViewLocked ? "There are no consultation records for your wallet address." : "You haven't created any consultations yet.";
        if (!activeWallet) {
            baseMessage += " Connect your wallet in the Profile tab to see your logs.";
        }
        return baseMessage;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline">Consultation Logs</CardTitle>
                        <CardDescription>{getCardDescription()}</CardDescription>
                    </div>
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
