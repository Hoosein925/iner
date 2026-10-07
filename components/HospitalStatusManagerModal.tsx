import React, { useState, useMemo } from 'react';
import { Hospital } from '../types';
import { BackIcon } from './icons/BackIcon';

interface HospitalStatusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  provinces: string[];
  onToggleHospitalStatus: (hospitalId: string, isActive: boolean) => Promise<void> | void;
}

export const HospitalStatusManagerModal: React.FC<HospitalStatusManagerModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  provinces,
  onToggleHospitalStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loadingHospitalId, setLoadingHospitalId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter hospitals based on search, province, and status
  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => {
      const isActive = h.isActive !== false;

      // Status filter
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      // Province filter
      if (selectedProvinceFilter !== 'all' && h.province !== selectedProvinceFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesCity = h.city.toLowerCase().includes(q);
        const matchesProvince = h.province.toLowerCase().includes(q);
        const matchesSupervisor = h.supervisorName?.toLowerCase().includes(q);
        return matchesName || matchesCity || matchesProvince || Boolean(matchesSupervisor);
      }

      return true;
    });
  }, [hospitals, searchQuery, selectedProvinceFilter, statusFilter]);

  // Group filtered hospitals by Province
  const groupedByProvince = useMemo(() => {
    const groups: Record<string, Hospital[]> = {};

    filteredHospitals.forEach(h => {
      const prov = h.province || 'سایر استان‌ها';
      if (!groups[prov]) {
        groups[prov] = [];
      }
      groups[prov].push(h);
    });

    return groups;
  }, [filteredHospitals]);

  // Total summary statistics
  const totalCount = hospitals.length;
  const activeCount = hospitals.filter(h => h.isActive !== false).length;
  const inactiveCount = hospitals.filter(h => h.isActive === false).length;

  const handleToggle = async (hospital: Hospital) => {
    const currentActive = hospital.isActive !== false;
    const newActive = !currentActive;

    if (!newActive) {
      const confirmed = window.confirm(
        `آیا از غیرفعال‌سازی بیمارستان «${hospital.name}» مطمئن هستید؟\n\n` +
        `با این کار دسترسی سوپروایزر، مسئولین بخش‌ها و پرسنل این مرکز موقتاً مسدود می‌شود و هنگام ورود پیام دسترسی غیرفعال دریافت خواهند کرد.\n\n` +
        `✓ توجه: تمامی داده‌ها، بخش‌ها، آزمون‌ها و ارزیابی‌های این بیمارستان در پایگاه‌داده کاملاً محفوظ می‌ماند.`
      );
      if (!confirmed) return;
    }

    setLoadingHospitalId(hospital.id);
    try {
      await onToggleHospitalStatus(hospital.id, newActive);
    } finally {
      setLoadingHospitalId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto font-sans">
      {/* Sticky Top Header with Back Navigation */}
      <div className="sticky top-0 z-10 bg-gradient-to-l from-blue-700 via-indigo-700 to-purple-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs sm:text-sm font-black transition active:scale-95 text-white shadow-xs"
          >
            <BackIcon className="w-4 h-4" />
            <span>بازگشت به پنل ادمین</span>
          </button>

          <div className="text-left sm:text-right">
            <h2 className="text-sm sm:text-base font-black flex items-center gap-1.5 justify-end">
              <span>🏥 مدیریت و پایش وضعیت بیمارستان‌ها</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-blue-100 font-medium">
              فعال‌سازی یا غیرفعال‌سازی دسترسی کاربران بیمارستان با حفظ ۱۰۰٪ داده‌ها
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5 text-right">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-lg sm:text-xl flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              🏥
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">کل بیمارستان‌ها</span>
              <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {totalCount} مرکز
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-300/80 dark:border-emerald-700 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-lg sm:text-xl flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              ✓
            </div>
            <div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">مراکز فعال</span>
              <span className="text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {activeCount} فعال
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-rose-300/80 dark:border-rose-700 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-lg sm:text-xl flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              ⛔
            </div>
            <div>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block">مراکز غیرفعال</span>
              <span className="text-base sm:text-xl font-black text-rose-700 dark:text-rose-300 font-mono">
                {inactiveCount} غیرفعال
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-200/90 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-lg sm:text-xl flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
              🗺️
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">استان‌های دارای مرکز</span>
              <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {Object.keys(groupedByProvince).length} استان
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 جستجوی نام بیمارستان، شهر یا نام سوپروایزر..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Province Filter */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">استان:</span>
              <select
                value={selectedProvinceFilter}
                onChange={e => setSelectedProvinceFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">🌟 همه استان‌ها</option>
                {provinces.map(p => (
                  <option key={p} value={p}>
                    {p} ({hospitals.filter(h => h.province === p).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">وضعیت:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="active">فقط فعال‌ها ({activeCount})</option>
                <option value="inactive">فقط غیرفعال‌ها ({inactiveCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs leading-relaxed flex items-start gap-2.5">
          <span className="text-base shrink-0">🛡️</span>
          <div>
            <strong className="block mb-0.5">ضمانت کامل امنیت داده‌ها در زمان غیرفعال بودن:</strong>
            با غیرفعال کردن هر بیمارستان، تمامی بخش‌ها، پرسنل، کارنامه‌ها، ارزیابی‌های مهارت، مقالات و نتایج آزمون‌های آن بیمارستان کاملاً دست‌نخورده در دیتابیس محفوظ می‌ماند. صرفاً ورود سوپروایزر، مسئول بخش و کادر درمان به سامانه مسدود می‌شود و پس از فعال‌سازی مجدد، دسترسی آنها بی‌درنگ بازیابی خواهد شد.
          </div>
        </div>

        {/* Grouped Hospital List by Province */}
        {Object.keys(groupedByProvince).length === 0 ? (
          <div className="p-10 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <span className="text-4xl block">🔍</span>
            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
              هیچ بیمارستانی با فیلترهای انتخاب‌شده یافت نشد.
            </p>
            <p className="text-xs text-slate-400">
              می‌توانید کلمه جستجو یا فیلتر استان و وضعیت را تغییر دهید.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByProvince).map(([provinceName, hospList]) => {
              const provActive = hospList.filter(h => h.isActive !== false).length;
              const provInactive = hospList.filter(h => h.isActive === false).length;

              return (
                <div
                  key={provinceName}
                  className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                  {/* Province Header Ribbon */}
                  <div className="bg-slate-100/80 dark:bg-slate-750 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        {provinceName.slice(0, 1)}
                      </span>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        استان {provinceName}
                      </h3>
                      <span className="text-xs text-slate-500 font-bold">
                        ({hospList.length} بیمارستان)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {provActive} فعال
                      </span>
                      {provInactive > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          {provInactive} غیرفعال
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hospitals Grid in Province */}
                  <div className="p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {hospList.map(h => {
                      const isActive = h.isActive !== false;
                      const isLoading = loadingHospitalId === h.id;
                      const staffCount = h.departments.reduce((acc, d) => acc + (d.staff?.length || 0), 0);

                      return (
                        <div
                          key={h.id}
                          className={`rounded-2xl border-2 p-4 flex flex-col justify-between transition-all ${
                            isActive
                              ? 'bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-400'
                              : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-xs'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Top row with status badge */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[11px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 shadow-2xs ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                <span>{isActive ? '● فعال' : '⛔ غیرفعال (دسترسی مسدود)'}</span>
                              </span>

                              <span className="text-[10px] text-slate-400 font-mono">
                                {h.city}
                              </span>
                            </div>

                            {/* Hospital title */}
                            <div>
                              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                {h.name}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                سوپروایزر: <strong>{h.supervisorName || 'تعریف‌نشده'}</strong>
                              </p>
                            </div>

                            {/* Dept & Staff stats */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/70 dark:border-slate-700">
                              <span>🏥 {h.departments.length} بخش درمانی</span>
                              <span>👥 {staffCount} پرسنل</span>
                            </div>

                            {/* Status message */}
                            {!isActive && (
                              <div className="p-2 bg-rose-100/70 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 text-[10px] rounded-xl font-bold leading-tight">
                                پیام نمایش داده‌شده به کاربران این مرکز هنگام ورود:
                                <br />
                                «دسترسی شما بصورت موقت غیرفعال شده است و برای کسب اطلاعات بیشتر با مدیریت سامانه تماس بگیرید»
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="pt-3.5 mt-2 border-t border-slate-200/70 dark:border-slate-700">
                            <button
                              onClick={() => handleToggle(h)}
                              disabled={isLoading}
                              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                                isActive
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isLoading ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>در حال به‌روزرسانی...</span>
                                </>
                              ) : isActive ? (
                                <>
                                  <span>⛔ غیرفعال‌سازی موقت دسترسی</span>
                                </>
                              ) : (
                                <>
                                  <span>✓ فعال‌سازی مجدد دسترسی بیمارستان</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalStatusManagerModal;
