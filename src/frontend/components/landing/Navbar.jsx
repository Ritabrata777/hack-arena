'use client';

import { useState } from 'react';
import { HiMenuAlt4, HiX } from 'react-icons/hi';
import Link from 'next/link';

const Navbar = () => {
    const [toggleMenu, setToggleMenu] = useState(false);

    return (
        <nav className="w-full flex md:justify-center justify-between items-center p-4">
            <div className="md:flex-[0.5] flex-initial justify-center items-center">
                 <h1 className="font-headline text-2xl font-bold text-white">MediChain</h1>
            </div>
            <ul className="text-white md:flex hidden list-none flex-row justify-between items-center flex-initial">
                <li className='bg-primary py-2 px-7 mx-4 rounded-full cursor-pointer hover:bg-teal-300 transition-colors'>
                    <Link href="/dashboard">Control Panel</Link>
                </li>
            </ul>

            <div className="flex relative">
                {toggleMenu
                    ? <HiX fontSize={28} className="text-white md:hidden cursor-pointer" onClick={() => setToggleMenu(false)} />
                    : <HiMenuAlt4 fontSize={28} className="text-white md:hidden cursor-pointer" onClick={() => setToggleMenu(true)} />
                }
                {toggleMenu && (
                    <ul
                        className="z-10 fixed top-0 -right-2 p-3 w-[70vw] h-screen shadow-2xl md:hidden list-none
                            flex flex-col justify-start items-end rounded-md blue-glassmorphism text-white animate-slide-in"
                    >
                        <li className="text-xl w-full my-2">
                            <HiX onClick={() => setToggleMenu(false)} />
                        </li>
                         <li className='bg-primary py-2 px-7 my-4 w-full text-center rounded-full cursor-pointer hover:bg-teal-300 transition-colors'>
                            <Link href="/dashboard">Control Panel</Link>
                        </li>
                    </ul>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
