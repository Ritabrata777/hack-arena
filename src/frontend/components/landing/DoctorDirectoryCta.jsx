'use client';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Search } from 'lucide-react';

const DoctorDirectoryCta = () => {
    return (
        <div className="w-full flex justify-center items-center py-12 px-4">
            <div className="w-full max-w-4xl text-center p-8 rounded-2xl blue-glassmorphism">
                <h2 className="text-3xl font-bold text-white font-headline mb-4">
                    Find Your Trusted Doctor
                </h2>
                <p className="text-white/80 mb-6">
                    Browse our directory of verified medical professionals. Find the right specialist for your needs and book an appointment with confidence.
                </p>
                <Link href="/directory" passHref>
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                        <Search className="mr-2"/>
                        Browse Directory
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default DoctorDirectoryCta;
