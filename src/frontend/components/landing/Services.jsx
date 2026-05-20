import { BsShieldFillCheck } from 'react-icons/bs';
import { BiSearchAlt } from 'react-icons/bi';
import { RiHeart2Fill } from 'react-icons/ri';
import ServiceCard from './ServiceCard';

const Services = () => {
    return (
        <div className="flex flex-col md:flex-row w-full justify-center items-center">
            <div className="flex mf:flex-row flex-col items-center justify-between md:p-20 py-12 px-4">
                <div className="flex-1 flex flex-col justify-start items-end">
                    <h1 className="text-white text-3xl sm:text-5xl py-2 text-gradient font-headline">
                        A New Standard
                        <br />
                        for Healthcare
                    </h1>
                     <p className="text-right my-2 text-white font-light md:w-9/12 w-11/12 text-base">
                        MediChain provides a secure, transparent, and patient-centric platform built on modern technology.
                    </p>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-start items-center">
                <ServiceCard 
                    color="bg-[#4DB6AC]"
                    title="On-Chain Medical Records"
                    icon={<BsShieldFillCheck fontSize={21} className="text-white"/>}
                    subtitle="Every consultation is logged on the Polygon blockchain, creating a tamper-proof, auditable history of care that you control."
                />
                 <ServiceCard 
                    color="bg-[#FF8A65]"
                    title="Verified Professionals"
                    icon={<BiSearchAlt fontSize={21} className="text-white"/>}
                    subtitle="Our network consists of verified doctors, ensuring you receive care from trusted and qualified professionals."
                />
                 <ServiceCard 
                    color="bg-[#F44336]"
                    title="Transparent Fundraising"
                    icon={<RiHeart2Fill fontSize={21} className="text-white"/>}
                    subtitle="Support patients directly through transparent, on-chain fundraising campaigns for medical treatments, verified by our network of doctors."
                />
            </div>
        </div>
    );
}

export default Services;
