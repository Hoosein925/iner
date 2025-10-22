import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (nationalId: string, password: string) => void;
  loginError: string | null;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, loginError }) => {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleLoginClick = () => {
    onLogin(nationalId.trim(), password.trim());
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLoginClick();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-6">ورود به سامانه</h3>
        <div className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="کد ملی"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="رمز عبور"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
          />
        </div>
        {loginError && <p className="text-red-500 text-sm text-center mt-4">{loginError}</p>}
        <div className="mt-6">
            <button
                onClick={handleLoginClick}
                className="w-full px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                ورود
            </button>
        </div>
         <div className="mt-4 text-center">
             <button
                onClick={onClose}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
                انصراف
            </button>
         </div>
      </div>
    </div>
  );
};

export default LoginModal;