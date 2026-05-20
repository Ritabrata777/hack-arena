import Navbar from '@/components/landing/Navbar';
import Welcome from '@/components/landing/Welcome';
import Services from '@/components/landing/Services';
import Footer from '@/components/landing/Footer';
import DoctorDirectoryCta from '@/frontend/components/landing/DoctorDirectoryCta';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-bg-welcome">
        <Navbar />
        <Welcome />
      </div>
      <div className="gradient-bg-services">
        <Services />
        <DoctorDirectoryCta />
      </div>
      <div className="gradient-bg-footer">
        <Footer />
      </div>
    </div>
  );
}
