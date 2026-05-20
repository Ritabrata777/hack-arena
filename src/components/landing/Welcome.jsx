
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Add elegant hover styles
const elegantStyles = `
  .floating-card {
    position: relative;
    overflow: hidden;
    transition: all 0.4s ease;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }
  
  .floating-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  
  .floating-card:hover::before {
    opacity: 1;
  }
  
  .floating-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const Welcome = () => {
    const [activeDoctorWallet] = useLocalStorage('activeDoctorWallet', null);
    const [activePatientWallet] = useLocalStorage('activePatientWallet', null);
    const [displayAddress, setDisplayAddress] = useState('0x...Your...Wallet...Address');

    useEffect(() => {
        const address = activeDoctorWallet || activePatientWallet;
        if (address) {
            setDisplayAddress(`${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
        } else {
            setDisplayAddress('0x...Your...Wallet...Address');
        }
    }, [activeDoctorWallet, activePatientWallet]);


    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: elegantStyles }} />
            <div className="flex w-full justify-center items-center">
            <div className="flex mf:flex-row flex-col items-start justify-between md:p-20 py-12 px-4">
                <div className="flex flex-1 justify-start flex-col mf:mr-10">
                    <h1 className="text-3xl sm:text-5xl text-white text-gradient py-1 font-headline">
                        MediChain <br /> Secure. Decentralized. Yours.
                    </h1>
                    <p className="text-left mt-5 text-white font-light md:w-9/12 w-11/12 text-base">
                        Revolutionizing medical records with blockchain. Your data, encrypted and under your control.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-5">
                         <Link href="/dashboard/doctor" passHref>
                            <button
                                type="button"
                                className="w-full sm:w-auto flex flex-row justify-center items-center my-2 bg-primary p-3 rounded-full cursor-pointer hover:bg-teal-300 text-white font-semibold transition-colors"
                            >
                                I'm a Doctor
                            </button>
                        </Link>
                         <Link href="/dashboard/patient" passHref>
                            <button
                                type="button"
                                className="w-full sm:w-auto flex flex-row justify-center items-center my-2 bg-transparent border border-white p-3 rounded-full cursor-pointer hover:bg-white/10 text-white font-semibold transition-colors"
                            >
                                I'm a Patient
                            </button>
                        </Link>
                         <Link href="/fundraising" passHref>
                            <button
                                type="button"
                                className="w-full sm:w-auto flex flex-row justify-center items-center my-2 bg-accent/80 p-3 rounded-full cursor-pointer hover:bg-accent text-white font-semibold transition-colors"
                            >
                                Help a Patient
                            </button>
                        </Link>
                    </div>

                    <div className="grid sm:grid-cols-3 grid-cols-2 w-full mt-10">
                        <div className="floating-card rounded-tl-2xl min-h-[70px] sm:min-w-[120px] flex justify-center items-center border-[0.5px] border-gray-400 text-sm font-light text-white cursor-pointer hover:text-blue-300">
                            <span className="relative z-10">Reliability</span>
                        </div>
                        <div className="floating-card min-h-[70px] sm:min-w-[120px] flex justify-center items-center border-[0.5px] border-gray-400 text-sm font-light text-white cursor-pointer hover:text-green-300">
                            <span className="relative z-10">Security</span>
                        </div>
                        <div className="floating-card rounded-tr-2xl sm:rounded-tr-2xl min-h-[70px] sm:min-w-[120px] flex justify-center items-center border-[0.5px] border-gray-400 text-sm font-light text-white cursor-pointer hover:text-purple-300">
                            <span className="relative z-10">Blockchain</span>
                        </div>
                        <div className="floating-card rounded-bl-2xl min-h-[70px] sm:min-w-[120px] flex justify-center items-center border-[0.5px] border-gray-400 text-sm font-light text-white cursor-pointer hover:text-cyan-300">
                            <span className="relative z-10">Web 3.0</span>
                        </div>
                        <div className="floating-card min-h-[70px] sm:min-w-[120px] flex justify-center items-center border-[0.5px] border-gray-400 text-sm font-light text-white cursor-pointer hover:text-pink-300">
                            <span className="relative z-10">Privacy</span>
                        </div>
                        <div className="floating-card rounded-br-2xl min-h-[70px] sm:min-w-[120px] flex justify-center items-center border-[0.5px] border-gray-400 text-sm font-light text-white cursor-pointer hover:text-orange-300">
                            <span className="relative z-10">Decentralized</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col flex-1 items-center justify-start w-full mf:mt-0 mt-10">
                </div>
            </div>
        </div>
        </>
    );
}

export default Welcome;
