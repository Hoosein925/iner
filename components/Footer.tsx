import React, { useState, useEffect } from 'react';

const Footer: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedTime = time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const formattedDate = time.toLocaleDateString('fa-IR-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-700 text-white z-50 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.2)]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-center items-center">
                {/* A stylish container for better visual framing and mobile layout */}
                <div className="bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-inner flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
                    <div className="text-sm whitespace-nowrap">{formattedDate}</div>
                    <div className="hidden sm:block h-4 w-px bg-white/30"></div>
                    <div className="font-mono tracking-widest text-sm sm:text-base">{formattedTime}</div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
