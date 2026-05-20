
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { FileText, PlusCircle, User, Users, HeartHandshake, Loader2, FolderOpen } from 'lucide-react';
import { Badge } from '@/frontend/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { getAllConsultations, getFundraiserRequestForDoctor } from '@/backend/services/mongodb';

const Overview = ({ setActiveTab, activeWallet }) => {
    const [consultations, setConsultations] = useState([]);
    const [fundraiserRequests, setFundraiserRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!activeWallet) return;
        setIsLoading(true);
        try {
            const [consults, fundRequests] = await Promise.all([
                getAllConsultations(),
                getFundraiserRequestForDoctor(activeWallet)
            ]);
            setConsultations(consults || []);
            setFundraiserRequests(fundRequests || []);
        } catch (error) {
            console.error("Failed to load overview data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [activeWallet]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const doctorConsultations = (consultations || []).filter(c => c.doctorWallet?.toLowerCase() === activeWallet?.toLowerCase());
    const patientRecords = [...new Set(doctorConsultations.map(c => c.patientId))];
    const pendingFundraiserRequestsCount = (fundraiserRequests || []).filter(f => f.status === 'pending').length;
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

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
                 <Card className="cursor-pointer hover:bg-muted/50 relative" onClick={() => setActiveTab('fundraising')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fundraiser Requests</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingFundraiserRequestsCount}</div>
                        <p className="text-xs text-muted-foreground">
                           pending patient requests to review
                        </p>
                    </CardContent>
                    {pendingFundraiserRequestsCount > 0 && (
                        <Badge variant="destructive" className="absolute top-2 right-2">{pendingFundraiserRequestsCount}</Badge>
                    )}
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
