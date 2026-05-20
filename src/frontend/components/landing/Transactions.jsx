'use client';
import React, { useState, useEffect } from 'react';
import { decryptData } from '@/backend/lib/crypto';
import { getRecentConsultations } from '@/backend/services/mongodb';
import { Loader2 } from 'lucide-react';

const TransactionCard = ({ patient, timestamp, summary, doctor, txHash }) => {
    const explorerUrl = txHash ? `https://amoy.polygonscan.com/tx/${txHash}` : '#';
    const shortPatient = patient ? `${patient.substring(0, 8)}...${patient.substring(patient.length - 6)}` : 'N/A';
    const shortDoctor = doctor ? `${doctor.substring(0, 8)}...${doctor.substring(doctor.length - 6)}` : 'N/A';

    return (
        <div className="bg-[#181918] m-4 flex flex-1
            2xl:min-w-[450px]
            2xl:max-w-[500px]
            sm:min-w-[270px]
            sm:max-w-[300px]
            flex-col p-3 rounded-2xl hover:shadow-2xl white-glassmorphism transition-transform duration-300 hover:scale-105 shadow-lg shadow-black/30"
        >
            <div className="flex flex-col items-center w-full mt-3">
                <div className="w-full mb-6 p-2">
                    <p className="text-white text-base font-code">Patient: {shortPatient}</p>
                    <p className="text-white text-base font-code">Doctor: {shortDoctor}</p>
                    <p className="text-white text-base">Timestamp: {new Date(timestamp).toLocaleString()}</p>
                    <div className="bg-black p-3 px-5 w-max rounded-3xl -mt-5 shadow-2xl self-end ml-auto">
                        <p className="text-[#37c7da] font-bold">Consultation</p>
                    </div>
                </div>
                
                <div className="w-full h-24 p-2 bg-black/20 rounded-md overflow-hidden">
                     <p className="text-white text-sm font-light">{summary}</p>
                </div>

                <p className="text-white font-bold text-lg mt-4">
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className={`text-primary hover:underline ${!txHash && 'opacity-50 cursor-not-allowed'}`}>
                        View on PolygonScan
                    </a>
                </p>
            </div>
        </div>
    );
}

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            setIsLoading(true);
            try {
                const consultations = await getRecentConsultations(6);
                const processedTxs = (consultations || [])
                    .map(log => {
                        const decryptedSummary = decryptData(log.encryptedSummary);
                        return {
                            id: log.id,
                            patient: log.patientId,
                            doctor: log.doctorWallet,
                            timestamp: log.timestamp,
                            summary: decryptedSummary ? (decryptedSummary.substring(0, 100) + (decryptedSummary.length > 100 ? '...' : '')) : 'Could not decrypt summary.',
                            txHash: log.txHash
                        };
                    });
                setTransactions(processedTxs);
            } catch (error) {
                console.error("Failed to fetch recent transactions from database:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    return (
        <div className="flex w-full justify-center items-center 2xl:px-20">
            <div className="flex flex-col md:p-12 py-12 px-4 w-full">
                <h3 className="text-white text-3xl text-center my-2 font-headline text-gradient">
                    {transactions.length > 0 ? 'Latest Consultation Logs' : 'No Consultation Logs Yet'}
                </h3>
                
                {isLoading ? (
                     <div className="flex justify-center items-center mt-10">
                         <Loader2 className="h-10 w-10 animate-spin text-primary" />
                     </div>
                ) : transactions.length > 0 ? (
                    <div className="flex flex-wrap justify-center items-center mt-10">
                        {transactions.map((transaction) => (
                            <TransactionCard key={transaction.id} {...transaction} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white mt-4">Create your first consultation in the app to see it here.</p>
                )}
            </div>
        </div>
    );
}

export default Transactions;
