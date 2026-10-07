import React, { useState } from 'react';
import Modal from './Modal';
import { Hospital } from '../types';

interface ProvincesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  provinces: string[];
  hospitals: Hospital[];
  onAddProvince: (provinceName: string) => void;
  onDeleteProvince: (provinceName: string) => void;
  onSelectProvinceFilter: (provinceName: string) => void;
}

export const ProvincesManagerModal: React.FC<ProvincesManagerModalProps> = ({
  isOpen,
  onClose,
  provinces,
  hospitals,
  onAddProvince,
  onDeleteProvince,
  onSelectProvinceFilter,
}) => {
  const [newProvinceName, setNewProvinceName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvinceName.trim()) return;

    if (provinces.includes(newProvinceName.trim())) {
      alert('این استان قبلاً در سیستم ثبت شده است.');
      return;
    }

    onAddProvince(newProvinceName.trim());
    setNewProvinceName('');
  };

  const getHospitalCountForProvince = (pName: string) => {
    return hospitals.filter(h => h.province === pName).length;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مدیریت استان‌ها و تفکیک بیمارستان‌های تحت پوشش"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4 sm:space-y-6 text-right font-sans max-w-full overflow-hidden">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          می‌توانید استان‌های جدید اضافه نمایید. با کلیک بر روی هر استان، سیستم مستقیماً بیمارستان‌های آن استان را فیلتر کرده و نمایش می‌دهد.
        </p>

        {/* Add Province Input - Responsive Form */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
          <input
            type="text"
            value={newProvinceName}
            onChange={e => setNewProvinceName(e.target.value)}
            placeholder="نام استان جدید (مثال: لرستان، کردستان، بوشهر...)"
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition shrink-0 active:scale-95"
          >
            ➕ افزودن استان
          </button>
        </form>

        {/* Provinces Grid */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              استان‌های تعریف‌شده ({provinces.length} استان)
            </h4>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
              (برای فیلتر بیمارستان‌ها روی هر استان کلیک کنید)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {provinces.map(p => {
              const count = getHospitalCountForProvince(p);
              return (
                <div
                  key={p}
                  className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition flex items-center justify-between gap-2 group"
                >
                  <button
                    onClick={() => {
                      onSelectProvinceFilter(p);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 text-right flex-1 min-w-0"
                    title={`مشاهده بیمارستان‌های استان ${p}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {p.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition truncate">
                        {p}
                      </h5>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {count > 0 ? `${count} بیمارستان` : 'فاقد مرکز'}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        onSelectProvinceFilter(p);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded-lg transition"
                    >
                      مشاهده ←
                    </button>
                    {count === 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`آیا از حذف استان "${p}" مطمئن هستید؟`)) {
                            onDeleteProvince(p);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition rounded"
                        title="حذف استان"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs sm:text-sm transition text-center"
          >
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProvincesManagerModal;
