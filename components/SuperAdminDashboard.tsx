import React, { useState } from 'react';
import {
  Hospital,
  ArchivedArticleTemplate,
  NamedChecklistTemplate,
  ExamTemplate,
  ProvincialOfficer,
  AppAboutInfo,
} from '../types';
import AppIconManagerModal from './AppIconManagerModal';
import ProvincialOfficersModal from './ProvincialOfficersModal';
import ProvincesManagerModal from './ProvincesManagerModal';
import DatabaseSqlModal from './DatabaseSqlModal';
import ContentInjectionModal from './ContentInjectionModal';
import EditAboutModal from './EditAboutModal';
import HospitalsManagementModal from './HospitalsManagementModal';

interface SuperAdminDashboardProps {
  hospitals: Hospital[];
  provinces: string[];
  officers: ProvincialOfficer[];
  archivedArticles: ArchivedArticleTemplate[];
  archivedChecklists?: NamedChecklistTemplate[];
  archivedExams?: ExamTemplate[];
  aboutInfo: AppAboutInfo;
  appIconUrl?: string;
  onSaveAppIcon: (iconUrl: string) => void;
  onAddProvince: (provinceName: string) => void;
  onDeleteProvince: (provinceName: string) => void;
  onAddOfficer: (officer: Omit<ProvincialOfficer, 'id' | 'createdAt'>) => void;
  onDeleteOfficer: (id: string) => void;
  onSaveAboutInfo: (info: AppAboutInfo) => void;
  onInjectArticle: (hospitalId: string, departmentId: string | 'all', article: ArchivedArticleTemplate) => void;
  onInjectChecklist: (hospitalId: string, departmentId: string | 'all', checklist: NamedChecklistTemplate) => void;
  onInjectExam: (hospitalId: string, departmentId: string | 'all', exam: ExamTemplate) => void;
  onOpenChat: () => void;
  onGoToHospitalList: (filterProvince?: string) => void;
  onToggleHospitalStatus?: (hospitalId: string, isActive: boolean) => Promise<void> | void;
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  hospitals,
  provinces,
  officers,
  archivedArticles,
  archivedChecklists = [],
  archivedExams = [],
  aboutInfo,
  appIconUrl,
  onSaveAppIcon,
  onAddProvince,
  onDeleteProvince,
  onAddOfficer,
  onDeleteOfficer,
  onSaveAboutInfo,
  onInjectArticle,
  onInjectChecklist,
  onInjectExam,
  onOpenChat,
  onGoToHospitalList,
  onToggleHospitalStatus,
  onLogout,
}) => {
  const [isHospitalsModalOpen, setIsHospitalsModalOpen] = useState(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [isOfficersModalOpen, setIsOfficersModalOpen] = useState(false);
  const [isProvincesModalOpen, setIsProvincesModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Compute key metrics
  const totalHospitals = hospitals.length;
  const activeHospitalsCount = hospitals.filter(h => h.isActive !== false).length;
  const inactiveHospitalsCount = hospitals.filter(h => h.isActive === false).length;
  const totalDepartments = hospitals.reduce((acc, h) => acc + (h.departments?.length || 0), 0);
  const totalStaff = hospitals.reduce(
    (acc, h) =>
      acc + (h.departments || []).reduce((dAcc, d) => dAcc + (d.staff?.length || 0), 0),
    0
  );
  const totalMessages = hospitals.reduce((acc, h) => acc + (h.adminMessages?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-16">
      {/* Top Header - Vibrant, prominent banner matching Staff/Department view */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-lg sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/20 shadow-md flex items-center justify-center shrink-0">
              {appIconUrl ? (
                <img src={appIconUrl} alt="App Icon" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-2xl">⚡</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                  پنل فرماندهی ادمین کل سامانه جهش
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black shadow-xs">
                  مدیر ارشد
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium leading-tight mt-0.5">
                مدیریت سراسری بیمارستان‌ها، معاونت‌های درمان، دیتابیس و تزریق محتوا
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
            <button
              onClick={() => onGoToHospitalList()}
              className="flex-1 sm:flex-initial px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>🏥 ورود به لیست بیمارستان‌ها</span>
              <span>←</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center justify-center gap-1 active:scale-95 shrink-0"
              title="خروج از حساب کاربری"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-6 sm:space-y-8">
        {/* KPI Summary Cards - Light, Crisp, High-Contrast */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center gap-3 transition hover:shadow-md">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-700">
              🏥
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-0.5">کل بیمارستان‌ها</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{totalHospitals} مرکز</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">({activeHospitalsCount} فعال{inactiveHospitalsCount > 0 ? `، ${inactiveHospitalsCount} مسدود` : ''})</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center gap-3 transition hover:shadow-md">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-700">
              🗺️
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-0.5">استان‌های تحت پوشش</span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{provinces.length} استان</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center gap-3 transition hover:shadow-md">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-700">
              👥
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-0.5">کارشناسان معاونت</span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{officers.length} نفر</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center gap-3 transition hover:shadow-md">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-700">
              💬
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-0.5">پیام‌های مبادله‌شده</span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{totalMessages} پیام</span>
            </div>
          </div>
        </div>

        {/* 8 Core Action Hub Grid - Styled exactly like Staff Member View Buttons */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🎛️ میز کارهای مدیریتی ادمین کل:</span>
            </h2>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              ۸ ابزار راهبردی و فرماندهی سامانه جهش
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* 1. Hospitals Management (Active / Inactive) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-emerald-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-3xl shadow-sm border border-emerald-200 dark:border-emerald-700 shrink-0">
                    🏥
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {activeHospitalsCount} فعال {inactiveHospitalsCount > 0 ? `| ${inactiveHospitalsCount} غیرفعال` : ''}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    مدیریت بیمارستان‌ها
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    کنترل وضعیت فعالیت بیمارستان‌ها بر اساس استان؛ فعال یا تعلیق موقت ورود سوپروایزر و پرسنل با حفظ کامل دیتابیس
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsHospitalsModalOpen(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>ورود به مدیریت بیمارستان‌ها</span>
                <span>←</span>
              </button>
            </div>

            {/* 2. Chat with Hospitals (iMessage style) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-blue-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center text-3xl shadow-sm border border-blue-200 dark:border-blue-700 shrink-0">
                    💬
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    طرح iMessage
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    تماس و گفت‌وگو با بیمارستان‌ها
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    محیط چت دوطرفه با طراحی مدرن اپل، ارسال عکس و فایل و همگام‌سازی خودکار هر ۳ ثانیه با دیتابیس
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenChat}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>ورود به چت بیمارستان‌ها</span>
                <span>←</span>
              </button>
            </div>

            {/* 2. App Icon Manager */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-purple-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center text-3xl shadow-sm border border-purple-200 dark:border-purple-700 shrink-0">
                    📱
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    iOS / Android / PC
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                    آیکون برنامه
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    تنظیم آیکون سفارشی با شبیه‌ساز واقعی نمایش در آیفون، اندروید و تب مرورگر کامپیوتر
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsIconModalOpen(true)}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>تنظیم آیکون سامانه</span>
                <span>←</span>
              </button>
            </div>

            {/* 3. Provincial Officers Manager */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-emerald-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-3xl shadow-sm border border-emerald-200 dark:border-emerald-700 shrink-0">
                    🏛️
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {officers.length} کارشناس فعال
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    کارشناسان معاونت درمان
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    تعریف کارشناس استانی با کد ملی و رمز عبور؛ اتصال مستقیم کارشناس به بیمارستان‌های استان خود
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOfficersModalOpen(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>مدیریت کارشناسان استان</span>
                <span>←</span>
              </button>
            </div>

            {/* 4. Provinces Manager */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-amber-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-3xl shadow-sm border border-amber-200 dark:border-amber-700 shrink-0">
                    🗺️
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {provinces.length} استان
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                    مدیریت استان‌ها
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    تعریف استان‌های جدید و تفکیک استانی؛ با لمس هر استان، بیمارستان‌های آن بالا می‌آیند
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsProvincesModalOpen(true)}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>مشاهده و تعریف استان‌ها</span>
                <span>←</span>
              </button>
            </div>

            {/* 5. Database SQL Scripts */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-cyan-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-3xl shadow-sm border border-cyan-200 dark:border-cyan-700 shrink-0">
                    🗄️
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    SQL DDL
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
                    دیتابیس (سوپابیس و سی‌پنل)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    کدهای آماده SQL طبق آخرین تغییرات برنامه؛ یک‌کلیک برای کپی اسکریپت‌های Supabase و cPanel
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSqlModalOpen(true)}
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>دریافت کدهای SQL دیتابیس</span>
                <span>←</span>
              </button>
            </div>

            {/* 6. Content Injection (Articles, Checklists, Exams) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-rose-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center text-3xl shadow-sm border border-rose-200 dark:border-rose-700 shrink-0">
                    💉
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    تزریق محتوا
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                    تزریق آموزش، چک‌لیست و آزمون
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                    تزریق مستقیم مطالب چندرسانه‌ای ذخیره‌شده، چک‌لیست‌های الگو یا آزمون‌ها به بیمارستان یا بخش دلخواه
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsInjectionModalOpen(true)}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <span>تزریق مستقیم به بیمارستان</span>
                <span>←</span>
              </button>
            </div>

            {/* 7. Edit About Us */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between text-right group hover:border-teal-500 sm:col-span-2 lg:col-span-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300 flex items-center justify-center text-3xl shadow-sm border border-teal-200 dark:border-teal-700 shrink-0">
                    ℹ️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                        ویرایش و تنظیم بخش «درباره سامانه»
                      </h3>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        شخصی‌سازی
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl font-medium">
                      سفارشی‌سازی متن معرفی سامانه، ثبت مشخصات نسخه نرم‌افزار، مراجع علمی اعتباربخشی و اطلاعات پدیدآورنده
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAboutModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center justify-center gap-2 shrink-0"
                >
                  <span>ویرایش متون درباره ما</span>
                  <span>✏️</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Province-to-Hospital Showcase */}
        <section className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                دسترسی سریع به بیمارستان‌ها بر اساس استان:
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                برای باز کردن و بررسی بیمارستان‌های هر استان روی آن کلیک کنید
              </p>
            </div>

            <button
              onClick={() => onGoToHospitalList()}
              className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>مشاهده تمام بیمارستان‌ها</span>
              <span>←</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {provinces.map(p => {
              const hCount = hospitals.filter(h => h.province === p).length;
              return (
                <button
                  key={p}
                  onClick={() => onGoToHospitalList(p)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-600 hover:border-blue-400 transition text-xs sm:text-sm font-bold flex items-center gap-2 group shadow-xs active:scale-95"
                >
                  <span>{p}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-mono font-bold">
                    {hCount}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Modals */}
      <HospitalsManagementModal
        isOpen={isHospitalsModalOpen}
        onClose={() => setIsHospitalsModalOpen(false)}
        hospitals={hospitals}
        provinces={provinces}
        onToggleHospitalStatus={async (hospitalId, isActive) => {
          if (onToggleHospitalStatus) {
            await onToggleHospitalStatus(hospitalId, isActive);
          }
        }}
      />

      <AppIconManagerModal
        isOpen={isIconModalOpen}
        onClose={() => setIsIconModalOpen(false)}
        currentIconUrl={appIconUrl}
        onSaveIcon={onSaveAppIcon}
      />

      <ProvincialOfficersModal
        isOpen={isOfficersModalOpen}
        onClose={() => setIsOfficersModalOpen(false)}
        officers={officers}
        provinces={provinces}
        onAddOfficer={onAddOfficer}
        onDeleteOfficer={onDeleteOfficer}
      />

      <ProvincesManagerModal
        isOpen={isProvincesModalOpen}
        onClose={() => setIsProvincesModalOpen(false)}
        provinces={provinces}
        hospitals={hospitals}
        onAddProvince={onAddProvince}
        onDeleteProvince={onDeleteProvince}
        onSelectProvinceFilter={p => onGoToHospitalList(p)}
      />

      <DatabaseSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      <ContentInjectionModal
        isOpen={isInjectionModalOpen}
        onClose={() => setIsInjectionModalOpen(false)}
        hospitals={hospitals}
        archivedArticles={archivedArticles}
        archivedChecklists={archivedChecklists}
        archivedExams={archivedExams}
        onInjectArticle={onInjectArticle}
        onInjectChecklist={onInjectChecklist}
        onInjectExam={onInjectExam}
      />

      <EditAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        aboutInfo={aboutInfo}
        onSaveAboutInfo={onSaveAboutInfo}
      />
    </div>
  );
};

export default SuperAdminDashboard;
