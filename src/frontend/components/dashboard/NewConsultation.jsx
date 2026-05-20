
'use client';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Label } from '@/frontend/components/ui/label';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Button } from '@/frontend/components/ui/button';
import { useToast } from "@/frontend/hooks/use-toast";
import { encryptData } from '@/backend/lib/crypto';
import { logToBlockchain, createHash } from '@/frontend/lib/blockchain';
import { generateEprescription } from '@/backend/ai/flows/generate-eprescription';
import { checkForMedicationConflicts } from '@/backend/ai/flows/medication-conflict';
import { Sparkles, Save, Loader2, PlusCircle, Trash2, AlertCircle, AlertTriangle, User, HeartHandshake } from 'lucide-react';
import { addConsultation } from '@/backend/services/mongodb';
import { createCampaignOnChain } from '@/frontend/services/blockchain';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/frontend/components/ui/dialog';

const FundraiserDialog = ({ patientId, doctorId, consultationId, onCampaignCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

    const handleCreateCampaign = async () => {
        if (!title || !description || !goalAmount) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields.'});
            return;
        }
        setIsCreating(true);
        try {
            await createCampaignOnChain({
                beneficiary: patientId,
                goalAmount: parseFloat(goalAmount),
                title,
                description,
                creator: doctorId,
                requestId: consultationId, // Using consultationId as a link
            });
            toast({ title: 'Campaign Created', description: 'The fundraiser is now being created on the blockchain.'});
            onCampaignCreated();
        } catch (error) {
            console.error('Failed to create campaign', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create the campaign.'});
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Start a New Fundraiser</DialogTitle>
                <DialogDescription>Create a public campaign for this patient's treatment costs. This will be visible to everyone.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="title">Campaign Title</Label>
                    <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Urgent Surgery for John D." />
                </div>
                 <div>
                    <Label htmlFor="description">Patient's Story</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly explain the patient's situation and why funds are needed." />
                </div>
                 <div>
                    <Label htmlFor="goalAmount">Goal Amount (in APT)</Label>
                    <Input id="goalAmount" type="number" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} placeholder="e.g., 500" />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleCreateCampaign} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 animate-spin"/> : <HeartHandshake className="mr-2"/>}
                    Create Campaign
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

const NewConsultation = ({ consultations, setConsultations, activeWallet, setActiveTab, refreshData, doctorProfiles, patientProfiles }) => {
    const [patientId, setPatientId] = useState('');
    const [selectedDependent, setSelectedDependent] = useState('self'); // 'self' or dependent's id
    const [medications, setMedications] = useState([{ id: uuidv4(), name: '', dosage: '', frequency: '', notes: '' }]);
    const [prescriptionText, setPrescriptionText] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const [lastSavedConsultationId, setLastSavedConsultationId] = useState(null);
    const { toast } = useToast();

    const doctorProfile = activeWallet ? doctorProfiles[activeWallet.toLowerCase()] : {};
    const currentPatientProfile = patientId ? patientProfiles[patientId.toLowerCase()] : null;
    const dependents = currentPatientProfile?.dependents || [];

    useEffect(() => {
        setSelectedDependent('self'); // Reset when patientId changes
    }, [patientId]);

    const handleAddMedication = () => {
        setMedications([...medications, { id: uuidv4(), name: '', dosage: '', frequency: '', notes: '' }]);
    };

    const handleRemoveMedication = (id) => {
        setMedications(medications.filter(med => med.id !== id));
    };

    const handleMedicationChange = (id, field, value) => {
        setMedications(medications.map(med => med.id === id ? { ...med, [field]: value } : med));
    };

    useEffect(() => {
        const checkConflicts = async () => {
            if (!patientId || medications.some(m => !m.name)) {
                setConflicts([]);
                return;
            };

            const patientConsultations = (consultations || []).filter(
                c => c.patientId.toLowerCase() === patientId.toLowerCase()
            );

            const history = patientConsultations.map(c => {
                 try {
                    const decrypted = decryptData(c.encryptedSummary);
                    // This is a simplified assumption. A more robust solution would parse the text.
                    // For now, we'll send the whole summary.
                    return { timestamp: c.timestamp, medications: [{name: decrypted.substring(0,100)}] };
                 } catch {
                     return { timestamp: c.timestamp, medications: [] };
                 }
            });
            
            const newMedicationsForCheck = medications.filter(m => m.name).map(({name, dosage, frequency}) => ({name, dosage, frequency}));
            if (newMedicationsForCheck.length === 0) return;

            const result = await checkForMedicationConflicts({
                newMedications: newMedicationsForCheck,
                consultationHistory: history
            });

            setConflicts(result.conflicts || []);
        };

        const debounceTimeout = setTimeout(() => {
            checkConflicts();
        }, 1000); // 1-second debounce

        return () => clearTimeout(debounceTimeout);

    }, [patientId, medications, consultations]);
    
    const handleGeneratePrescription = async () => {
        if (!patientId) {
            toast({ variant: "destructive", title: "Error", description: "Please enter a Patient Wallet / UID." });
            return;
        }
        if (medications.some(m => !m.name || !m.dosage || !m.frequency)) {
            toast({ variant: "destructive", title: "Error", description: "Please fill in at least Name, Dosage, and Frequency for all medications." });
            return;
        }
        setIsLoadingAI(true);
        try {
            const input = {
                patientId,
                doctorName: doctorProfile?.name || 'N/A',
                doctorWallet: activeWallet,
                doctorSpecialization: doctorProfile?.specialization,
                doctorLicenseId: doctorProfile?.licenseId,
                consultationDate: new Date().toISOString(),
                medications: medications.map(({id, ...rest}) => rest), // remove client-side id
            }
            const result = await generateEprescription(input);
            if (result.prescriptionText) {
                setPrescriptionText(result.prescriptionText);
                toast({ title: "e-Prescription Generated", description: "The AI-formatted prescription has been populated below for your review." });
            } else {
                 throw new Error("AI did not return a prescription text.");
            }
        } catch (error) {
            console.error("AI prescription generation failed:", error);
            toast({ variant: "destructive", title: "AI Error", description: "Could not generate prescription. Please try again." });
        } finally {
            setIsLoadingAI(false);
        }
    };
    
    const generatePdf = () => {
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("MediChain e-Prescription", 105, 20, null, null, 'center');
        
        const targetPatient = selectedDependent === 'self' 
            ? {name: currentPatientProfile?.name, id: patientId} 
            : dependents.find(d => d.id === selectedDependent);

        autoTable(doc, {
            startY: 30,
            head: [['', '']],
            body: [
                ['Doctor', `Dr. ${doctorProfile?.name || 'N/A'}`],
                ['License ID', doctorProfile?.licenseId || 'N/A'],
                ['Patient', `${targetPatient.name} (Account: ${patientId.substring(0,8)}...)`],
                ['Date', new Date().toLocaleDateString()],
            ],
            theme: 'striped',
            styles: { fontSize: 12 },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [255, 255, 255]
            },
        });
        
        const medicationData = medications.map(m => [m.name, m.dosage, m.frequency, m.notes]);
        
        autoTable(doc, {
            startY: (doc.lastAutoTable?.finalY || 30) + 10,
            head: [['Medication', 'Dosage', 'Frequency', 'Notes']],
            body: medicationData,
            theme: 'grid',
        });
        
        // Add prescription description section
        const finalY = doc.lastAutoTable?.finalY || 30;
        const startY = finalY + 15;
        
        // Prescription Description Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Doctor's Prescription Description:", 20, startY);
        
        // Prescription Description Content
        if (prescriptionText && prescriptionText.trim()) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            
            // Split prescription text into lines that fit the page width
            const maxWidth = 170; // Page width minus margins
            const lines = doc.splitTextToSize(prescriptionText, maxWidth);
            
            // Add prescription text with proper spacing
            doc.text(lines, 20, startY + 10);
            
            // Update final Y position for disclaimer
            const prescriptionEndY = startY + 10 + (lines.length * 5);
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text("This is a digitally generated prescription valid only on the MediChain platform.", 105, prescriptionEndY + 15, null, null, 'center');
        } else {
            // If no prescription text, add placeholder and disclaimer
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text("No prescription description provided.", 20, startY + 10);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.text("This is a digitally generated prescription valid only on the MediChain platform.", 105, startY + 25, null, null, 'center');
        }
        
        return doc.output('datauristring');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!patientId || !prescriptionText) {
            toast({ variant: "destructive", title: "Error", description: "Patient UID and a generated Prescription Text are required." });
            return;
        }
        if (!activeWallet) {
             toast({ variant: "destructive", title: "Error", description: "Please connect your wallet in the Profile tab first." });
            return;
        }
        setIsSaving(true);
        const newConsultationId = uuidv4();
        
        try {
            // Generate PDF from state
            const pdfDataUri = generatePdf();
            
            const encryptedSummary = encryptData(prescriptionText);
            const summaryHash = await createHash(prescriptionText);
            const patientHash = await createHash(patientId);

            const consultationFor = selectedDependent === 'self' 
                ? { id: patientId.toLowerCase(), name: currentPatientProfile?.name || 'Self' }
                : dependents.find(d => d.id === selectedDependent);

            // 1. Log to the blockchain
            const tx = await logToBlockchain({ summaryHash, doctorWallet: activeWallet, patientHash });

            // 2. Prepare data for the database
            const newConsultation = {
                id: newConsultationId,
                patientId: patientId.toLowerCase(),
                consultationFor,
                doctorWallet: activeWallet.toLowerCase(),
                timestamp: new Date().toISOString(),
                encryptedSummary,
                summaryHash,
                txHash: tx.txHash,
                pdfDataUri,
                pdfFileName: `e-prescription-${patientId.substring(0,6)}-${new Date().toISOString().split('T')[0]}.pdf`,
                medications: medications.map(({id, ...rest}) => rest),
            };

            // 3. Save to the database
            await addConsultation(newConsultation);

            toast({
                title: "Prescription Saved",
                description: "The record has been encrypted and saved to the blockchain.",
            });
            
            setLastSavedConsultationId(newConsultationId); // Store ID for fundraiser

            // 4. Refresh data from source to ensure sync
            await refreshData();
            
            // DON'T reset form, allow for fundraiser creation

        } catch (error) {
            console.error("Failed to save prescription:", error);
            toast({ variant: "destructive", title: "Save Error", description: error.message || "Could not save the prescription." });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!doctorProfile?.name || !doctorProfile?.licenseId) {
        return (
             <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="font-headline text-destructive flex items-center gap-2"><AlertCircle /> Complete Your Profile</CardTitle>
                    <CardDescription>
                        To issue e-prescriptions, your full name and medical license ID must be filled out in your profile. This information is required for the prescription document.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setActiveTab('profile')}>Go to Profile</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">New e-Prescription</CardTitle>
                        <CardDescription>Fill in patient and medication details. After saving, you can initiate a fundraiser if needed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="patientId">Patient Account Wallet</Label>
                                <Input id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="0x...PatientWalletAddress" required disabled={isSaving || lastSavedConsultationId} />
                            </div>
                             {dependents.length > 0 && (
                                <div>
                                    <Label htmlFor="consultationFor">Consultation For</Label>
                                    <Select value={selectedDependent} onValueChange={setSelectedDependent} disabled={isSaving || lastSavedConsultationId}>
                                        <SelectTrigger id="consultationFor">
                                            <SelectValue placeholder="Select patient..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="self">{currentPatientProfile?.name || 'Self'} (Primary)</SelectItem>
                                            {dependents.map(dep => (
                                                <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <Label>Medications</Label>
                             {conflicts.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Potential Medication Conflict Detected!</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc pl-5">
                                            {conflicts.map((conflict, index) => (
                                                <li key={index}>
                                                    <strong>{conflict.medicationA} & {conflict.medicationB}:</strong> {conflict.description}
                                                </li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {medications.map((med, index) => (
                                <div key={med.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end p-3 border rounded-lg">
                                    <div className="md:col-span-3 space-y-1">
                                        <Label htmlFor={`medName-${med.id}`} className="text-xs">Name</Label>
                                        <Input id={`medName-${med.id}`} value={med.name} onChange={e => handleMedicationChange(med.id, 'name', e.target.value)} placeholder="e.g., Paracetamol" required disabled={isSaving || lastSavedConsultationId} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor={`medDosage-${med.id}`} className="text-xs">Dosage</Label>
                                        <Input id={`medDosage-${med.id}`} value={med.dosage} onChange={e => handleMedicationChange(med.id, 'dosage', e.target.value)} placeholder="e.g., 500mg" required disabled={isSaving || lastSavedConsultationId} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor={`medFreq-${med.id}`} className="text-xs">Frequency</Label>
                                        <Input id={`medFreq-${med.id}`} value={med.frequency} onChange={e => handleMedicationChange(med.id, 'frequency', e.target.value)} placeholder="e.g., Twice a day" required disabled={isSaving || lastSavedConsultationId} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor={`medNotes-${med.id}`} className="text-xs">Notes</Label>
                                        <Input id={`medNotes-${med.id}`} value={med.notes} onChange={e => handleMedicationChange(med.id, 'notes', e.target.value)} placeholder="e.g., After meals" disabled={isSaving || lastSavedConsultationId} />
                                    </div>
                                    <div className="md:col-span-1">
                                         <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveMedication(med.id)} disabled={medications.length <= 1 || isSaving || lastSavedConsultationId}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={handleAddMedication} disabled={isSaving || lastSavedConsultationId}><PlusCircle className="mr-2 h-4 w-4" />Add Medication</Button>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                             <Label htmlFor="prescriptionText">e-Prescription Preview</Label>
                             <Button type="button" size="sm" variant="outline" onClick={handleGeneratePrescription} disabled={isLoadingAI || isSaving || lastSavedConsultationId}>
                                {isLoadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate & Preview
                             </Button>
                           </div>
                            <Textarea 
                                id="prescriptionText" 
                                value={prescriptionText} 
                                onChange={(e) => setPrescriptionText(e.target.value)}
                                placeholder="AI-generated prescription will appear here for your review and final approval."
                                rows={10}
                                required
                                disabled={isSaving || lastSavedConsultationId}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0 justify-between">
                         <Dialog>
                            <DialogTrigger asChild>
                                 <Button type="button" variant="secondary" disabled={!lastSavedConsultationId}>
                                    <HeartHandshake className="mr-2 h-4 w-4" /> Start Fundraiser
                                </Button>
                            </DialogTrigger>
                           {lastSavedConsultationId && (
                             <FundraiserDialog 
                                patientId={patientId}
                                doctorId={activeWallet}
                                consultationId={lastSavedConsultationId}
                                onCampaignCreated={() => {
                                    // Reset everything and go to logs
                                    setPatientId('');
                                    setMedications([{ id: uuidv4(), name: '', dosage: '', frequency: '', notes: '' }]);
                                    setPrescriptionText('');
                                    setLastSavedConsultationId(null);
                                    setActiveTab('logs');
                                }}
                             />
                           )}
                        </Dialog>
                        <Button type="submit" disabled={isSaving || !prescriptionText || lastSavedConsultationId}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {lastSavedConsultationId ? 'Saved' : 'Sign & Save Prescription'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default NewConsultation;

