
'use client';
import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Textarea } from '@/frontend/components/ui/textarea';
import { useToast } from "@/frontend/hooks/use-toast";
import { generateEmergencyCode, getActiveEmergencyCode, revokeEmergencyCode, getPatientProfile, updatePatientProfile } from '@/backend/services/mongodb';
import { encryptData, decryptData } from '@/backend/lib/crypto';
import { Loader2, UploadCloud, FileText, Trash2, KeyRound, Copy, RefreshCw, ShieldOff, Download, ShieldPlus, Eye, Search, Shield, Upload, QrCode, ExternalLink, Link as LinkIcon, ClipboardList, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Badge } from '@/frontend/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/frontend/components/ui/tooltip';
// import { grantConsent, revokeConsent } from '@/frontend/lib/blockchain';
import { v4 as uuidv4 } from 'uuid';
// import { ethers } from 'ethers';

const fileToDataUri = (file) => new Promise((resolve, reject) => {
    if (!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

// Roughly estimate data URI size in bytes
const estimateBytesFromDataUri = (dataUri) => {
    if (!dataUri || typeof dataUri !== 'string') return 0;
    const base64 = dataUri.split(',')[1] || '';
    // 4 base64 chars ~ 3 bytes
    return Math.floor((base64.length * 3) / 4);
}

const normalizeEmergencySummary = (summary = {}) => ({
    bloodGroup: summary.bloodGroup || '',
    allergies: summary.allergies || '',
    activeMedicines: summary.activeMedicines || '',
    conditions: summary.conditions || '',
    emergencyContact: summary.emergencyContact || '',
    notes: summary.notes || '',
});

const getEmergencyValue = (value, fallback = 'Not provided') => {
    const normalizedValue = String(value || '').trim();
    return normalizedValue || fallback;
};

const wrapCanvasText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxWidth || !currentLine) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    });

    if (currentLine) lines.push(currentLine);
    const visibleLines = lines.slice(0, maxLines);

    visibleLines.forEach((line, index) => {
        const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : '';
        ctx.fillText(`${line}${suffix}`, x, y + index * lineHeight);
    });

    return y + visibleLines.length * lineHeight;
};

const extractDataUriText = (dataUri) => {
    if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return '';
    const [meta = '', payload = ''] = dataUri.split(',');
    const mime = meta.slice(5).split(';')[0].toLowerCase();
    const isTextLike =
        mime.startsWith('text/') ||
        ['application/json', 'application/xml', 'application/csv'].includes(mime);

    if (!isTextLike || !payload) return '';

    try {
        const decoded = meta.includes(';base64')
            ? atob(payload)
            : decodeURIComponent(payload);
        return decoded.slice(0, 12000);
    } catch (_) {
        return '';
    }
};

const dataUriToUint8Array = (dataUri) => {
    const payload = dataUri.split(',')[1] || '';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
};

const getMimeFromDataUri = (dataUri) => {
    if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return '';
    return (dataUri.split(',')[0] || '').slice(5).split(';')[0].toLowerCase();
};

const extractPdfText = async (dataUri) => {
    const pdfjsLib = await import('pdfjs-dist');
    const task = pdfjsLib.getDocument({
        data: dataUriToUint8Array(dataUri),
        disableWorker: true,
    });
    const pdf = await task.promise;
    const pageLimit = Math.min(pdf.numPages, 8);
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const text = textContent.items
            .map((item) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (text) pageTexts.push(text);
    }

    return pageTexts.join('\n').slice(0, 20000);
};

const extractImageText = async (dataUri) => {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
        const result = await worker.recognize(dataUri);
        return (result?.data?.text || '').replace(/\s+/g, ' ').trim().slice(0, 12000);
    } finally {
        await worker.terminate();
    }
};

const extractDocumentText = async (dataUri) => {
    const directText = extractDataUriText(dataUri);
    if (directText) {
        return { text: directText, method: 'text file' };
    }

    const mime = getMimeFromDataUri(dataUri);
    if (mime === 'application/pdf') {
        const text = await extractPdfText(dataUri);
        return { text, method: text ? 'pdf text extraction' : 'pdf metadata only' };
    }

    if (mime.startsWith('image/')) {
        const text = await extractImageText(dataUri);
        return { text, method: text ? 'image OCR' : 'image metadata only' };
    }

    return { text: '', method: 'metadata only' };
};

const riskRules = [
    {
        label: 'Blood sugar and metabolic risk',
        terms: ['diabetes', 'metformin', 'insulin', 'glucose', 'hba1c', 'sugar'],
        possibleRisks: ['hypoglycemia or hyperglycemia episodes', 'kidney, eye, foot, and cardiovascular complications if uncontrolled'],
        nextStep: 'Keep recent HbA1c/glucose reports in the vault and review sugar control with a doctor.',
    },
    {
        label: 'Cardiovascular risk',
        terms: ['hypertension', 'high bp', 'blood pressure', 'amlodipine', 'telmisartan', 'losartan', 'cholesterol', 'statin', 'cardiac', 'heart'],
        possibleRisks: ['heart disease or stroke risk if blood pressure/lipids are uncontrolled'],
        nextStep: 'Track BP readings and keep lipid profile/cardiac reports updated.',
    },
    {
        label: 'Respiratory flare risk',
        terms: ['asthma', 'copd', 'inhaler', 'wheezing', 'breathless', 'shortness of breath', 'nebulizer'],
        possibleRisks: ['asthma/COPD exacerbation or emergency breathing episodes'],
        nextStep: 'Keep inhaler names, triggers, and latest pulmonary notes easy to access.',
    },
    {
        label: 'Medication allergy or reaction risk',
        terms: ['allergy', 'allergic', 'penicillin', 'sulfa', 'latex', 'anaphylaxis', 'rash after medicine'],
        possibleRisks: ['drug reaction or anaphylaxis risk during emergency treatment'],
        nextStep: 'Make allergy list emergency-visible and confirm exact allergy names with a clinician.',
    },
    {
        label: 'Bleeding risk',
        terms: ['warfarin', 'heparin', 'apixaban', 'rivaroxaban', 'clopidogrel', 'aspirin', 'blood thinner', 'anticoagulant'],
        possibleRisks: ['higher bleeding risk after injury, surgery, dental procedures, or medication interactions'],
        nextStep: 'Keep blood thinner dose and indication clearly listed for emergency staff.',
    },
    {
        label: 'Kidney-related medication risk',
        terms: ['kidney', 'renal', 'creatinine', 'ckd', 'dialysis', 'urea'],
        possibleRisks: ['medicine dose adjustment needs and fluid/electrolyte complications'],
        nextStep: 'Keep recent kidney function reports and diagnosis notes in the vault.',
    },
    {
        label: 'Liver-related medication risk',
        terms: ['liver', 'sgpt', 'sgot', 'bilirubin', 'hepatitis', 'cirrhosis'],
        possibleRisks: ['medicine safety concerns and bleeding/infection complications depending on severity'],
        nextStep: 'Review liver reports with a doctor before adding new medicines.',
    },
    {
        label: 'Infection or immune risk',
        terms: ['steroid', 'prednisone', 'immunosuppress', 'chemotherapy', 'hiv', 'tb', 'infection', 'fever'],
        possibleRisks: ['higher infection risk or need for urgent assessment when fever occurs'],
        nextStep: 'Keep immune-related diagnoses and current medicines updated.',
    },
    {
        label: 'Anemia or deficiency risk',
        terms: ['anemia', 'haemoglobin', 'hemoglobin', 'hb low', 'b12', 'iron deficiency', 'ferritin'],
        possibleRisks: ['fatigue, dizziness, breathlessness, or worsening symptoms if untreated'],
        nextStep: 'Keep CBC/iron/B12 reports in the vault and discuss recurrent low values with a clinician.',
    },
    {
        label: 'Pregnancy-sensitive care risk',
        terms: ['pregnant', 'pregnancy', 'trimester', 'antenatal'],
        possibleRisks: ['medicine restrictions and emergency-care considerations during pregnancy'],
        nextStep: 'Keep pregnancy records and current gestational age visible for emergency care.',
    },
];

const normalizeRiskText = (value) => String(value || '').toLowerCase();

const getReadableDocumentContext = (doc, extractedText = '') => [
    doc.name,
    doc.category,
    doc.fileType,
    doc.emergencyVisible ? 'emergency visible' : '',
    extractedText,
].filter(Boolean).join('\n');

const buildVaultRiskReport = (summary, docsWithContext) => {
    const summaryText = [
        summary.bloodGroup,
        summary.allergies,
        summary.activeMedicines,
        summary.conditions,
        summary.notes,
    ].filter(Boolean).join('\n');

    const documentText = docsWithContext.map((doc) => doc.context).join('\n');
    const combinedText = normalizeRiskText(`${summaryText}\n${documentText}`);

    const matchedRisks = riskRules
        .map((rule) => {
            const matchedTerms = rule.terms.filter((term) => combinedText.includes(term));
            if (matchedTerms.length === 0) return null;

            const evidence = docsWithContext
                .filter((doc) => matchedTerms.some((term) => normalizeRiskText(doc.context).includes(term)))
                .map((doc) => ({
                    document: doc.name,
                    category: doc.category || 'Other',
                    method: doc.extractionMethod || 'metadata only',
                }))
                .slice(0, 4);

            const summaryEvidence = matchedTerms.filter((term) => normalizeRiskText(summaryText).includes(term));

            return { ...rule, matchedTerms, evidence, summaryEvidence };
        })
        .filter(Boolean);

    const categoryCounts = docsWithContext.reduce((acc, doc) => {
        const key = doc.category || 'Other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const missingEmergencyItems = [
        !summary.bloodGroup && 'blood group',
        !summary.allergies && 'allergies',
        !summary.activeMedicines && 'active medicines',
        !summary.conditions && 'known conditions',
        !summary.emergencyContact && 'emergency contact',
    ].filter(Boolean);

    const hasEmergencyDoc = docsWithContext.some((doc) => doc.emergencyVisible);
    const hasLabReport = docsWithContext.some((doc) => (doc.category || '').toLowerCase() === 'lab report');
    const hasPrescription = docsWithContext.some((doc) => (doc.category || '').toLowerCase() === 'prescription');

    const preparednessGaps = [
        ...missingEmergencyItems.map((item) => `Missing ${item} in emergency summary.`),
        !hasEmergencyDoc && 'No uploaded document is marked visible for emergency access.',
        !hasLabReport && 'No lab report document found; disease-risk signals from lab values may be incomplete.',
        !hasPrescription && 'No prescription document found; medication-risk review may be incomplete.',
    ].filter(Boolean);

    return {
        generatedAt: new Date().toISOString(),
        summary,
        documentCount: docsWithContext.length,
        textReadableCount: docsWithContext.filter((doc) => doc.readText).length,
        nonTextCount: docsWithContext.filter((doc) => !doc.readText).length,
        ocrCount: docsWithContext.filter((doc) => doc.extractionMethod === 'image OCR').length,
        pdfTextCount: docsWithContext.filter((doc) => doc.extractionMethod === 'pdf text extraction').length,
        categoryCounts,
        matchedRisks,
        preparednessGaps,
        sourceDocuments: docsWithContext.map((doc) => ({
            name: doc.name,
            category: doc.category || 'Other',
            readText: doc.readText,
            extractionMethod: doc.extractionMethod || 'metadata only',
            emergencyVisible: doc.emergencyVisible,
        })),
    };
};

const formatReportDate = (date) => date ? new Date(date).toLocaleString() : 'N/A';

const VaultRiskReport = ({ report, onDownload }) => {
    if (!report) return null;

    return (
        <div className="rounded-lg border bg-background p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Emergency Vault Risk Report
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Generated from emergency summary and {report.documentCount} uploaded document(s). Text was readable from {report.textReadableCount} file(s), including {report.pdfTextCount} PDF extraction(s) and {report.ocrCount} OCR image(s).
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>This is not a diagnosis and does not calculate real disease probability. It highlights possible associated risks from available vault details for doctor review.</p>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Possible Risk Areas</p>
                    <p className="text-2xl font-semibold">{report.matchedRisks.length}</p>
                </div>
                <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Emergency Gaps</p>
                    <p className="text-2xl font-semibold">{report.preparednessGaps.length}</p>
                </div>
                <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Non-text Files</p>
                    <p className="text-2xl font-semibold">{report.nonTextCount}</p>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-primary" />
                    Possible Associated Risks
                </h4>
                {report.matchedRisks.length > 0 ? report.matchedRisks.map((risk) => (
                    <div key={risk.label} className="rounded-md border p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-medium">{risk.label}</p>
                            <p className="text-xs text-muted-foreground">Signals: {risk.matchedTerms.join(', ')}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Could be related to: {risk.possibleRisks.join('; ')}.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Reason: this was suggested because {risk.summaryEvidence.length > 0 ? `the emergency summary mentions ${risk.summaryEvidence.join(', ')}` : 'matching terms were found in uploaded vault documents'}.
                        </p>
                        <p className="mt-1 text-sm">{risk.nextStep}</p>
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground">No predefined risk patterns were detected from the available emergency summary and readable document text.</p>
                )}
            </div>

            {report.preparednessGaps.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Emergency Readiness Gaps</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {report.preparednessGaps.map((gap) => <li key={gap}>{gap}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <div>
                    <h4 className="text-sm font-semibold">Record Coverage</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {Object.entries(report.categoryCounts).length > 0
                            ? Object.entries(report.categoryCounts).map(([category, count]) => `${category} (${count})`).join(', ')
                            : 'No documents found.'}
                    </p>
                </div>
                <div>
                    <h4 className="text-sm font-semibold">Extraction Limitation</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Scanned PDFs may still need image OCR; blurry photos or handwritten text can reduce extraction accuracy.
                    </p>
                </div>
            </div>
        </div>
    );
};

const EmergencyVault = ({ activeWallet, setActiveTab }) => {
    const [profile, setProfile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [activeCode, setActiveCode] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [isSavingSummary, setIsSavingSummary] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [emergencySummary, setEmergencySummary] = useState(normalizeEmergencySummary());
    const [emergencyAccessUrl, setEmergencyAccessUrl] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    // Consent UI moved to dedicated tab
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [corruptedDocuments, setCorruptedDocuments] = useState([]);
    const [riskReport, setRiskReport] = useState(null);
    const [isGeneratingRiskReport, setIsGeneratingRiskReport] = useState(false);

    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!activeWallet) return;
        setIsLoading(true);
        try {
            const [profileData, codeData] = await Promise.all([
                getPatientProfile(activeWallet),
                getActiveEmergencyCode(activeWallet)
            ]);
            setProfile(profileData);
            setEmergencySummary(normalizeEmergencySummary(profileData?.emergencySummary));
            const docs = profileData?.healthDocuments || [];
            setDocuments(docs);
            setActiveCode(codeData);
            setRiskReport(null);

            // Check for corrupted documents
            const corrupted = [];
            docs.forEach(doc => {
                try {
                    if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string' || doc.encryptedUri.trim() === '') {
                        corrupted.push({ ...doc, errorMessage: 'No encrypted data found for document' });
                    } else {
                        decryptData(doc.encryptedUri);
                    }
                } catch (error) {
                    corrupted.push({ ...doc, errorMessage: error.message });
                }
            });
            setCorruptedDocuments(corrupted);
        } catch (error) {
            console.error("Failed to fetch vault data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load your health vault.' });
        } finally {
            setIsLoading(false);
        }
    }, [activeWallet, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let isMounted = true;

        const buildQr = async () => {
            if (!activeCode?.code || typeof window === 'undefined') {
                setEmergencyAccessUrl('');
                setQrDataUrl('');
                return;
            }

            const accessUrl = `${window.location.origin}/emergency-access?code=${encodeURIComponent(activeCode.code)}`;
            setEmergencyAccessUrl(accessUrl);

            try {
                const dataUrl = await QRCode.toDataURL(accessUrl, {
                    width: 280,
                    margin: 2,
                    errorCorrectionLevel: 'M',
                });
                if (isMounted) setQrDataUrl(dataUrl);
            } catch (error) {
                console.error('Failed to generate emergency QR code:', error);
                if (isMounted) setQrDataUrl('');
            }
        };

        buildQr();

        return () => {
            isMounted = false;
        };
    }, [activeCode?.code]);

    const handleFileUpload = async (e, category, emergencyVisible) => {
        const file = e.target.files[0];
        if (!file || !category) return;

        setIsUploading(true);
        try {
            if (file.size > 5_000_000) { // 5MB limit
                throw new Error("File size should be less than 5MB.");
            }

            // Convert file to data URI
            const dataUri = await fileToDataUri(file);
            if (!dataUri || !dataUri.startsWith('data:')) {
                throw new Error("Failed to convert file to data URI");
            }

            // Encrypt the data URI
            const encryptedUri = encryptData(dataUri);
            if (!encryptedUri || typeof encryptedUri !== 'string') {
                throw new Error("Failed to encrypt file data");
            }

            // Validate encryption by trying to decrypt
            try {
                const testDecrypt = decryptData(encryptedUri);
                if (!testDecrypt) {
                    throw new Error("Encryption validation failed");
                }
            } catch (decryptError) {
                throw new Error("Encryption validation failed: " + decryptError.message);
            }

            const newDocument = {
                id: uuidv4(),
                name: file.name,
                category,
                encryptedUri,
                uploadedAt: new Date().toISOString(),
                fileSize: file.size,
                fileType: file.type,
                emergencyVisible: Boolean(emergencyVisible)
            };

            const updatedDocuments = [...documents, newDocument];
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            setRiskReport(null);
            toast({ title: 'File Uploaded', description: `${file.name} has been securely uploaded and validated.` });
        } catch (error) {
            console.error("File upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };


    const handleRemoveDocument = async (docId) => {
        const updatedDocuments = documents.filter(doc => doc.id !== docId);
        try {
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            setRiskReport(null);
            toast({ title: 'Document Removed', description: 'The document has been removed from your vault.' });
        } catch (error) {
            console.error("Failed to remove document:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the document.' });
        }
    };

    const handleRemoveCorruptedDocument = async (docId) => {
        try {
            // Find the document
            const doc = documents.find(d => d.id === docId);
            if (!doc) return;

            // Try to decrypt it first to confirm it's corrupted
            try {
                if (doc.encryptedUri && typeof doc.encryptedUri === 'string') {
                    decryptData(doc.encryptedUri);
                    // If we get here, it's not corrupted, so don't remove it
                    toast({ variant: 'destructive', title: 'Document Not Corrupted', description: 'This document can be decrypted successfully.' });
                    return;
                }
            } catch (decryptError) {
                // Document is indeed corrupted, proceed with removal
                console.log('Confirmed corrupted document:', doc.name, decryptError.message);
            }

            // Remove the corrupted document
            const updatedDocuments = documents.filter(doc => doc.id !== docId);
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            setRiskReport(null);
            toast({ title: 'Corrupted Document Removed', description: `${doc.name} has been removed due to corruption.` });
        } catch (error) {
            console.error("Failed to remove corrupted document:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the corrupted document.' });
        }
    };

    const handleReuploadDocument = async (docId, newFile, category) => {
        try {
            if (newFile.size > 5_000_000) {
                toast({ variant: 'destructive', title: 'File Too Large', description: 'File size should be less than 5MB.' });
                return;
            }

            // Convert file to data URI
            const dataUri = await fileToDataUri(newFile);
            if (!dataUri || !dataUri.startsWith('data:')) {
                throw new Error("Failed to convert file to data URI");
            }

            // Encrypt the data URI
            const encryptedUri = encryptData(dataUri);
            if (!encryptedUri || typeof encryptedUri !== 'string') {
                throw new Error("Failed to encrypt file data");
            }

            // Validate encryption
            try {
                const testDecrypt = decryptData(encryptedUri);
                if (!testDecrypt) {
                    throw new Error("Encryption validation failed");
                }
            } catch (decryptError) {
                throw new Error("Encryption validation failed: " + decryptError.message);
            }

            // Update the document
            const updatedDocuments = documents.map(doc =>
                doc.id === docId
                    ? {
                        ...doc,
                        name: newFile.name,
                        encryptedUri,
                        uploadedAt: new Date().toISOString(),
                        fileSize: newFile.size,
                        fileType: newFile.type
                    }
                    : doc
            );

            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: updatedDocuments });
            setDocuments(updatedDocuments);
            setRiskReport(null);
            toast({ title: 'Document Fixed', description: `${newFile.name} has been successfully re-uploaded and encrypted.` });
        } catch (error) {
            console.error("Failed to re-upload document:", error);
            toast({ variant: 'destructive', title: 'Re-upload Failed', description: error.message });
        }
    };

    const handleViewDocument = (doc) => {
        try {
            if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string') {
                throw new Error('No encrypted data found for document');
            }

            const decrypted = decryptData(doc.encryptedUri);
            if (!decrypted || !decrypted.startsWith('data:')) {
                throw new Error('Unsupported file format or decryption failed');
            }
            const win = window.open();
            if (win) {
                win.document.write(`<iframe src="${decrypted}" style="width:100%;height:100%" frameborder="0"></iframe>`);
            }
        } catch (error) {
            console.error('Preview failed:', error);
            toast({ variant: 'destructive', title: 'Preview failed', description: 'Could not preview file. The file may be corrupted.' });
        }
    };

    const handleDownloadDocument = (doc) => {
        try {
            if (!doc.encryptedUri || typeof doc.encryptedUri !== 'string') {
                throw new Error('No encrypted data found for document');
            }

            const decrypted = decryptData(doc.encryptedUri);
            if (!decrypted) {
                throw new Error('Decryption failed');
            }

            const link = document.createElement('a');
            link.href = decrypted;
            link.download = doc.name || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            toast({ variant: 'destructive', title: 'Download failed', description: 'Could not download file. The file may be corrupted.' });
        }
    };

    const handleSaveEmergencySummary = async () => {
        setIsSavingSummary(true);
        try {
            const summary = normalizeEmergencySummary(emergencySummary);
            await updatePatientProfile(activeWallet, { ...profile, emergencySummary: summary });
            setProfile(prev => ({ ...(prev || {}), emergencySummary: summary }));
            setEmergencySummary(summary);
            setRiskReport(null);
            toast({ title: 'Emergency Summary Saved', description: 'Critical emergency information was updated.' });
        } catch (error) {
            console.error('Failed to save emergency summary:', error);
            toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update emergency information.' });
        } finally {
            setIsSavingSummary(false);
        }
    };

    const handleBackupVault = async () => {
        try {
            const payload = {
                wallet: activeWallet,
                exportedAt: new Date().toISOString(),
                documents,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `medichain-vault-${activeWallet?.slice(0, 6)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Backup failed', description: 'Could not export your vault' });
        }
    };

    const handleGenerateRiskReport = async () => {
        setIsGeneratingRiskReport(true);
        try {
            const docsWithContext = [];

            for (const doc of documents) {
                let decryptedUri = '';
                let extracted = { text: '', method: 'metadata only' };

                try {
                    decryptedUri = decryptData(doc.encryptedUri);
                    extracted = await extractDocumentText(decryptedUri);
                } catch (error) {
                    console.warn('Document text extraction failed:', doc.name, error);
                    decryptedUri = '';
                    extracted = { text: '', method: 'metadata only' };
                }

                docsWithContext.push({
                    id: doc.id,
                    name: doc.name || 'Untitled document',
                    category: doc.category || 'Other',
                    fileType: doc.fileType || '',
                    emergencyVisible: Boolean(doc.emergencyVisible),
                    context: getReadableDocumentContext(doc, extracted.text),
                    readText: Boolean(extracted.text.trim()),
                    extractionMethod: extracted.method,
                });
            }

            const report = buildVaultRiskReport(normalizeEmergencySummary(emergencySummary), docsWithContext);
            setRiskReport(report);
            toast({
                title: 'Risk Report Generated',
                description: 'The report was created from your emergency summary and uploaded vault documents.',
            });
        } catch (error) {
            console.error('Failed to generate vault risk report:', error);
            toast({ variant: 'destructive', title: 'Report failed', description: 'Could not generate the vault risk report.' });
        } finally {
            setIsGeneratingRiskReport(false);
        }
    };

    const handleDownloadRiskReport = () => {
        if (!riskReport) return;

        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const margin = 40;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const maxWidth = pageWidth - margin * 2;
        let y = 42;

        const addPageIfNeeded = (needed = 60) => {
            if (y + needed > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
        };

        const addHeading = (text) => {
            addPageIfNeeded(40);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(13);
            pdf.setTextColor(15, 23, 42);
            pdf.text(text, margin, y);
            y += 20;
        };

        const addParagraph = (text, options = {}) => {
            const fontSize = options.fontSize || 10;
            pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
            pdf.setFontSize(fontSize);
            pdf.setTextColor(options.color?.[0] ?? 51, options.color?.[1] ?? 65, options.color?.[2] ?? 85);
            const lines = pdf.splitTextToSize(String(text || ''), maxWidth);
            addPageIfNeeded(lines.length * (fontSize + 4) + 8);
            pdf.text(lines, margin, y);
            y += lines.length * (fontSize + 4) + 8;
        };

        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, 92, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text('MediChain Emergency Vault Risk Report', margin, 38);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Generated ${formatReportDate(riskReport.generatedAt)}`, margin, 60);
        pdf.text('Professional risk-awareness brief based on emergency vault details', margin, 76);
        y = 118;

        addParagraph(
            'This report is not a diagnosis and does not calculate real disease probability. It highlights possible associated risks from available emergency summary details, uploaded document text, PDF extraction, image OCR, and document metadata for doctor review.',
            { fontSize: 10, bold: true, color: [120, 53, 15] }
        );

        addHeading('Patient Emergency Summary');
        autoTable(pdf, {
            startY: y,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 6 },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            head: [['Field', 'Details']],
            body: [
                ['Blood group', getEmergencyValue(riskReport.summary.bloodGroup)],
                ['Allergies', getEmergencyValue(riskReport.summary.allergies)],
                ['Active medicines', getEmergencyValue(riskReport.summary.activeMedicines)],
                ['Known conditions', getEmergencyValue(riskReport.summary.conditions)],
                ['Emergency notes', getEmergencyValue(riskReport.summary.notes)],
            ],
            margin: { left: margin, right: margin },
        });
        y = (pdf.lastAutoTable?.finalY || y) + 24;

        addHeading('Assessment Overview');
        autoTable(pdf, {
            startY: y,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 6 },
            headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
            head: [['Metric', 'Value']],
            body: [
                ['Documents reviewed', String(riskReport.documentCount)],
                ['Readable text sources', String(riskReport.textReadableCount)],
                ['PDF text extractions', String(riskReport.pdfTextCount)],
                ['Image OCR extractions', String(riskReport.ocrCount)],
                ['Possible risk areas flagged', String(riskReport.matchedRisks.length)],
                ['Emergency readiness gaps', String(riskReport.preparednessGaps.length)],
            ],
            margin: { left: margin, right: margin },
        });
        y = (pdf.lastAutoTable?.finalY || y) + 24;

        addHeading('Clinical Risk Considerations');
        if (riskReport.matchedRisks.length === 0) {
            addParagraph('No predefined risk pattern was detected from the available vault details. This may mean the vault has limited structured information, not that risk is absent.');
        } else {
            riskReport.matchedRisks.forEach((risk, index) => {
                addPageIfNeeded(120);
                addParagraph(`${index + 1}. ${risk.label}`, { bold: true, fontSize: 11, color: [15, 23, 42] });
                addParagraph(`Evidence found: ${risk.matchedTerms.join(', ')}.`);
                const evidenceText = [
                    risk.summaryEvidence.length > 0 ? `Emergency summary mentions: ${risk.summaryEvidence.join(', ')}.` : '',
                    risk.evidence.length > 0 ? `Relevant vault records include: ${risk.evidence.map((item) => `${item.document} (${item.category}, ${item.method})`).join('; ')}.` : '',
                ].filter(Boolean).join(' ');
                addParagraph(`Reason for flagging: ${evidenceText || 'Matching terms were found in available vault metadata.'}`);
                addParagraph(`Why this matters: This could be related to ${risk.possibleRisks.join('; ')}.`);
                addParagraph(`Suggested action: ${risk.nextStep}`);
            });
        }

        addHeading('Emergency Readiness Recommendations');
        if (riskReport.preparednessGaps.length === 0) {
            addParagraph('No major emergency-readiness gaps were detected from the available details.');
        } else {
            riskReport.preparednessGaps.forEach((gap) => addParagraph(`- ${gap}`));
        }

        addHeading('Record Coverage');
        const categoryText = Object.entries(riskReport.categoryCounts).length > 0
            ? Object.entries(riskReport.categoryCounts).map(([category, count]) => `${category}: ${count}`).join(', ')
            : 'No documents were available.';
        addParagraph(`Document coverage reviewed: ${categoryText}.`);
        addParagraph('Extraction note: PDF text and image OCR were used where possible. Blurry scans, handwriting, locked PDFs, or image-only PDFs may reduce extraction accuracy.');

        const pageCount = pdf.internal.getNumberOfPages();
        for (let page = 1; page <= pageCount; page += 1) {
            pdf.setPage(page);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`MediChain Risk Report • Page ${page} of ${pageCount}`, margin, pageHeight - 20);
        }

        pdf.save(`medichain-vault-risk-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleRestoreFromFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            if (!json?.documents || !Array.isArray(json.documents)) throw new Error('Invalid backup file');
            const merged = [...documents, ...json.documents];
            await updatePatientProfile(activeWallet, { ...profile, healthDocuments: merged });
            setDocuments(merged);
            setRiskReport(null);
            toast({ title: 'Vault Restored', description: 'Imported documents from backup' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Restore failed', description: error.message || 'Invalid backup file' });
        } finally {
            e.target.value = '';
        }
    };

    const handleGenerateCode = async () => {
        setIsGenerating(true);
        try {
            const codeData = await generateEmergencyCode(activeWallet);
            setActiveCode(codeData);
            toast({ title: 'Code Generated', description: `Your new emergency code is ${codeData.code}` });
        } catch (error) {
            console.error("Failed to generate code:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate a new code.' });
        } finally {
            setIsGenerating(false);
        }
    };


    const handleRevokeCode = async () => {
        if (!activeCode) return;
        setIsRevoking(true);
        try {
            await revokeEmergencyCode(activeCode.code);
            setActiveCode(null);
            toast({ title: 'Code Revoked', description: 'Your emergency access code has been revoked.' });
        } catch (error) {
            console.error("Failed to revoke code:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not revoke the code.' });
        } finally {
            setIsRevoking(false);
        }
    };

    const copyTextToClipboard = async (text) => {
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) { }
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (e) {
            return false;
        }
    };

    const copyToClipboard = async () => {
        if (activeCode) {
            const ok = await copyTextToClipboard(activeCode.code);
            if (ok) {
                toast({ title: 'Copied!', description: 'Access code copied to clipboard.' });
            } else {
                toast({ variant: 'destructive', title: 'Copy failed', description: 'Unable to copy to clipboard. Please copy manually.' });
            }
        }
    }

    const copyEmergencyLink = async () => {
        if (!emergencyAccessUrl) return;
        const ok = await copyTextToClipboard(emergencyAccessUrl);
        if (ok) {
            toast({ title: 'Link Copied', description: 'Emergency QR link copied to clipboard.' });
        } else {
            toast({ variant: 'destructive', title: 'Copy failed', description: 'Unable to copy link. Please copy manually.' });
        }
    };

    const downloadQrImage = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `medichain-emergency-qr-${activeCode?.code || 'card'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadQrCard = async () => {
        if (!qrDataUrl || typeof window === 'undefined') return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 760;
            canvas.height = 460;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas is not available');

            const qrImage = new window.Image();
            qrImage.src = qrDataUrl;
            await new Promise((resolve, reject) => {
                qrImage.onload = resolve;
                qrImage.onerror = reject;
            });

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, 86);

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 28px Arial';
            ctx.fillText('MediChain Emergency Card', 32, 38);
            ctx.font = '500 15px Arial';
            ctx.fillText('Scan this QR code to open emergency-only health details.', 32, 64);

            ctx.fillStyle = '#fee2e2';
            ctx.fillRect(590, 24, 128, 34);
            ctx.fillStyle = '#991b1b';
            ctx.font = '700 16px Arial';
            ctx.fillText('EMERGENCY', 606, 47);

            ctx.drawImage(qrImage, 34, 116, 220, 220);

            ctx.fillStyle = '#111827';
            ctx.font = '700 25px Arial';
            wrapCanvasText(ctx, profile?.name || 'Patient Profile', 286, 128, 420, 30, 2);

            ctx.fillStyle = '#475569';
            ctx.font = '600 14px Arial';
            ctx.fillText('Access code', 286, 188);
            ctx.fillStyle = '#0f172a';
            ctx.font = '700 24px Courier New';
            ctx.fillText(activeCode?.code || '', 286, 216);

            const summaryRows = [
                ['Blood group', getEmergencyValue(emergencySummary.bloodGroup)],
                ['Emergency contact', getEmergencyValue(emergencySummary.emergencyContact)],
                ['Allergies', getEmergencyValue(emergencySummary.allergies)],
                ['Active medicines', getEmergencyValue(emergencySummary.activeMedicines)],
            ];

            let rowY = 256;
            summaryRows.forEach(([label, value]) => {
                ctx.fillStyle = '#64748b';
                ctx.font = '700 13px Arial';
                ctx.fillText(label.toUpperCase(), 286, rowY);
                ctx.fillStyle = '#0f172a';
                ctx.font = '500 16px Arial';
                rowY = wrapCanvasText(ctx, value, 286, rowY + 23, 420, 20, 2) + 12;
            });

            ctx.fillStyle = '#475569';
            ctx.font = '500 13px Arial';
            ctx.fillText('This card opens only the emergency summary and documents marked for emergency access.', 34, 390);
            ctx.fillText('Revoke the code anytime from the MediChain Emergency Vault.', 34, 416);

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `medichain-emergency-card-${activeCode?.code || 'card'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to generate emergency card:', error);
            toast({ variant: 'destructive', title: 'Download failed', description: 'Could not create the emergency card image.' });
        }
    };

    const totalBytes = useMemo(() => {
        try {
            return documents.reduce((sum, d) => {
                try {
                    if (!d.encryptedUri || typeof d.encryptedUri !== 'string') {
                        return sum;
                    }
                    const decrypted = decryptData(d.encryptedUri);
                    return sum + estimateBytesFromDataUri(decrypted || '');
                } catch (_) {
                    return sum;
                }
            }, 0);
        } catch (_) {
            return 0;
        }
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        const q = query.trim().toLowerCase();
        return documents.filter((d) => {
            const matchesQuery = !q || d.name?.toLowerCase().includes(q);
            const matchesCategory = categoryFilter === 'all' || (d.category || '').toLowerCase() === categoryFilter.toLowerCase();
            return matchesQuery && matchesCategory;
        });
    }, [documents, query, categoryFilter]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldPlus />Emergency Vault</CardTitle>
                        <CardDescription>Store and manage your important medical files like prescriptions, lab reports, and emergency documents.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Backup buttons removed */}

                        <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Critical Emergency Summary</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Blood Group</Label>
                                    <Input
                                        value={emergencySummary.bloodGroup}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, bloodGroup: e.target.value }))}
                                        placeholder="O+, AB-, unknown..."
                                    />
                                </div>
                                <div>
                                    <Label>Emergency Contact</Label>
                                    <Input
                                        value={emergencySummary.emergencyContact}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, emergencyContact: e.target.value }))}
                                        placeholder="Name and phone"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Allergies</Label>
                                    <Textarea
                                        value={emergencySummary.allergies}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, allergies: e.target.value }))}
                                        placeholder="Penicillin, peanuts, latex..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Active Medicines</Label>
                                    <Textarea
                                        value={emergencySummary.activeMedicines}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, activeMedicines: e.target.value }))}
                                        placeholder="Metformin 500mg, insulin..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Known Conditions</Label>
                                    <Textarea
                                        value={emergencySummary.conditions}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, conditions: e.target.value }))}
                                        placeholder="Diabetes, asthma, cardiac history..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label>Emergency Notes</Label>
                                    <Textarea
                                        value={emergencySummary.notes}
                                        onChange={(e) => setEmergencySummary(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Implants, care instructions, preferred hospital..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <Button type="button" onClick={handleSaveEmergencySummary} disabled={isSavingSummary}>
                                {isSavingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Save Emergency Summary
                            </Button>
                        </div>

                        <div className="rounded-lg border p-4 space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="flex items-center gap-2 font-semibold">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        Risk Report From Emergency Vault
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Reads emergency details, PDF text, OCR text from JPG/PNG/WebP images, document categories, and file names to flag possible associated disease risks for doctor review.
                                    </p>
                                </div>
                                <Button type="button" onClick={handleGenerateRiskReport} disabled={isGeneratingRiskReport}>
                                    {isGeneratingRiskReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                                    {isGeneratingRiskReport ? 'Reading Documents...' : 'Generate Report'}
                                </Button>
                            </div>
                            <VaultRiskReport report={riskReport} onDownload={handleDownloadRiskReport} />
                        </div>

                        <UploadSection onUpload={handleFileUpload} isUploading={isUploading} />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                            <h3 className="font-semibold">Your Emergency Documents</h3>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name..." className="pl-8" />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="sm:w-48"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="Prescription">Prescription</SelectItem>
                                        <SelectItem value="Lab Report">Lab Report</SelectItem>
                                        <SelectItem value="Vaccination">Vaccination</SelectItem>
                                        <SelectItem value="Consultation Summary">Consultation Summary</SelectItem>
                                        <SelectItem value="Emergency Contact">Emergency Contact</SelectItem>
                                        <SelectItem value="Insurance Card">Insurance Card</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="border rounded-lg max-h-96 overflow-y-auto divide-y">
                            {filteredDocuments.length > 0 ? (
                                filteredDocuments.map(doc => {
                                    let sizeMb = 0;
                                    try {
                                        if (doc.encryptedUri && typeof doc.encryptedUri === 'string') {
                                            const decrypted = decryptData(doc.encryptedUri);
                                            sizeMb = estimateBytesFromDataUri(decrypted || '') / (1024 * 1024);
                                        }
                                    } catch (_) { sizeMb = 0; }
                                    return (
                                        <div key={doc.id} className="flex items-center justify-between p-3 gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate" title={doc.name}>{doc.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="secondary">{doc.category || 'Document'}</Badge>
                                                        {doc.emergencyVisible && <Badge variant="outline">Emergency</Badge>}
                                                        <span>{new Date(doc.uploadedAt).toLocaleString()}</span>
                                                        <span>• {sizeMb.toFixed(2)} MB</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <TooltipProvider>
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="outline" size="icon" onClick={() => handleViewDocument(doc)} aria-label="View">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>View</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="secondary" size="icon" onClick={() => handleDownloadDocument(doc)} aria-label="Download">
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Download</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveDocument(doc.id)} aria-label="Delete">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TooltipProvider>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-muted-foreground p-8">No emergency documents found. Upload important files like prescriptions, lab reports, or emergency contacts.</p>
                            )}
                        </div>

                        {corruptedDocuments.length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                                    <FileText className="h-4 w-4" />
                                    Corrupted Documents ({corruptedDocuments.length})
                                </h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                                    The following documents have corrupted data and cannot be accessed:
                                </p>
                                <div className="space-y-2">
                                    {corruptedDocuments.map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-red-600" />
                                                <div>
                                                    <p className="font-medium text-sm text-red-800 dark:text-red-200">{doc.name}</p>
                                                    <p className="text-xs text-red-600">{doc.errorMessage}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Create a file input to re-upload the document
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
                                                        input.onchange = (e) => {
                                                            if (e.target.files[0]) {
                                                                handleReuploadDocument(doc.id, e.target.files[0], doc.category);
                                                            }
                                                        };
                                                        input.click();
                                                    }}
                                                >
                                                    <Upload className="h-4 w-4 mr-1" />
                                                    Re-upload
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRemoveCorruptedDocument(doc.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card className="sticky top-20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound />Emergency Access Code</CardTitle>
                        <CardDescription>Generate a secure code for emergency access to your medical documents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeCode ? (
                            <div className="space-y-4">
                                <div>
                                    <Label>Your Emergency Code</Label>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value={activeCode.code} className="font-mono text-lg tracking-widest bg-muted" />
                                        <Button variant="outline" size="icon" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <QrCode className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-semibold text-sm">Emergency QR Card</p>
                                            <p className="text-xs text-muted-foreground">Scan to open the critical medical summary.</p>
                                        </div>
                                    </div>
                                    <div className="rounded-md border bg-white p-3 text-slate-950 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">MediChain</p>
                                                <p className="truncate text-sm font-semibold">{profile?.name || 'Patient Profile'}</p>
                                                <p className="font-mono text-xs text-slate-600">{activeCode.code}</p>
                                            </div>
                                            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700">Emergency</span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-[112px_1fr] gap-3">
                                            <div className="flex h-28 w-28 items-center justify-center rounded bg-white">
                                                {qrDataUrl ? (
                                                    <img src={qrDataUrl} alt="Emergency access QR code" className="h-28 w-28" />
                                                ) : (
                                                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                                                )}
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <EmergencyCardRow label="Blood" value={emergencySummary.bloodGroup} />
                                                <EmergencyCardRow label="Contact" value={emergencySummary.emergencyContact} />
                                                <EmergencyCardRow label="Allergies" value={emergencySummary.allergies} />
                                                <EmergencyCardRow label="Meds" value={emergencySummary.activeMedicines} />
                                            </div>
                                        </div>
                                        <p className="mt-3 text-[11px] leading-4 text-slate-500">
                                            Scan to open emergency-only health details and critical documents.
                                        </p>
                                    </div>
                                    <Input readOnly value={emergencyAccessUrl} className="text-xs" />
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button type="button" variant="outline" onClick={copyEmergencyLink}>
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Copy QR Link
                                        </Button>
                                        <Button type="button" variant="outline" onClick={downloadQrImage} disabled={!qrDataUrl}>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Download QR Image
                                        </Button>
                                        <Button type="button" variant="outline" onClick={downloadQrCard} disabled={!qrDataUrl}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Emergency Card
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => window.open(emergencyAccessUrl, '_blank')} disabled={!emergencyAccessUrl}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Test Access Page
                                        </Button>
                                    </div>
                                </div>
                                <Button className="w-full" variant="destructive" onClick={handleRevokeCode} disabled={isRevoking}>
                                    {isRevoking ? <Loader2 className="mr-2 animate-spin" /> : <ShieldOff className="mr-2" />}
                                    Revoke Access Code
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button className="w-full" onClick={handleGenerateCode} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCw className="mr-2" />}
                                    Generate Emergency Code
                                </Button>
                                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        <strong>Why create an emergency code?</strong><br />
                                        Allows trusted people to access your critical medical documents during emergencies when you cannot provide access yourself.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const VaultToolbar = () => null;

const EmergencyCardRow = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="line-clamp-2 break-words font-medium leading-4">{getEmergencyValue(value)}</p>
    </div>
);

const UploadSection = ({ onUpload, isUploading }) => {
    const [category, setCategory] = useState('');
    const [emergencyVisible, setEmergencyVisible] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files[0] && category) {
            onUpload(e, category, emergencyVisible);
        }
    };

    const handleCategoryChange = (value) => {
        setCategory(value);
        setEmergencyVisible(['Medical ID', 'Allergy List', 'Emergency Contact', 'Prescription', 'Vaccination'].includes(value));
    };

    return (
        <div className="p-4 border border-dashed rounded-lg space-y-4">
            <h3 className="font-semibold">Upload New Document</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Document Category</Label>
                    <Select value={category} onValueChange={handleCategoryChange}>
                        <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Prescription">🧾 Prescription</SelectItem>
                            <SelectItem value="Lab Report">🧪 Lab Report</SelectItem>
                            <SelectItem value="Vaccination">💉 Vaccination</SelectItem>
                            <SelectItem value="Consultation Summary">📄 Consultation Summary</SelectItem>
                            <SelectItem value="Emergency Contact">🚨 Emergency Contact</SelectItem>
                            <SelectItem value="Insurance Card">💳 Insurance Card</SelectItem>
                            <SelectItem value="Medical ID">🆔 Medical ID</SelectItem>
                            <SelectItem value="Allergy List">⚠️ Allergy List</SelectItem>
                            <SelectItem value="Other">📄 Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>File</Label>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading || !category}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || !category}
                    >
                        {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
                        Select File
                    </Button>
                </div>
            </div>
            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={emergencyVisible}
                    onChange={(e) => setEmergencyVisible(e.target.checked)}
                    className="mt-1"
                />
                <span>Expose this document through emergency code access</span>
            </label>
        </div>
    )
}


export default EmergencyVault;
