
'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, FileText, PlusCircle, LogOut, LayoutDashboard, ShieldCheck, Loader2, ShieldAlert, Wallet, BriefcaseMedical, Bell, MessageSquare, CalendarDays, HeartHandshake, Calendar, KeyRound, ChevronDown, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/frontend/hooks/useLocalStorage';

import Profile from '@/frontend/components/dashboard/Profile';
import NewConsultation from '@/frontend/components/dashboard/NewConsultation';
import Logs from '@/frontend/components/dashboard/Logs';
import Overview from '@/frontend/components/dashboard/Overview';
import DoctorRegistrationForm from '@/frontend/components/dashboard/DoctorRegistrationForm';
import Renewals from '@/frontend/components/dashboard/Renewals';
import Chat from '@/frontend/components/dashboard/Chat';
import Appointments from '@/frontend/components/dashboard/Appointments';
import Fundraising from '@/frontend/components/dashboard/Fundraising';
import SharedDocuments from '@/frontend/components/dashboard/SharedDocuments';
import EmergencyAccess from '@/frontend/components/dashboard/EmergencyAccess';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/frontend/components/ui/card';
import { useToast } from "@/frontend/hooks/use-toast";
import { getDoctorProfile, getAllConsultations, getAllPatientProfiles, getRenewalRequests, getAppointmentsForDoctor, getFundraiserRequestForDoctor } from '@/backend/services/mongodb';
import { connectWallet } from '@/frontend/lib/wallet';
import { Badge } from '@/frontend/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/frontend/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';


const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const { toast } = useToast();

  const [activeWallet, setActiveWallet] = useLocalStorage('activeDoctorWallet', null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loginFlow, setLoginFlow] = useState(null); // 'create' or 'login'

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [patientProfiles, setPatientProfiles] = useState({});
  const [renewalRequests, setRenewalRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [fundraiserRequests, setFundraiserRequests] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const fetchCoreData = useCallback(async (wallet) => {
    if (!wallet) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        docProfile,
        consults,
        patProfiles,
        renewals,
        appts,
        fundRequests
      ] = await Promise.all([
        getDoctorProfile(wallet),
        getAllConsultations(),
        getAllPatientProfiles(),
        getRenewalRequests(wallet),
        getAppointmentsForDoctor(wallet),
        getFundraiserRequestForDoctor(wallet)
      ]);

      setDoctorProfile(docProfile);
      setConsultations(consults || []);
      setPatientProfiles(patProfiles || {});
      setRenewalRequests(renewals || []);
      setAppointments(appts || []);
      setFundraiserRequests(fundRequests || []);

      if (docProfile && docProfile.name && docProfile.licenseId) {
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }

    } catch (error) {
      console.error("Failed to fetch core doctor data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load your core profile from the database.",
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
      setLoginFlow(null); // Reset flow if wallet disconnects
      setIsRegistered(false);
      setDoctorProfile(null);
    }
  }, [activeWallet, fetchCoreData]);

  // Normalize login flow when registration completes (must be before any early returns)
  useEffect(() => {
    if (loginFlow === 'create' && isRegistered) {
      setLoginFlow('login');
    }
  }, [loginFlow, isRegistered]);

  const handleWalletConnect = async (flow) => {
    const account = await connectWallet();
    if (account) {
      setActiveWallet(account);
      setLoginFlow(flow);
      await fetchCoreData(account);
    }
  };

  const handleRegistrationSuccess = async () => {
    setIsRegistered(true);
    await fetchCoreData(activeWallet);
    setActiveTab('overview');
  };

  if (!activeWallet || !loginFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <BriefcaseMedical className="h-16 w-16 mx-auto text-primary mb-4" />
            <CardTitle className="font-headline">Doctor Portal</CardTitle>
            <CardDescription>Create a new account or log in with your existing wallet.</CardDescription>
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }


  if (loginFlow === 'login' && !isRegistered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg-welcome p-4">
        <main className="container mx-auto max-w-4xl flex-1">
          <DoctorRegistrationForm
            activeWallet={activeWallet}
            onSuccess={handleRegistrationSuccess}
          />
        </main>
      </div>
    )
  }

  if (loginFlow === 'create' && !isRegistered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg-welcome p-4">
        <header className="w-full max-w-4xl mx-auto py-4">
          <h1 className="font-headline text-3xl font-bold text-gradient">Doctor Registration</h1>
          <p className="text-muted-foreground">Please provide your details to create a secure professional profile on MediChain.</p>
        </header>
        <main className="container mx-auto max-w-4xl flex-1">
          <DoctorRegistrationForm
            activeWallet={activeWallet}
            onSuccess={handleRegistrationSuccess}
          />
        </main>
      </div>
    )
  }

  if (doctorProfile?.banned) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-welcome">
        <Card className="max-w-md w-full text-center bg-destructive/10 border-destructive">
          <CardHeader>
            <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
            <CardTitle className="font-headline">Account Suspended</CardTitle>
            <CardDescription className="text-destructive-foreground">
              This doctor account has been suspended. Please contact support for assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" onClick={() => { setActiveWallet(null); router.push('/'); }}>
              <LogOut className="mr-2 h-4 w-4" /> Disconnect
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderContent = () => {
    const commonProps = {
      activeWallet,
      setActiveWallet,
      setActiveTab,
      refreshData: () => fetchCoreData(activeWallet),
    };

    const doctorProfiles = { [activeWallet.toLowerCase()]: doctorProfile };

    switch (activeTab) {
      case 'overview':
        return <Overview {...commonProps} consultations={consultations} fundraiserRequests={fundraiserRequests} />;
      case 'profile':
        return <Profile {...commonProps} consultations={consultations} doctorProfiles={doctorProfiles} setDoctorProfiles={(p) => setDoctorProfile(Object.values(p)[0])} />;
      case 'new-consultation':
        return <NewConsultation {...commonProps} consultations={consultations} setConsultations={setConsultations} doctorProfiles={doctorProfiles} patientProfiles={patientProfiles} />;
      case 'logs':
        return <Logs {...commonProps} consultations={consultations} setConsultations={setConsultations} doctorProfiles={doctorProfiles} patientProfiles={patientProfiles} />;
      case 'renewals':
        return <Renewals {...commonProps} renewalRequests={renewalRequests} setRenewalRequests={setRenewalRequests} patientProfiles={patientProfiles} />;
      case 'appointments':
        return <Appointments {...commonProps} appointments={appointments} setAppointments={setAppointments} patientProfiles={patientProfiles} activeWallet={activeWallet} />;
      case 'fundraising':
        return <Fundraising {...commonProps} fundraiserRequests={fundraiserRequests} setFundraiserRequests={setFundraiserRequests} patientProfiles={patientProfiles} />;
      case 'shared-docs':
        return <SharedDocuments {...commonProps} />;
      case 'messages':
        return <Chat {...commonProps} userType="doctor" />;
      case 'emergency-access':
        return <EmergencyAccess />;
      default:
        return <Overview {...commonProps} consultations={consultations} fundraiserRequests={fundraiserRequests} />;
    }
  };

  const getShortAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
  const pendingRenewals = renewalRequests.filter(r => r.status === 'pending').length;
  const pendingFundraisers = fundraiserRequests.filter(f => f.status === 'pending').length;


  return (
    <div className="min-h-screen flex flex-col gradient-bg-welcome text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <h1 className="font-headline text-xl font-bold text-foreground shrink-0">MediChain</h1>
          <nav className="hidden items-center gap-1 md:flex overflow-x-auto no-scrollbar mask-gradient-x flex-1">
            <Button variant={activeTab === 'overview' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')} className="shrink-0">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Overview
            </Button>
            <Button variant={activeTab === 'new-consultation' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('new-consultation')} className="shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" /> New Consultation
            </Button>
            <Button variant={activeTab === 'shared-docs' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('shared-docs')} className="shrink-0">
              <FolderOpen className="mr-2 h-4 w-4" /> Shared Documents
            </Button>
            <Button variant={activeTab === 'logs' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('logs')} className="shrink-0">
              <FileText className="mr-2 h-4 w-4" /> My Logs
            </Button>
            <Button variant={activeTab === 'messages' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('messages')} className="shrink-0">
              <MessageSquare className="mr-2 h-4 w-4" /> Messages
            </Button>
            <Button variant={activeTab === 'appointments' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('appointments')} className="relative shrink-0">
              <CalendarDays className="mr-2 h-4 w-4" /> Appointments
              {pendingAppointments > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{pendingAppointments}</Badge>}
            </Button>
            <Button variant={activeTab === 'renewals' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('renewals')} className="relative shrink-0">
              <Bell className="mr-2 h-4 w-4" /> Renewals
              {pendingRenewals > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{pendingRenewals}</Badge>}
            </Button>
            <Button variant={activeTab === 'fundraising' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('fundraising')} className="relative shrink-0">
              <HeartHandshake className="mr-2 h-4 w-4" /> Fundraising
              {pendingFundraisers > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{pendingFundraisers}</Badge>}
            </Button>
            <Button variant={activeTab === 'emergency-access' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('emergency-access')} className="shrink-0">
              <KeyRound className="mr-2 h-4 w-4" /> Emergency Access
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={doctorProfile?.documents?.photo} alt={doctorProfile?.name} />
                  <AvatarFallback>{doctorProfile?.name ? doctorProfile.name.charAt(0) : 'D'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-bold">{doctorProfile?.name || 'Not Registered'}</div>
                <div className="text-xs text-muted-foreground font-normal">{getShortAddress(activeWallet)}</div>
                {doctorProfile?.verified && <Badge variant="secondary" className="mt-2 text-green-600 border-green-600"><ShieldCheck className="mr-1 h-3 w-3" />Verified</Badge>}
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
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'overview' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Overview</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'messages' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('messages')}>
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Messages</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'logs' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('logs')}>
            <FileText className="h-5 w-5" />
            <span className="text-xs">Logs</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 relative ${activeTab === 'appointments' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('appointments')}>
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs">Book</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 relative ${activeTab === 'renewals' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('renewals')}>
            <Bell className="h-5 w-5" />
            <span className="text-xs">Renewals</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 relative ${activeTab === 'fundraising' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('fundraising')}>
            <HeartHandshake className="h-5 w-5" />
            <span className="text-xs">Funds</span>
          </Button>
          <Button variant="ghost" className={`flex flex-col h-auto p-2 ${activeTab === 'new-consultation' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('new-consultation')}>
            <PlusCircle className="h-5 w-5" />
            <span className="text-xs">New</span>
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

export default DashboardPage;
