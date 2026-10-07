
import React, { useState } from 'react';
import { Hospital, UserRole } from '../types';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { HomeIcon } from './icons/HomeIcon';
import { EditIcon } from './icons/EditIcon';
import { ChatIcon } from './icons/ChatIcon';

interface HospitalListProps {
  hospitals: Hospital[];
  onAddHospital: (name: string, province: string, city: string, supervisorName: string, supervisorNationalId: string, supervisorPassword: string) => void;
  onUpdateHospital: (id: string, updatedData: Partial<Omit<Hospital, 'id' | 'departments' | 'checklistTemplates' | 'examTemplates'>>) => void;
  onDeleteHospital: (id: string) => void;
  onSelectHospital: (id: string) => void;
  onGoToWelcome: () => void;
  userRole: UserRole;
  userProvince?: string;
  onGoToSuperAdmin?: () => void;
  initialProvinceFilter?: string;
}

const HospitalList: React.FC<HospitalListProps> = ({
  hospitals,
  onAddHospital,
  onUpdateHospital,
  onDeleteHospital,
  onSelectHospital,
  onGoToWelcome,
  userRole,
  userProvince,
  onGoToSuperAdmin,
  initialProvinceFilter = 'all',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [hospitalToDelete, setHospitalToDelete] = useState<Hospital | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorNationalId, setSupervisorNationalId] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>(
    userProvince || initialProvinceFilter
  );

  const resetForm = () => {
      setHospitalName('');
      setProvince('');
      setCity('');
      setSupervisorName('');
      setSupervisorNationalId('');
      setSupervisorPassword('');
      setEditingHospital(null);
  }

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setHospitalName(hospital.name);
    setProvince(hospital.province);
    setCity(hospital.city);
    setSupervisorName(hospital.supervisorName || '');
    setSupervisorNationalId(hospital.supervisorNationalId || '');
    setSupervisorPassword(hospital.supervisorPassword || '');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (hospitalName.trim() && province.trim() && city.trim() && supervisorName.trim() && supervisorNationalId.trim() && supervisorPassword.trim()) {
      if (editingHospital) {
        onUpdateHospital(editingHospital.id, {
          name: hospitalName.trim(),
          province: province.trim(),
          city: city.trim(),
          supervisorName: supervisorName.trim(),
          supervisorNationalId: supervisorNationalId.trim(),
          supervisorPassword: supervisorPassword.trim(),
        });
      } else {
        onAddHospital(
          hospitalName.trim(), 
          province.trim(),
          city.trim(),
          supervisorName.trim(),
          supervisorNationalId.trim(),
          supervisorPassword.trim()
        );
      }
      resetForm();
      setIsModalOpen(false);
    } else {
        alert("لطفاً تمام فیلدها را پر کنید.")
    }
  };

  const handleCloseModal = () => {
      resetForm();
      setIsModalOpen(false);
  }

  // Filter hospitals based on province
  const allProvinces = Array.from(new Set(hospitals.map(h => h.province).filter(Boolean)));
  const displayedHospitals = hospitals.filter(h => {
    if (userRole === UserRole.ProvincialOfficer && userProvince) {
      return h.province === userProvince;
    }
    if (selectedProvinceFilter !== 'all') {
      return h.province === selectedProvinceFilter;
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 font-sans">
      {/* Provincial Officer Banner */}
      {userRole === UserRole.ProvincialOfficer && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-600/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center text-lg sm:text-xl shrink-0 border border-emerald-200 dark:border-emerald-800 shadow-xs">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base font-black text-slate-900 dark:text-white">
                  سامانه نظارتی معاونت درمان | استان {userProvince}
                </h2>
                <span className="sm:hidden text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  {displayedHospitals.length} بیمارستان
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-snug">
                دسترسی اختصاصی جهت پایش عملکرد، برنامه‌های بهبود و سنجه‌های بالینی بیمارستان‌های استان
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold shrink-0">
            <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">{displayedHospitals.length}</span>
            <span>بیمارستان تحت پوشش</span>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {userRole === UserRole.Admin && onGoToSuperAdmin && (
            <button
              onClick={onGoToSuperAdmin}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-md transition"
              title="بازگشت به پنل فرماندهی ادمین کل"
            >
              <span>← پنل فرماندهی ادمین کل</span>
            </button>
          )}

          <button
            onClick={onGoToWelcome}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600"
            aria-label="Go to Welcome Screen"
          >
            <HomeIcon className="w-4 h-4" />
            <span>صفحه اصلی</span>
          </button>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100">
            انتخاب بیمارستان
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          {/* Province Filter Dropdown (Hidden for provincial officer as they are locked to their province) */}
          {userRole !== UserRole.ProvincialOfficer && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">استان:</span>
              <select
                value={selectedProvinceFilter}
                onChange={e => setSelectedProvinceFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">🌟 همه استان‌ها ({hospitals.length})</option>
                {allProvinces.map(p => (
                  <option key={p} value={p}>
                    {p} ({hospitals.filter(h => h.province === p).length})
                  </option>
                ))}
              </select>
            </div>
          )}

          {userRole === UserRole.Admin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
            >
              <PlusIcon className="w-4 h-4" />
              <span>افزودن بیمارستان جدید</span>
            </button>
          )}
        </div>
      </div>

      {displayedHospitals.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-500">هیچ بیمارستانی در این بخش یافت نشد.</h2>
          <p className="text-slate-400 text-xs mt-1">
            {selectedProvinceFilter !== 'all' ? `برای استان ${selectedProvinceFilter} هنوز بیمارستانی ثبت نشده است.` : 'برای شروع، یک بیمارستان جدید اضافه کنید.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayedHospitals.map((h) => {
            const isHospitalActive = h.isActive !== false;
            return (
              <div
                key={h.id}
                className={`relative group bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-t-4 ${
                  isHospitalActive
                    ? 'border-indigo-500 hover:shadow-indigo-500/20'
                    : 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 hover:shadow-rose-500/20'
                }`}
              >
                <div
                  onClick={() => {
                    if (!isHospitalActive && userRole !== UserRole.Admin) {
                      alert('دسترسی شما بصورت موقت غیرفعال شده است و برای کسب اطلاعات بیشتر با مدیریت سامانه تماس بگیرید');
                      return;
                    }
                    onSelectHospital(h.id);
                  }}
                  className="p-5 sm:p-6 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate flex-1">
                      {h.name}
                    </h2>
                    {!isHospitalActive ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                        غیرفعال موقت
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                        فعال
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{h.province}، {h.city}</p>
                  {h.supervisorName && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      سوپروایزر: <strong className="text-slate-700 dark:text-slate-200">{h.supervisorName}</strong>
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{h.departments.length} بخش</p>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(h); }}
                    className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-100 dark:bg-slate-700 rounded-full"
                    aria-label="Edit Hospital"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHospitalToDelete(h);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-700 rounded-full"
                    aria-label="Delete Hospital"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingHospital ? "ویرایش مشخصات بیمارستان" : "افزودن بیمارستان جدید"}>
        <div className="space-y-4">
          <input
            type="text"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            placeholder="نام بیمارستان"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
           <input
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="استان"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="شهر"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            placeholder="نام و نام خانوادگی سوپروایزر آموزشی"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            inputMode="numeric"
            value={supervisorNationalId}
            onChange={(e) => setSupervisorNationalId(e.target.value.replace(/\D/g, ''))}
            placeholder="کد ملی سوپروایزر آموزشی"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            value={supervisorPassword}
            onChange={(e) => setSupervisorPassword(e.target.value)}
            placeholder="رمز عبور سوپروایزر آموزشی"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-3">
            <button
                onClick={handleCloseModal}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
            >
                انصراف
            </button>
            <button
                onClick={handleSave}
                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
                {editingHospital ? 'ذخیره تغییرات' : 'افزودن'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!hospitalToDelete}
        onClose={() => setHospitalToDelete(null)}
        onConfirm={() => {
          if (hospitalToDelete) {
            onDeleteHospital(hospitalToDelete.id);
            setHospitalToDelete(null);
          }
        }}
        title="تایید حذف بیمارستان"
        message={`آیا از حذف بیمارستان "${hospitalToDelete?.name}" مطمئن هستید؟ با انجام این عملیات کلیه بخش‌ها و پرسنل این بیمارستان حذف خواهند شد.`}
        confirmButtonText="حذف بیمارستان"
        cancelButtonText="انصراف"
      />
    </div>
  );
};

export default HospitalList;