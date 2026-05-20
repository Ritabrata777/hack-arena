const Footer = () => {
    return (
        <div className="w-full flex md:justify-center justify-between items-center flex-col p-4">
            <div className="w-full flex justify-center items-center my-4">
                <div className="flex justify-center items-center">
                    <h1 className="font-headline text-2xl font-bold text-white">MediChain</h1>
                </div>
            </div>
            <div className="sm:w-[90%] w-full h-[0.25px] bg-gray-400 mt-5" />
            <div className="flex justify-center items-center mt-4">
                <p className="text-white text-sm text-center font-light">
                    MADE BY INCU3BIT <span className="text-red-500">❤️</span>
                </p>
            </div>
        </div>
    );
}

export default Footer;
