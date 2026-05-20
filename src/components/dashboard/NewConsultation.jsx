'use client';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { encryptData } from '@/lib/crypto';
import { logToBlockchain, createHash } from '@/lib/blockchain';
import { generateEprescription } from '@/ai/flows/generate-eprescription';
import { Sparkles, Save, Loader2, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { addConsultation } from '@/services/mongodb';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const NewConsultation = ({ consultations, setConsultations, activeWallet, setActiveTab, refreshData, doctorProfiles }) => {
    const [patientId, setPatientId] = useState('');
    const [medications, setMedications] = useState([{ id: uuidv4(), name: '', dosage: '', frequency: '', notes: '' }]);
    const [prescriptionText, setPrescriptionText] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const doctorProfile = activeWallet ? doctorProfiles[activeWallet.toLowerCase()] : {};

    const handleAddMedication = () => {
        setMedications([...medications, { id: uuidv4(), name: '', dosage: '', frequency: '', notes: '' }]);
    };

    const handleRemoveMedication = (id) => {
        setMedications(medications.filter(med => med.id !== id));
    };

    const handleMedicationChange = (id, field, value) => {
        setMedications(medications.map(med => med.id === id ? { ...med, [field]: value } : med));
    };
    
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
        
        doc.autoTable({
            startY: 30,
            head: [['', '']],
            body: [
                ['Doctor', `Dr. ${doctorProfile?.name || 'N/A'}`],
                ['License ID', doctorProfile?.licenseId || 'N/A'],
                ['Patient ID', patientId],
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
        
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Medication', 'Dosage', 'Frequency', 'Notes']],
            body: medicationData,
            theme: 'grid',
        });
        
        // Add prescription description section
        const finalY = doc.autoTable.previous.finalY;
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
        
        try {
            // Generate PDF from state
            const pdfDataUri = generatePdf();
            
            const encryptedSummary = encryptData(prescriptionText);
            const summaryHash = await createHash(prescriptionText);
            const patientHash = await createHash(patientId);

            // 1. Log to the blockchain
            const tx = await logToBlockchain({ summaryHash, doctorWallet: activeWallet, patientHash });

            // 2. Prepare data for the database
            const newConsultation = {
                id: uuidv4(),
                patientId: patientId.toLowerCase(),
                doctorWallet: activeWallet.toLowerCase(),
                timestamp: new Date().toISOString(),
                encryptedSummary,
                summaryHash,
                txHash: tx.txHash,
                pdfDataUri,
                pdfFileName: `e-prescription-${patientId.substring(0,6)}-${new Date().toISOString().split('T')[0]}.pdf`,
            };

            // 3. Save to the database
            await addConsultation(newConsultation);

            // 4. Optimistically update local state for immediate UI feedback
            setConsultations([...consultations, newConsultation]);

            toast({
                title: "Prescription Saved",
                description: "The record has been encrypted, saved, and anchored to the blockchain.",
            });

            // 5. Refresh data from source to ensure sync
            await refreshData();

            // Reset form and switch to logs tab
            setPatientId('');
            setMedications([{ id: uuidv4(), name: '', dosage: '', frequency: '', notes: '' }]);
            setPrescriptionText('');
            setActiveTab('logs');

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
                        <CardDescription>Fill in the patient and medication details below. The generated prescription will be saved as an encrypted PDF.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="patientId">Patient Wallet / UID</Label>
                            <Input id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="0x...PatientWalletAddress" required />
                        </div>
                        
                        <div className="space-y-4">
                            <Label>Medications</Label>
                            {medications.map((med, index) => (
                                <div key={med.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end p-3 border rounded-lg">
                                    <div className="md:col-span-3 space-y-1">
                                        <Label htmlFor={`medName-${med.id}`} className="text-xs">Name</Label>
                                        <Input id={`medName-${med.id}`} value={med.name} onChange={e => handleMedicationChange(med.id, 'name', e.target.value)} placeholder="e.g., Paracetamol" required />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor={`medDosage-${med.id}`} className="text-xs">Dosage</Label>
                                        <Input id={`medDosage-${med.id}`} value={med.dosage} onChange={e => handleMedicationChange(med.id, 'dosage', e.target.value)} placeholder="e.g., 500mg" required />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor={`medFreq-${med.id}`} className="text-xs">Frequency</Label>
                                        <Input id={`medFreq-${med.id}`} value={med.frequency} onChange={e => handleMedicationChange(med.id, 'frequency', e.target.value)} placeholder="e.g., Twice a day" required />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label htmlFor={`medNotes-${med.id}`} className="text-xs">Notes</Label>
                                        <Input id={`medNotes-${med.id}`} value={med.notes} onChange={e => handleMedicationChange(med.id, 'notes', e.target.value)} placeholder="e.g., After meals" />
                                    </div>
                                    <div className="md:col-span-1">
                                         <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveMedication(med.id)} disabled={medications.length <= 1}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={handleAddMedication}><PlusCircle className="mr-2 h-4 w-4" />Add Medication</Button>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                             <Label htmlFor="prescriptionText">e-Prescription Preview</Label>
                             <Button type="button" size="sm" variant="outline" onClick={handleGeneratePrescription} disabled={isLoadingAI}>
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
                            />
                        </div>

                        <CardFooter className="p-0 justify-end">
                            <Button type="submit" disabled={isSaving || !prescriptionText}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Sign & Save Prescription
                            </Button>
                        </CardFooter>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
};

export default NewConsultation;
