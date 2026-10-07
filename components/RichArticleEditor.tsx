import React, { useRef, useState, useEffect } from 'react';
import { SaveIcon } from './icons/SaveIcon';
import VideoPlayer from './VideoPlayer';
import RichArticleViewer from './RichArticleViewer';

interface RichArticleEditorProps {
  initialTitle?: string;
  initialDescription?: string;
  initialContent?: string;
  initialVideoUrl?: string;
  initialMonth?: string;
  onSave: (data: {
    title: string;
    description: string;
    content: string;
    videoUrl?: string;
    month?: string;
  }) => void;
  onCancel: () => void;
}

const QUICK_COLORS = [
  { name: 'مشکی', value: '#0f172a' },
  { name: 'خاکستری', value: '#64748b' },
  { name: 'آبی درمانی', value: '#2563eb' },
  { name: 'سبز سلامت', value: '#16a34a' },
  { name: 'قرمز هشدار', value: '#dc2626' },
  { name: 'بنفش', value: '#9333ea' },
  { name: 'نارنجی', value: '#ea580c' },
  { name: 'فیروزه‌ای', value: '#0d9488' },
];

export const RichArticleEditor: React.FC<RichArticleEditorProps> = ({
  initialTitle = '',
  initialDescription = '',
  initialContent = '',
  initialVideoUrl = '',
  initialMonth = 'عمومی',
  onSave,
  onCancel,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState(initialVideoUrl);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Insert Modals State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState('');

  // Set initial content into editor
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, []);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const finalUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
      ? linkUrl
      : `https://${linkUrl}`;

    if (linkText.trim()) {
      const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${linkText}</a>`;
      executeCommand('insertHTML', linkHtml);
    } else {
      executeCommand('createLink', finalUrl);
    }
    setLinkUrl('');
    setLinkText('');
    setIsLinkModalOpen(false);
  };

  const handleInsertImageFromUrl = () => {
    if (!imageUrl.trim()) return;
    const imgHtml = `
      <div style="text-align: center; margin: 16px 0;">
        <img src="${imageUrl}" alt="تصویر آموزشی" style="max-width: 100%; height: auto; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: inline-block;" />
      </div><p><br></p>
    `;
    executeCommand('insertHTML', imgHtml);
    setImageUrl('');
    setIsImageModalOpen(false);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      const imgHtml = `
        <div style="text-align: center; margin: 16px 0;">
          <img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: inline-block;" />
        </div><p><br></p>
      `;
      executeCommand('insertHTML', imgHtml);
      setIsImageModalOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInsertVideoFromUrl = () => {
    if (!videoModalUrl.trim()) return;
    const url = videoModalUrl.trim();

    let videoHtml = '';
    if (url.includes('aparat.com')) {
      const match = url.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/);
      const embedSrc = match && match[1]
        ? `https://www.aparat.com/video/video/embed/videohash/${match[1]}/vt/frame`
        : url;
      videoHtml = `
        <div style="position: relative; width: 100%; aspect-ratio: 16/9; margin: 16px 0; border-radius: 14px; overflow: hidden; background: #000; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
          <iframe src="${embedSrc}" title="ویدئو آموزشی" style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
        </div><p><br></p>
      `;
    } else {
      videoHtml = `
        <div style="margin: 16px 0; border-radius: 14px; overflow: hidden; background: #000; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
          <video src="${url}" controls style="width: 100%; aspect-ratio: 16/9; display: block; border-radius: 14px;"></video>
        </div><p><br></p>
      `;
    }

    executeCommand('insertHTML', videoHtml);
    setVideoModalUrl('');
    setIsVideoModalOpen(false);
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      const videoHtml = `
        <div style="margin: 16px 0; border-radius: 14px; overflow: hidden; background: #000; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
          <video src="${dataUrl}" controls style="width: 100%; aspect-ratio: 16/9; display: block; border-radius: 14px;"></video>
        </div><p><br></p>
      `;
      executeCommand('insertHTML', videoHtml);
      setIsVideoModalOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getEditorContent = () => {
    return editorRef.current ? editorRef.current.innerHTML : '';
  };

  const handleSaveArticle = () => {
    if (!title.trim()) {
      alert('لطفاً عنوان مطلب آموزشی را وارد فرمایید.');
      return;
    }
    const htmlContent = getEditorContent();
    if (!htmlContent.trim() || htmlContent === '<p><br></p>') {
      alert('محتوای متنی مطلب آموزشی نمی‌تواند خالی باشد.');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      content: htmlContent,
      videoUrl: featuredVideoUrl.trim() || undefined,
      month: initialMonth || 'عمومی',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl mx-auto overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoFileUpload}
        accept="video/*"
        className="hidden"
      />

      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>📝 نگارش و طراحی مطلب آموزشی چندرسانه‌ای</span>
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">
            امکان قالب‌بندی پیشرفته متن (Word)، افزودن عکس، درج مستقیم و آپلود فیلم با پلیر واکنش‌گرا (چینش بر اساس تاریخ انتشار)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition"
          >
            انصراف
          </button>
          <button
            onClick={handleSaveArticle}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md text-xs sm:text-sm transition-all"
          >
            <SaveIcon className="w-4 h-4 text-slate-900" />
            <span>ذخیره مطلب</span>
          </button>
        </div>
      </div>

      {/* Basic Info (Title, Summary, Featured Video) */}
      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-750/50 border-b border-slate-200 dark:border-slate-700 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            عنوان مطلب آموزشی: <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="مثال: دستورالعمل تزریقات ایمن و پیشگیری از نیدل‌استیک"
            className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              خلاصه یا توضیح کوتاه مطلب:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="توضیح مختصری درباره اهداف آموزشی این درس بنویسید..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              لینک ویدئو اصلی شاخص (اختیاری):
            </label>
            <input
              type="text"
              value={featuredVideoUrl}
              onChange={e => setFeaturedVideoUrl(e.target.value)}
              placeholder="لینک مستقیم mp4 یا صفحه آپارات (مثال: https://www.aparat.com/v/...)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 font-mono text-left focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              در صورت وارد کردن، یک پلیر مدرن ویدیویی در بالای صفحه این مطلب برای پرسنل نمایش داده می‌شود.
            </p>
          </div>
        </div>
      </div>

      {/* Editor / Preview Tab Switcher */}
      <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 font-bold text-xs sm:text-sm rounded-t-xl transition border-b-2 ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 border-sky-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            ✏️ ویرایشگر محتوا (Word)
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 font-bold text-xs sm:text-sm rounded-t-xl transition border-b-2 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 border-sky-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900'
            }`}
          >
            👁️ پیش‌نمایش نهایی
          </button>
        </div>

        {activeTab === 'preview' && (
          <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`px-2.5 py-1 rounded-lg transition ${
                previewDevice === 'desktop'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              💻 کامپیوتر
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`px-2.5 py-1 rounded-lg transition ${
                previewDevice === 'mobile'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              📱 موبایل
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: WYSIWYG WORD-LIKE EDITOR */}
      {/* ========================================================= */}
      {activeTab === 'editor' && (
        <div className="p-3 sm:p-5 space-y-3">
          {/* WORD-LIKE TOOLBAR */}
          <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
            {/* Heading format */}
            <select
              onChange={e => executeCommand('formatBlock', e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold focus:outline-none"
              defaultValue="<p>"
            >
              <option value="<p>">متن عادی</option>
              <option value="<h1>">سرتیتر بزرگ (H1)</option>
              <option value="<h2>">سرتیتر متوسط (H2)</option>
              <option value="<h3>">سرتیتر کوچک (H3)</option>
            </select>

            {/* Font Size */}
            <select
              onChange={e => executeCommand('fontSize', e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold focus:outline-none"
              defaultValue="3"
            >
              <option value="2">اندازه ریز</option>
              <option value="3">اندازه معمولی</option>
              <option value="4">اندازه درشت</option>
              <option value="5">اندازه خیلی بزرگ</option>
            </select>

            <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></span>

            {/* BOLD, ITALIC, UNDERLINE, STRIKE */}
            <button
              type="button"
              onClick={() => executeCommand('bold')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-extrabold flex items-center justify-center text-sm"
              title="پررنگ (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 italic font-serif flex items-center justify-center text-sm"
              title="مورب (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 underline font-semibold flex items-center justify-center text-sm"
              title="زیرخط (Ctrl+U)"
            >
              U
            </button>
            <button
              type="button"
              onClick={() => executeCommand('strikeThrough')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 line-through font-semibold flex items-center justify-center text-sm"
              title="خط‌خورده"
            >
              S
            </button>

            <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></span>

            {/* ALIGNMENTS: RIGHT, CENTER, LEFT, JUSTIFY */}
            <button
              type="button"
              onClick={() => executeCommand('justifyRight')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
              title="راست‌چین (فارسی)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyCenter')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
              title="وسط‌چین"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyLeft')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
              title="چپ‌چین"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 15H3v2h12v-2zm6 4H3v2h18v-2zM3 13h18v-2H3v2zm12-6H3v2h12V7zM3 3v2h18V3H3z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyFull')}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
              title="هم‌تراز (تراز دوطرفه)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z" />
              </svg>
            </button>

            <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></span>

            {/* COLOR PALETTE */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500">رنگ:</span>
              {QUICK_COLORS.slice(0, 5).map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => executeCommand('foreColor', c.value)}
                  style={{ backgroundColor: c.value }}
                  className="w-5 h-5 rounded-full border border-white/60 shadow-xs hover:scale-110 transition-transform"
                  title={c.name}
                />
              ))}
              <input
                type="color"
                onChange={e => executeCommand('foreColor', e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer p-0 bg-transparent"
                title="انتخاب رنگ دلخواه"
              />
            </div>

            <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></span>

            {/* LISTS */}
            <button
              type="button"
              onClick={() => executeCommand('insertUnorderedList')}
              className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1 font-bold"
              title="لیست بالت‌دار"
            >
              <span>•</span>
              <span className="hidden sm:inline">نشانه‌دار</span>
            </button>
            <button
              type="button"
              onClick={() => executeCommand('insertOrderedList')}
              className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1 font-bold"
              title="لیست عددی"
            >
              <span>۱.</span>
              <span className="hidden sm:inline">شماره‌دار</span>
            </button>

            <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></span>

            {/* INSERT LINK, IMAGE, VIDEO */}
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 font-bold flex items-center gap-1 border border-sky-200 dark:border-sky-800"
              title="افزودن لینک به نوشته"
            >
              <span>🔗</span>
              <span>لینک</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImageModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
              title="افزودن عکس (آپلود یا لینک)"
            >
              <span>🖼️</span>
              <span>عکس</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVideoModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold flex items-center gap-1 border border-purple-200 dark:border-purple-800"
              title="افزودن فیلم (آپلود، آپارات یا لینک)"
            >
              <span>🎥</span>
              <span>فیلم</span>
            </button>

            {/* Clear formatting */}
            <button
              type="button"
              onClick={() => executeCommand('removeFormat')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs ml-auto"
              title="حذف قالب‌بندی"
            >
              پاک‌سازی
            </button>
          </div>

          {/* EDITABLE SURFACE */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full min-h-[380px] p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 overflow-y-auto text-right text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed space-y-3 font-sans"
            style={{ direction: 'rtl' }}
            data-placeholder="شروع به نگارش متن آموزشی کنید... با استفاده از نوار ابزار بالا می‌توانید تیتر، رنگ، عکس و فیلم اضافه کنید."
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LIVE PREVIEW (DESKTOP & MOBILE SIMULATION) */}
      {/* ========================================================= */}
      {activeTab === 'preview' && (
        <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-900 flex justify-center">
          <div
            className={`transition-all duration-300 bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 ${
              previewDevice === 'mobile'
                ? 'w-full max-w-[390px] border-4 border-slate-400 dark:border-slate-600 rounded-[38px] p-4 min-h-[600px]'
                : 'w-full max-w-4xl'
            }`}
          >
            {previewDevice === 'mobile' && (
              <div className="w-24 h-4 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4"></div>
            )}
            <RichArticleViewer
              title={title || 'عنوان نمونه مطلب آموزشی'}
              description={description}
              content={getEditorContent() || '<p className="text-slate-400">متنی برای پیش‌نمایش وارد نشده است.</p>'}
              videoUrl={featuredVideoUrl}
            />
          </div>
        </div>
      )}

      {/* MODAL 1: INSERT LINK */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              🔗 درج پیوند اینترنتی (لینک)
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                متن نمایشی پیوند:
              </label>
              <input
                type="text"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                placeholder="مثال: دانلود دستورالعمل کشوری"
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                آدرس اینترنتی (URL):
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-mono text-left"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={handleInsertLink}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 rounded-xl"
              >
                درج پیوند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSERT IMAGE (UPLOAD OR URL) */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              🖼️ افزودن تصویر بین نوشته‌ها
            </h3>

            {/* Option A: Upload */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                روش اول: انتخاب و آپلود فایل عکس از گوشی یا رایانه
              </span>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>📁 انتخاب فایل عکس</span>
              </button>
            </div>

            {/* Option B: Direct URL */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                روش دوم: دادن لینک مستقیم تصویر
              </span>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-mono text-left"
              />
              <button
                onClick={handleInsertImageFromUrl}
                disabled={!imageUrl.trim()}
                className="w-full py-2 bg-sky-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition"
              >
                درج عکس از لینک
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INSERT VIDEO (UPLOAD, APARAT, OR URL) */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              🎥 افزودن فیلم بین نوشته‌ها
            </h3>

            {/* Option A: Upload */}
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
              <span className="block text-xs font-bold text-purple-900 dark:text-purple-200 mb-2">
                روش اول: انتخاب و آپلود فایل ویدئو از دستگاه
              </span>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>🎬 انتخاب فایل ویدئو (MP4 / WebM)</span>
              </button>
            </div>

            {/* Option B: Direct URL or Aparat */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                روش دوم: لینک مستقیم ویدئو یا اشتراک آپارات
              </span>
              <input
                type="text"
                value={videoModalUrl}
                onChange={e => setVideoModalUrl(e.target.value)}
                placeholder="https://www.aparat.com/v/... یا فایل mp4"
                className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-mono text-left"
              />
              <button
                onClick={handleInsertVideoFromUrl}
                disabled={!videoModalUrl.trim()}
                className="w-full py-2 bg-sky-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition"
              >
                درج فیلم از لینک
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichArticleEditor;
