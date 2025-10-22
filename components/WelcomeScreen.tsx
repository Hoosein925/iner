import React from 'react';
import { AparatIcon } from './icons/AparatIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { HeartbeatIcon } from './icons/HeartbeatIcon';

interface WelcomeScreenProps {
  onEnter: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-sky-50 to-indigo-100 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900 transition-colors duration-500">
      
      <div className="relative celestial-glow rounded-2xl">
        <div className="w-full max-w-2xl text-center bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12 border border-slate-200 dark:border-slate-700">
          
          <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 shadow-lg opacity-0 animate-fade-in-up">
            <HeartbeatIcon className="w-10 h-10 text-indigo-500 dark:text-indigo-400 animate-heartbeat-pulse" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ fontFamily: "'Scheherazade New', serif" }}>
              بسم الله الرحمن الرحیم
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-700 dark:text-slate-200 mt-6 mb-3 opacity-0 animate-fade-in-up animation-delay-400">
              به سامانه بیمارستان من خوش آمدید
          </h2>
          <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 mb-8 opacity-0 animate-fade-in-up animation-delay-600">
              سازنده: حسین نصاری
          </p>
          <button
              onClick={onEnter}
              className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-lg shadow-lg hover:shadow-indigo-500/30 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-900 focus:ring-indigo-500 transform hover:scale-105 transition-all duration-300 opacity-0 animate-fade-in-up animation-delay-800"
          >
              ورود
          </button>
          
          <div className="mt-12 flex items-center justify-center gap-8 opacity-0 animate-fade-in-up animation-delay-1000">
              <a href="https://www.aparat.com/Amazing.Nurse/" target="_blank" rel="noopener noreferrer" aria-label="Aparat" className="text-slate-400 hover:text-red-500 transition-colors duration-300">
                  <AparatIcon className="w-8 h-8"/>
              </a>
              <a href="https://t.me/ho3in925/" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-slate-400 hover:text-sky-400 transition-colors duration-300">
                  <TelegramIcon className="w-8 h-8"/>
              </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;