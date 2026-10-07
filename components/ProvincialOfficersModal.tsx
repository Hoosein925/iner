import React, { useState } from 'react';
import Modal from './Modal';
import { ProvincialOfficer } from '../types';

interface ProvincialOfficersModalProps {
  isOpen: boolean;
  onClose: () => void;
  officers: ProvincialOfficer[];
  provinces: string[];
  onAddOfficer: (officer: Omit<ProvincialOfficer, 'id' | 'createdAt'>) => void;
  onDeleteOfficer: (id: string) => void;
}

export const ProvincialOfficersModal: React.FC<ProvincialOfficersModalProps> = ({
  isOpen,
  onClose,
  officers,
  provinces,
  onAddOfficer,
  onDeleteOfficer,
}) => {
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProvince, setSelectedProvince] = useState(provinces[0] || 'تهران');
  const [filterProvince, setFilterProvince] = useState('all');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nationalId.trim() || !password.trim()) {
      alert('لطفاً تمامی فیلدهای نام، کد ملی و رمز عبور را تکمیل نمایید.');
      return;
    }

    if (officers.some(o => o.nationalId === nationalId.trim())) {
      alert('این کد ملی قبلاً برای کارشناس دیگری ثبت شده است.');
      return;
    }

    onAddOfficer({
      name: name.trim(),
      nationalId: nationalId.trim(),
      password: password.trim(),
      province: selectedProvince,
    });

    setName('');
    setNationalId('');
    setPassword('');
  };

  const filteredOfficers = officers.filter(
    o => filterProvince === 'all' || o.province === filterProvince
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مدیریت و تعریف کارشناسان معاونت درمان استان‌ها"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6 text-right font-sans">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          در این بخش می‌توانید برای هر استان یک یا چند کارشناس معاونت درمان با <strong>کد ملی</strong> و <strong>رمز عبور</strong> تعریف نمایید. پس از ورود با کد ملی، کارشناس مستقیماً به <strong>بیمارستان‌های تحت پوشش استان خود</strong> متصل شده و به برنامه‌های بهبود و نظارت بالینی دسترسی خواهد داشت.
        </p>

        {/* Creation Form */}
        <form onSubmit={handleAdd} className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>➕ ثبت کارشناس جدید معاونت درمان</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام و نام خانوادگی: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: دکتر مهدی احمدی"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                کد ملی (نام کاربری): <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={nationalId}
                onChange={e => setNationalId(e.target.value.replace(/\D/g, ''))}
                placeholder="۱۰ رقم بدون خط تیره"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رمز عبور: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="حداقل ۴ کاراکتر"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                استان مربوطه: <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProvince}
                onChange={e => setSelectedProvince(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
              >
                {provinces.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
            >
              ✓ افزودن و صدور دسترسی کارشناس
            </button>
          </div>
        </form>

        {/* Existing Officers Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              لیست کارشناسان ثبت‌شده ({filteredOfficers.length} نفر)
            </h4>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">فیلتر استان:</span>
              <select
                value={filterProvince}
                onChange={e => setFilterProvince(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600"
              >
                <option value="all">همه استان‌ها</option>
                {provinces.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            {filteredOfficers.length === 0 ? (
              <p className="text-center py-10 text-xs sm:text-sm text-slate-400">
                هیچ کارشناسی برای این استان تعریف نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 uppercase">
                    <tr>
                      <th className="px-4 py-3">نام کارشناس</th>
                      <th className="px-4 py-3">استان تحت نظارت</th>
                      <th className="px-4 py-3 font-mono">کد ملی</th>
                      <th className="px-4 py-3 font-mono">رمز عبور</th>
                      <th className="px-4 py-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredOfficers.map(officer => (
                      <tr key={officer.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          {officer.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold">
                            {officer.province}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {officer.nationalId}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {officer.password}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`آیا از حذف دسترسی کارشناس "${officer.name}" مطمئن هستید؟`)) {
                                onDeleteOfficer(officer.id);
                              }
                            }}
                            className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-lg transition text-[11px] font-bold"
                          >
                            حذف دسترسی
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProvincialOfficersModal;
