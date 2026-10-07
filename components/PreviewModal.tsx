import React, { useEffect, useState } from 'react';
import { TrainingMaterial } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { SaveIcon } from './icons/SaveIcon';
import * as db from '../services/db';
import VideoPlayer from './VideoPlayer';
import RichArticleViewer from './RichArticleViewer';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Partial<TrainingMaterial> & Pick<TrainingMaterial, 'name' | 'type'>;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, material }) => {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isArticle = material.type === 'article' || !!material.articleContent;

  useEffect(() => {
    if (isOpen && material) {
      if (isArticle) {
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setPublicUrl(null);

      if (material.storagePath) {
        const url = db.getFilePublicUrl(material.storagePath);
        if (url) {
          setPublicUrl(url);
        } else if (material.videoUrl) {
          setPublicUrl(material.videoUrl);
        } else {
          setError('فایل یافت نشد یا مسیر آن نامعتبر است.');
        }
      } else if (material.videoUrl) {
        setPublicUrl(material.videoUrl);
      } else {
        setError('محتوایی برای این فایل ثبت نشده است.');
      }
      setIsLoading(false);
    }
  }, [isOpen, material, isArticle]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (isArticle) {
      return (
        <div className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto">
          <RichArticleViewer
            title={material.name}
            description={material.description}
            content={material.articleContent || ''}
            videoUrl={material.videoUrl}
            createdAt={material.createdAt}
          />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-16">
          <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-500 text-sm">در حال بارگذاری پیش‌نمایش...</p>
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-500 py-12 text-sm">{error}</p>;
    }

    const effectiveVideoSrc = publicUrl || material.videoUrl;
    if (material.type.startsWith('video/') || material.videoUrl) {
      return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          <VideoPlayer
            src={effectiveVideoSrc || ''}
            title={material.name}
          />
        </div>
      );
    }

    if (!publicUrl) {
      return <p className="text-center text-slate-500 py-12 text-sm">محتوایی برای نمایش وجود ندارد.</p>;
    }

    const { type, name } = material;
    if (type.startsWith('image/')) {
      return (
        <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto">
          <img src={publicUrl} alt={name} className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md" />
        </div>
      );
    }

    if (type.startsWith('audio/')) {
      return (
        <div className="p-8 max-w-lg mx-auto">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 text-center">
            {name}
          </p>
          <audio controls className="w-full" autoPlay>
            <source src={publicUrl} type={type} />
            مرورگر شما از تگ صوتی پشتیبانی نمی‌کند.
          </audio>
        </div>
      );
    }

    if (type === 'application/pdf' || type.includes('officedocument')) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full">
          <DocumentIcon className="w-20 h-20 text-slate-400 mb-4" />
          <p className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-100 break-all mb-2">
            {name}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
            برای مشاهده کامل سند، می‌توانید آن را به صورت مستقیم دانلود یا باز کنید.
          </p>
          <a
            href={publicUrl || '#'}
            download={material.name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md transition"
          >
            <SaveIcon className="w-4 h-4" />
            دانلود و مشاهده فایل
          </a>
        </div>
      );
    }

    // Fallback for other file types
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <DocumentIcon className="w-20 h-20 text-slate-400 mb-4" />
        <p className="font-semibold text-base text-slate-800 dark:text-slate-100 break-all mb-4">
          {name}
        </p>
        <a
          href={publicUrl || '#'}
          download={material.name}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md"
        >
          <SaveIcon className="w-4 h-4" />
          دانلود فایل
        </a>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full overflow-hidden flex flex-col max-h-[92vh] ${
          isArticle ? 'max-w-4xl' : 'max-w-3xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-750">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              {isArticle ? 'مطلب آموزشی چندرسانه‌ای' : 'پیش‌نمایش محتوا'}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
              {material.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            aria-label="بستن"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
