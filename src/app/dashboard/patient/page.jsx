

'use client';

import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { User, FileText, LogOut, Loader2, ShieldAlert, Wallet, MessageSquare, LayoutDashboard, CalendarPlus, HeartHandshake, ShieldPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/frontend/hooks/useLocalStorage';

const PatientProfile = lazy(() => import('@/frontend/components/dashboard/PatientProfile'));
import Logs from '@/frontend/components/dashboard/Logs';
import Chat from '@/frontend/components/dashboard/Chat';
import PatientDashboard from '@/frontend/components/dashboard/PatientDashboard';
import BookAppointment from '@/frontend/components/dashboard/BookAppointment';
import RequestFundraiser from '@/frontend/components/dashboard/RequestFundraiser';
import EmergencyVault from '@/frontend/components/dashboard/HealthVault';
import ConsentManager from '@/frontend/components/dashboard/ConsentManager';

import { Button } from '@/frontend/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/frontend/components/ui/card';
import { useToast } from "@/frontend/hooks/use-toast";
import { getPatientProfile, getAllDoctorProfiles, getDoctorProfilesByIds, getAppointmentsForPatient, getFundraiserRequestForPatient, getAllConsultations } from '@/backend/services/mongodb';
import { connectWallet } from '@/frontend/lib/wallet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/frontend/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';


const PatientDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();
  const { toast } = useToast();

  const [activeWallet, setActiveWallet] = useLocalStorage('activePatientWallet', null);
  const [isClient, setIsClient] = useState(false);

  const [patientProfile, setPatientProfile] = useState(null);
  const [doctorProfiles, setDoctorProfiles] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [fundraiserRequests, setFundraiserRequests] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchCoreData = useCallback(async (wallet) => {
    if (!wallet) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Phase 1: Load essential data first (fast)
      const [
        patProfile,
        appts,
        fundRequests,
        consults
      ] = await Promise.all([
        getPatientProfile(wallet),
        getAppointmentsForPatient(wallet),
        getFundraiserRequestForPatient(wallet),
        getAllConsultations()
      ]);

      setPatientProfile(patProfile);
      setAppointments(appts || []);
      setFundraiserRequests(fundRequests || []);
      setConsultations(consults || []);

      // Phase 2: Load doctor profiles only for relevant consultations (optimized)
      if (consults && consults.length > 0) {
        const doctorWallets = [...new Set(consults
          .filter(c => c.doctorWallet)
          .map(c => c.doctorWallet.toLowerCase())
        )];

        if (doctorWallets.length > 0) {
          const relevantDoctorProfiles = await getDoctorProfilesByIds(doctorWallets);
          setDoctorProfiles(relevantDoctorProfiles || {});
        } else {
          setDoctorProfiles({});
        }
      } else {
        setDoctorProfiles({});
      }

    } catch (error) {
      console.error("Failed to fetch patient data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load your dashboard data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeWallet) {
      fetchCoreData(activeWallet);
    } else {
      setIsLoading(false);
    }
  }, [activeWallet, fetchCoreData]);

  const handleWalletConnect = async (flow) => {
    const account = await connectWallet();
    if (account) {
      setActiveWallet(account);
      if (flow === 'create' && !patientProfile) {
        setActiveTab('profile');
      } else {
        setActiveTab('dashboard');
      }
    }
  };

  const getShortAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!activeWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <User className="h-16 w-16 mx-auto text-accent mb-4" />
            <CardTitle className="font-headline">Patient Portal</CardTitle>
            <CardDescription>Create a new account or log in with your existing wallet to view your records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleWalletConnect('create')} className="w-full">
              Create New Account
            </Button>
            <Button onClick={() => handleWalletConnect('login')} className="w-full" variant="secondary">
              <Wallet className="mr-2 h-4 w-4" /> Login with Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (patientProfile?.banned) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
        <Card className="max-w-md w-full text-center bg-destructive/10 border-destructive">
          <CardHeader>
            <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
            <CardTitle className="font-headline">Account Suspended</CardTitle>
            <CardDescription className="text-destructive-foreground">
              This patient account has been suspended. Please contact support for assistance.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Enforce account creation before allowing access to dashboard
  if (!patientProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg-welcome p-4">
        <header className="w-full max-w-4xl mx-auto py-4">
          <h1 className="font-headline text-3xl font-bold text-gradient">Create Your Patient Account</h1>
          <p className="text-muted-foreground">Please complete your profile to continue.</p>
        </header>
        <main className="container mx-auto max-w-4xl flex-1">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading profile...</span>
            </div>
          }>
            <PatientProfile
              activeWallet={activeWallet}
              setActiveWallet={setActiveWallet}
              setActiveTab={setActiveTab}
              patientProfiles={{ [activeWallet.toLowerCase()]: patientProfile }}
              setPatientProfiles={(p) => setPatientProfile(Object.values(p)[0])}
              refreshData={() => fetchCoreData(activeWallet)}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  const renderContent = () => {
    const commonProps = {
      activeWallet,
      setActiveWallet,
      setActiveTab,
      refreshData: () => fetchCoreData(activeWallet),
    };

    switch (activeTab) {
      case 'dashboard':
        return <PatientDashboard {...commonProps} consultations={consultations} doctorProfiles={doctorProfiles} />;
      case 'logs':
        return <Logs {...commonProps} isPatientViewLocked={true} consultations={consultations} setConsultations={setConsultations} patientProfiles={{ [activeWallet.toLowerCase()]: patientProfile }} doctorProfiles={doctorProfiles} />;
      case 'book-appointment':
        return <BookAppointment {...commonProps} appointments={appointments} doctorProfiles={doctorProfiles} patientProfiles={{ [activeWallet.toLowerCase()]: patientProfile }} />;
      case 'consent':
        return <ConsentManager {...commonProps} />;
      case 'fundraising':
        return <RequestFundraiser {...commonProps} consultations={consultations} doctorProfiles={doctorProfiles} fundraiserRequests={fundraiserRequests} />;
      case 'profile':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading profile...</span>
            </div>
          }>
            <PatientProfile {...commonProps} patientProfiles={{ [activeWallet.toLowerCase()]: patientProfile }} setPatientProfiles={(p) => setPatientProfile(Object.values(p)[0])} />
          </Suspense>
        );
      case 'messages':
        return <Chat {...commonProps} userType="patient" />;
      case 'health-vault':
        return <EmergencyVault {...commonProps} />;
      default:
        return <PatientDashboard {...commonProps} consultations={consultations} doctorProfiles={doctorProfiles} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-bg-welcome text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center">
          <h1 className="font-headline text-xl font-bold text-foreground">MediChain (Patient)</h1>
        </div>
        <nav className="hidden items-center gap-2 md:flex">
          <Button variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button variant={activeTab === 'logs' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('logs')}>
            <FileText className="mr-2 h-4 w-4" /> My Records
          </Button>
          <Button variant={activeTab === 'book-appointment' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('book-appointment')}>
            <CalendarPlus className="mr-2 h-4 w-4" /> Book Appointment
          </Button>
          <Button variant={activeTab === 'health-vault' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('health-vault')}>
            <ShieldPlus className="mr-2 h-4 w-4" /> Emergency Vault
          </Button>
          <Button variant={activeTab === 'consent' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('consent')}>
            <ShieldPlus className="mr-2 h-4 w-4" /> Consent
          </Button>
          <Button variant={activeTab === 'messages' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('messages')}>
            <MessageSquare className="mr-2 h-4 w-4" /> Messages
          </Button>
          <Button variant={activeTab === 'fundraising' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('fundraising')}>
            <HeartHandshake className="mr-2 h-4 w-4" /> Fundraising
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={patientProfile?.profilePhoto} alt={patientProfile?.name} />
                  <AvatarFallback>{patientProfile?.name ? patientProfile.name.charAt(0) : 'P'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-bold">{patientProfile?.name || 'Not Registered'}</div>
                <div className="text-xs text-muted-foreground font-normal">{getShortAddress(activeWallet)}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveWallet(null); router.push('/'); }}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {renderContent()}
      </main>

      <footer className="sticky bottom-0 z-10 border-t bg-background/80 p-2 backdrop-blur-md md:hidden">
        <nav className="flex items-center justify-around">
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'logs' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('logs')}>
            <FileText className="h-5 w-5" />
            <span className="text-xs">Records</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'book-appointment' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('book-appointment')}>
            <CalendarPlus className="h-5 w-5" />
            <span className="text-xs">Book</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'health-vault' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('health-vault')}>
            <ShieldPlus className="h-5 w-5" />
            <span className="text-xs">Emergency</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'consent' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('consent')}>
            <ShieldPlus className="h-5 w-5" />
            <span className="text-xs">Consent</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'fundraising' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('fundraising')}>
            <HeartHandshake className="h-5 w-5" />
            <span className="text-xs">Funds</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'messages' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('messages')}>
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Messages</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('profile')}>
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </nav>
      </footer>


    </div>
  );
};

export default PatientDashboardPage;
