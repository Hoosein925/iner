import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface AppIconManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconUrl?: string;
  onSaveIcon: (iconUrl: string) => void;
}

const PRESET_ICONS = [
  {
    name: 'لوگوی رسمی بیمارستان و بالینی',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%232563eb"><rect width="100" height="100" rx="22" fill="%231e40af"/><path d="M50 20 L50 80 M20 50 L80 50" stroke="white" stroke-width="14" stroke-linecap="round"/><circle cx="50" cy="50" r="12" fill="%23f59e0b"/></svg>',
  },
  {
    name: 'نماد نبض و قلب سلامت (قرمز)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23dc2626"/><path d="M15 52 L35 52 L42 25 L54 75 L62 42 L68 52 L85 52" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    name: 'سپر ایمنی و اعتباربخشی (سبز)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23059669"/><path d="M50 18 L76 28 C76 56 50 78 50 78 C50 78 24 56 24 28 Z" fill="white"/><path d="M42 48 L48 54 L62 38" fill="none" stroke="%23059669" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    name: 'هوش مصنوعی و داده بالینی (بنفش)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%237c3aed"/><circle cx="50" cy="50" r="22" fill="none" stroke="white" stroke-width="6"/><circle cx="50" cy="50" r="8" fill="%23f59e0b"/><line x1="50" y1="16" x2="50" y2="28" stroke="white" stroke-width="5" stroke-linecap="round"/><line x1="50" y1="72" x2="50" y2="84" stroke="white" stroke-width="5" stroke-linecap="round"/><line x1="16" y1="50" x2="28" y2="50" stroke="white" stroke-width="5" stroke-linecap="round"/><line x1="72" y1="50" x2="84" y2="50" stroke="white" stroke-width="5" stroke-linecap="round"/></svg>',
  },
];

export const AppIconManagerModal: React.FC<AppIconManagerModalProps> = ({
  isOpen,
  onClose,
  currentIconUrl,
  onSaveIcon,
}) => {
  const [selectedIcon, setSelectedIcon] = useState<string>(
    currentIconUrl || PRESET_ICONS[0].url
  );
  const [activeDeviceTab, setActiveDeviceTab] = useState<'iphone' | 'android' | 'desktop'>('iphone');

  useEffect(() => {
    if (currentIconUrl) setSelectedIcon(currentIconUrl);
  }, [currentIconUrl]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) setSelectedIcon(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    onSaveIcon(selectedIcon);
    alert('آیکون سامانه با موفقیت برای تمامی ابعاد و دستگاه‌ها (کامپیوتر، آیفون و اندروید) تنظیم شد.');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تنظیم و سفارشی‌سازی آیکون برنامه (App Icon)" maxWidthClass="max-w-4xl">
      <div className="space-y-4 sm:space-y-6 text-right font-sans max-w-full overflow-hidden">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          می‌توانید تصویر دلخواه (PNG, JPG, SVG) بارگذاری کرده یا از نمادهای آماده سازمانی انتخاب کنید. سامانه به طور خودکار آیکون را برای نمایش در <strong>تب مرورگر کامپیوتر (Favicon)</strong>، <strong>صفحه اصلی آیفون و آیپد (Apple Touch Icon)</strong> و <strong>موبایل اندروید (PWA App Icon)</strong> تنظیم می‌کند.
        </p>

        {/* Upload Box & Presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border-2 border-dashed border-sky-400 dark:border-sky-500/50 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-md mb-2.5 border border-slate-200 dark:border-slate-700 bg-white">
              <img src={selectedIcon} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <label className="cursor-pointer px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95">
              <span>بارگذاری آیکون از دستگاه...</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5">فرمت‌های PNG، JPG، SVG و WebP</span>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">یا انتخاب از نمادهای پیشنهادی:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_ICONS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIcon(p.url)}
                  className={`p-2 rounded-xl border text-right flex items-center gap-2 transition ${
                    selectedIcon === p.url
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <img src={p.url} alt={p.name} className="w-7 h-7 rounded-lg shrink-0" />
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Device Simulator - 100% Mobile Responsive */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl space-y-3 sm:space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
            <h4 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
              <span>📱 پیش‌نمایش در دستگاه‌ها:</span>
            </h4>
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => setActiveDeviceTab('iphone')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition text-center ${
                  activeDeviceTab === 'iphone' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                آیفون (iOS)
              </button>
              <button
                onClick={() => setActiveDeviceTab('android')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition text-center ${
                  activeDeviceTab === 'android' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                اندروید
              </button>
              <button
                onClick={() => setActiveDeviceTab('desktop')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition text-center ${
                  activeDeviceTab === 'desktop' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                تب کامپیوتر
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center py-4 sm:py-6 max-w-full overflow-hidden">
            {activeDeviceTab === 'iphone' && (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[22px] overflow-hidden shadow-2xl bg-white border border-white/20 transform transition hover:scale-105">
                  <img src={selectedIcon} alt="iOS App Icon" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-slate-200">سامانه جهش</span>
                <span className="text-[10px] text-sky-400 font-mono">Apple Touch Icon (180x180)</span>
              </div>
            )}

            {activeDeviceTab === 'android' && (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-2xl bg-white border-2 border-slate-700 transform transition hover:scale-105">
                  <img src={selectedIcon} alt="Android App Icon" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-slate-200">سامانه جهش</span>
                <span className="text-[10px] text-emerald-400 font-mono">Android Adaptive Icon (192x192)</span>
              </div>
            )}

            {activeDeviceTab === 'desktop' && (
              <div className="w-full max-w-md bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
                <div className="bg-slate-750 px-2.5 py-2 flex items-center gap-2 border-b border-slate-700">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  </div>
                  <div className="bg-slate-900 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs text-slate-200 min-w-0 flex-1 truncate shadow-xs">
                    <img src={selectedIcon} alt="Favicon" className="w-4 h-4 rounded-xs shrink-0" />
                    <span className="truncate text-[11px] sm:text-xs">سامانه جهش | مدیریت بیمارستانی</span>
                  </div>
                </div>
                <div className="p-3 text-center text-xs text-slate-400">
                  Favicon تب مرورگر کامپیوتر در ابعاد ۳۲×۳۲ و ۶۴×۶۴ پیکسل
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition text-center"
          >
            انصراف
          </button>
          <button
            onClick={handleApply}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all text-center"
          >
            ✓ ذخیره و اعمال به تمام دستگاه‌ها
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AppIconManagerModal;
