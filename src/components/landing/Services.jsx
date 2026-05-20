import { BsShieldFillCheck } from 'react-icons/bs';
import { BiSearchAlt } from 'react-icons/bi';
import { RiHeart2Fill } from 'react-icons/ri';
import ServiceCard from './ServiceCard';

const Services = () => {
    return (
        <div className="flex flex-col md:flex-row w-full justify-center items-center">
            <div className="flex mf:flex-row flex-col items-center justify-between md:p-20 py-12 px-4">
                <div className="flex-1 flex flex-col justify-start items-start">
                    <h1 className="text-white text-3xl sm:text-5xl py-2 text-gradient font-headline">
                        Services that we
                        <br />
                        continue to improve
                    </h1>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-start items-center">
                <ServiceCard 
                    color="bg-[#4DB6AC]"
                    title="Immutable Logs"
                    icon={<BsShieldFillCheck fontSize={21} className="text-white"/>}
                    subtitle="Every consultation hash is stored on the blockchain, ensuring a permanent, tamper-proof record."
                />
                 <ServiceCard 
                    color="bg-[#FF8A65]"
                    title="Doctor Verification"
                    icon={<BiSearchAlt fontSize={21} className="text-white"/>}
                    subtitle="We ensure doctors are verified, providing trust and security for all users of the platform."
                />
                 <ServiceCard 
                    color="bg-[#F44336]"
                    title="Patient-Controlled Data"
                    icon={<RiHeart2Fill fontSize={21} className="text-white"/>}
                    subtitle="Your sensitive consultation data is encrypted and stored locally, only accessible by you and your doctor."
                />
            </div>
        </div>
    );
}

export default Services;
