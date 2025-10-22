import React, { useEffect, useState } from 'react';
import { TrainingMaterial } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { SaveIcon } from './icons/SaveIcon';
import * as db from '../services/db';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: TrainingMaterial;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, material }) => {
  const [materialData, setMaterialData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && material) {
      setIsLoading(true);
      setError(null);
      setMaterialData(null);

      db.getMaterialData(material.id)
        .then(data => {
          if (data) {
            setMaterialData(data);
          } else {
            setError('فایل یافت نشد. ممکن است حذف شده باشد.');
          }
        })
        .catch(err => {
          console.error(err);
          setError('خطا در بارگذاری فایل.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, material]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-slate-500">در حال بارگذاری پیش نمایش...</p>
            </div>
        );
    }
    if (error) {
        return <p className="text-center text-red-500">{error}</p>
    }
    if (!materialData) {
        return <p className="text-center text-slate-500">محتوایی برای نمایش وجود ندارد.</p>
    }

    const { type, name } = material;
    if (type.startsWith('image/')) {
      return <img src={materialData} alt={name} className="max-w-full max-h-full object-contain" />;
    }
    if (type.startsWith('video/')) {
      return (
        <video controls className="w-full h-auto max-h-full" autoPlay>
          <source src={materialData} type={type} />
          مرورگر شما از تگ ویدئو پشتیبانی نمی‌کند.
        </video>
      );
    }
    if (type.startsWith('audio/')) {
      return (
        <div className="p-8">
            <audio controls className="w-full" autoPlay>
            <source src={materialData} type={type} />
            مرورگر شما از تگ صوتی پشتیبانی نمی‌کند.
            </audio>
        </div>
      );
    }
    // Fallback for other file types
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <DocumentIcon className="w-24 h-24 text-slate-400 mb-4" />
        <p className="font-semibold text-lg text-slate-800 dark:text-slate-100 break-all">{name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">پیش‌نمایش برای این نوع فایل در دسترس نیست.</p>
      </div>
    );
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate pr-4" title={material.name}>
            {material.name}
          </h3>
          <div className="flex items-center gap-2">
            <a
                href={materialData || '#'}
                download={material.name}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 ${!materialData || isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <SaveIcon className="w-4 h-4"/>
                دانلود فایل
            </a>
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto flex-grow flex justify-center items-center bg-slate-50 dark:bg-slate-900/50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
