import React, { useState, useMemo } from 'react';
import { Hospital } from '../types';
import Modal from './Modal';

interface HospitalsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  provinces: string[];
  onToggleHospitalStatus: (hospitalId: string, isActive: boolean) => Promise<void> | void;
}

export const HospitalsManagementModal: React.FC<HospitalsManagementModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  provinces,
  onToggleHospitalStatus,
}) => {
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Compute statistics
  const totalHospitals = hospitals.length;
  const activeCount = hospitals.filter(h => h.isActive !== false).length;
  const inactiveCount = hospitals.filter(h => h.isActive === false).length;

  // Filter hospitals based on province, status, and search query
  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => {
      const matchesProvince = selectedProvince === 'all' || h.province === selectedProvince;
      const isHospitalActive = h.isActive !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isHospitalActive) ||
        (statusFilter === 'inactive' && !isHospitalActive);
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        h.name.toLowerCase().includes(q) ||
        (h.city && h.city.toLowerCase().includes(q)) ||
        (h.supervisorName && h.supervisorName.toLowerCase().includes(q));

      return matchesProvince && matchesStatus && matchesSearch;
    });
  }, [hospitals, selectedProvince, statusFilter, searchQuery]);

  // Group filtered hospitals by province
  const groupedByProvince = useMemo(() => {
    const groups: { [province: string]: Hospital[] } = {};
    for (const h of filteredHospitals) {
      const prov = h.province || 'سایر استان‌ها';
      if (!groups[prov]) groups[prov] = [];
      groups[prov].push(h);
    }
    return groups;
  }, [filteredHospitals]);

  const sortedProvinces = useMemo(() => {
    return Object.keys(groupedByProvince).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [groupedByProvince]);

  const handleToggle = async (hospital: Hospital) => {
    const isCurrentlyActive = hospital.isActive !== false;
    const targetStatus = !isCurrentlyActive;

    const confirmMsg = targetStatus
      ? `آیا از فعال‌سازی مجدد بیمارستان «${hospital.name}» مطمئن هستید؟ با این کار دسترسی سوپروایزر و پرسنل بلافاصله فعال می‌شود.`
      : `آیا از غیرفعال‌سازی موقت بیمارستان «${hospital.name}» مطمئن هستید؟\n\nدسترسی پرسنل و سوپروایزر موقتاً مسدود می‌شود و هنگام ورود پیام راهنما دریافت می‌کنند. تمامی داده‌ها و دیتابیس بیمارستان محفوظ خواهد ماند.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setProcessingId(hospital.id);
      await onToggleHospitalStatus(hospital.id, targetStatus);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مدیریت و پایش وضعیت فعالیت بیمارستان‌ها"
      maxWidthClass="max-w-5xl"
    >
      <div className="space-y-4 sm:space-y-6 text-right font-sans max-w-full overflow-hidden">
        {/* Informative Guidance Banner */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-750 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
            🏥
          </div>
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed space-y-1">
            <p className="font-black text-slate-900 dark:text-white">
              کنترل سراسری دسترسی و وضعیت فعالیت بیمارستان‌ها (تفکیک استانی)
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              با <strong>غیرفعال‌سازی</strong> هر بیمارستان، ورود سوپروایزر آموزش، مسئولین بخش‌ها و پرسنل آن مرکز بلافاصله متوقف شده و با پیام «دسترسی شما بصورت موقت غیرفعال شده است...» مواجه می‌شوند.
            </p>
            <p className="text-emerald-700 dark:text-emerald-300 font-bold text-[11px] sm:text-xs">
              🛡️ در زمان غیرفعال بودن، ۱۰۰٪ اطلاعات، چک‌لیست‌ها، آزمون‌ها و دیتابیس بیمارستان محفوظ بوده و با فعال‌سازی مجدد در یک ثانیه در دسترس قرار می‌گیرد.
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">کل بیمارستان‌ها</span>
            <span className="text-base sm:text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {totalHospitals}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">فعال و مجاز</span>
            <span className="text-base sm:text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono">
              {activeCount}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-center shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">غیرفعال موقت</span>
            <span className="text-base sm:text-xl font-black text-rose-800 dark:text-rose-200 font-mono">
              {inactiveCount}
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام بیمارستان، شهر یا سوپروایزر..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Province Filter */}
            <div>
              <select
                value={selectedProvince}
                onChange={e => setSelectedProvince(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="all">همه استان‌ها ({totalHospitals} مرکز)</option>
                {provinces.map(p => {
                  const count = hospitals.filter(h => h.province === p).length;
                  return (
                    <option key={p} value={p}>
                      استان {p} ({count} بیمارستان)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="active">فقط فعال‌ها ({activeCount})</option>
                <option value="inactive">فقط غیرفعال‌ها ({inactiveCount})</option>
              </select>
            </div>
          </div>

          {/* Quick province chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
            <span className="text-slate-500 text-[11px] font-bold shrink-0 ml-1">انتخاب سریع:</span>
            <button
              onClick={() => setSelectedProvince('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition shrink-0 ${
                selectedProvince === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              همه ({totalHospitals})
            </button>
            {provinces.map(p => {
              const count = hospitals.filter(h => h.province === p).length;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedProvince(p)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition shrink-0 ${
                    selectedProvince === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grouped Hospital List */}
        <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
          {filteredHospitals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                هیچ بیمارستانی با مشخصات فیلترشده یافت نشد.
              </p>
              <button
                onClick={() => {
                  setSelectedProvince('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
              >
                پاک‌کردن فیلترها
              </button>
            </div>
          ) : (
            sortedProvinces.map(provinceName => {
              const listInProv = groupedByProvince[provinceName];
              const provActive = listInProv.filter(h => h.isActive !== false).length;
              const provInactive = listInProv.filter(h => h.isActive === false).length;

              return (
                <div
                  key={provinceName}
                  className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-3.5 sm:p-5 shadow-xs space-y-3"
                >
                  {/* Province Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        🗺️
                      </div>
                      <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        استان {provinceName}
                      </h4>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        ({listInProv.length} مرکز)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {provActive} فعال
                      </span>
                      {provInactive > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {provInactive} غیرفعال
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hospitals Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {listInProv.map(hospital => {
                      const isActive = hospital.isActive !== false;
                      const isProcessing = processingId === hospital.id;
                      const staffCount = (hospital.departments || []).reduce(
                        (acc, d) => acc + (d.staff?.length || 0),
                        0
                      );

                      return (
                        <div
                          key={hospital.id}
                          className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 ${
                            isActive
                              ? 'bg-slate-50/70 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                              : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-900/60'
                          }`}
                        >
                          {/* Hospital Info Top */}
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                                {hospital.name}
                              </h5>
                              <span
                                className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-xs border ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
                                }`}
                              >
                                {isActive ? '🟢 فعال (ورود آزاد)' : '🔴 غیرفعال (مسدود)'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                              <span>📍 شهر: <strong className="text-slate-800 dark:text-slate-100">{hospital.city || 'ثبت‌نشده'}</strong></span>
                              <span>🏢 بخش‌ها: <strong className="text-slate-800 dark:text-slate-100">{hospital.departments?.length || 0}</strong></span>
                              <span>👥 پرسنل: <strong className="text-slate-800 dark:text-slate-100">{staffCount} نفر</strong></span>
                            </div>

                            {hospital.supervisorName && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                سوپروایزر آموزش: <strong className="text-slate-700 dark:text-slate-200">{hospital.supervisorName}</strong>
                              </p>
                            )}
                          </div>

                          {/* Toggle Action Button */}
                          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                              {isActive ? 'دسترسی ورود کاربران این بیمارستان برقرار است' : 'کاربران هنگام ورود پیام غیرفعال بودن می‌بینند'}
                            </div>

                            <button
                              disabled={isProcessing}
                              onClick={() => handleToggle(hospital)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50 ${
                                isActive
                                  ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-600 dark:hover:text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                              }`}
                            >
                              {isProcessing ? (
                                <span>در حال اعمال...</span>
                              ) : isActive ? (
                                <>
                                  <span>🔒 غیرفعال‌سازی دسترسی</span>
                                </>
                              ) : (
                                <>
                                  <span>🔓 فعال‌سازی مجدد</span>
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
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            تعداد مراکز نمایش داده‌شده: <strong>{filteredHospitals.length}</strong> از <strong>{totalHospitals}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition"
          >
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default HospitalsManagementModal;
