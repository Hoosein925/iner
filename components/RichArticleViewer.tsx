import React, { useState } from 'react';
import VideoPlayer from './VideoPlayer';

interface RichArticleViewerProps {
  title: string;
  description?: string;
  content: string;
  videoUrl?: string;
  createdAt?: string;
  author?: string;
  departmentName?: string;
}

export const RichArticleViewer: React.FC<RichArticleViewerProps> = ({
  title,
  description,
  content,
  videoUrl,
  createdAt,
  author,
  departmentName,
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Intercept images inside the content to enable lightbox click
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) setLightboxImage(src);
    }
  };

  return (
    <article className="w-full max-w-4xl mx-auto space-y-6 text-slate-800 dark:text-slate-200 select-text">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm cursor-zoom-out animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="بزرگ‌نمایی تصویر"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center shadow-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <header className="pb-5 border-b border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-sky-700 dark:text-sky-300">
          <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 font-bold">
            محتوای آموزشی چندرسانه‌ای
          </span>
          {departmentName && (
            <span className="text-slate-500 dark:text-slate-400">
              بخش {departmentName}
            </span>
          )}
          {formattedDate && (
            <span className="text-slate-400">
              • تاریخ انتشار: {formattedDate}
            </span>
          )}
          {author && (
            <span className="text-slate-400">
              • مدرس: {author}
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
          {title}
        </h1>

        {description && (
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-750/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            {description}
          </p>
        )}
      </header>

      {/* Optional Primary Video Player attached to the material */}
      {videoUrl && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>ویدئو آموزشی ضمیمه شده:</span>
          </div>
          <VideoPlayer src={videoUrl} title={title} />
        </section>
      )}

      {/* Rich Article Body */}
      <section
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: content }}
        className="rich-article-content prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4"
      />
    </article>
  );
};

export default RichArticleViewer;
