
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { BriefcaseMedical, User, Shield } from 'lucide-react';

const RoleSelectionPage = () => {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center gradient-bg-welcome p-4">
            <div className="max-w-6xl w-full">
                <Card className="bg-background/80 backdrop-blur-md border-border/50">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-headline">Welcome to MediChain</CardTitle>
                        <CardDescription className="text-lg">
                            Please select your role to proceed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
                        {/* Doctor Card */}
                        <div className="group relative flex flex-col items-center justify-between p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/25 cursor-pointer border-blue-200 dark:border-blue-800">
                            {/* 3D Shadow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="relative z-10 text-center">
                                <div className="transform group-hover:scale-110 transition-transform duration-300">
                                    <BriefcaseMedical className="h-16 w-16 mx-auto text-primary mb-4 drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl font-bold font-headline mb-2 text-blue-900 dark:text-blue-100">Doctor</h3>
                                <p className="text-muted-foreground mb-6">Access your dashboard to manage patient consultations and records.</p>
                            </div>
                            <Button 
                                onClick={() => router.push('/dashboard/doctor')} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transform group-hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/50 border-0"
                            >
                                Continue as Doctor
                            </Button>
                        </div>

                        {/* Patient Card */}
                        <div className="group relative flex flex-col items-center justify-between p-6 border rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30 transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/25 cursor-pointer border-green-200 dark:border-green-800">
                            {/* 3D Shadow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="relative z-10 text-center">
                                <div className="transform group-hover:scale-110 transition-transform duration-300">
                                    <User className="h-16 w-16 mx-auto text-accent mb-4 drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl font-bold font-headline mb-2 text-green-900 dark:text-green-100">Patient</h3>
                                <p className="text-muted-foreground mb-6">View your personal consultation history and manage your data.</p>
                            </div>
                            <Button 
                                onClick={() => router.push('/dashboard/patient')} 
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transform group-hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/50 border-0"
                            >
                                Continue as Patient
                            </Button>
                        </div>

                        {/* Admin Card */}
                        <div className="group relative flex flex-col items-center justify-between p-6 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30 transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/25 cursor-pointer border-purple-200 dark:border-purple-800">
                            {/* 3D Shadow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="relative z-10 text-center">
                                <div className="transform group-hover:scale-110 transition-transform duration-300">
                                    <Shield className="h-16 w-16 mx-auto text-foreground mb-4 drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl font-bold font-headline mb-2 text-purple-900 dark:text-purple-100">Admin</h3>
                                <p className="text-muted-foreground mb-6">Access the audit dashboard to monitor network activity and ensure trust.</p>
                            </div>
                            <Button 
                                onClick={() => router.push('/dashboard/admin')} 
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transform group-hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/50 border-0"
                            >
                                Continue as Admin
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RoleSelectionPage;
