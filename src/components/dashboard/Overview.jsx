
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle, Users, FolderOpen } from 'lucide-react';

const Overview = ({ setActiveTab, consultations, activeWallet }) => {
    
    const doctorConsultations = activeWallet
        ? (consultations || []).filter(c => c.doctorWallet?.toLowerCase() === activeWallet.toLowerCase())
        : [];
        
    const patientRecords = [...new Set(doctorConsultations.map(c => c.patientId))];

    return (
        <div className="grid gap-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Welcome, Doctor!</h1>
                <p className="text-muted-foreground">Here's a quick overview of your MediChain activity.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{doctorConsultations.length}</div>
                        <p className="text-xs text-muted-foreground">
                            consultations you have created
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Patients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{patientRecords.length}</div>
                        <p className="text-xs text-muted-foreground">
                           patients you have seen
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Start a New Consultation</CardTitle>
                        <CardDescription>Create a new encrypted record for a patient.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button onClick={() => setActiveTab('new-consultation')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> New Consultation
                        </Button>
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Shared Documents</CardTitle>
                        <CardDescription>View files patients have shared with you.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button variant="outline" onClick={() => setActiveTab('shared-docs')}>
                            <FolderOpen className="mr-2 h-4 w-4" /> View Shared Docs
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Overview;
