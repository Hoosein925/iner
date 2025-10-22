
import React, { useState } from 'react';
import { Hospital, UserRole } from '../types';
import Modal from './Modal';
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
  onContactAdmin: () => void;
}

const HospitalList: React.FC<HospitalListProps> = ({
  hospitals,
  onAddHospital,
  onUpdateHospital,
  onDeleteHospital,
  onSelectHospital,
  onGoToWelcome,
  userRole,
  onContactAdmin
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorNationalId, setSupervisorNationalId] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
            <button
                onClick={onGoToWelcome}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600"
                aria-label="Go to Welcome Screen"
            >
                <HomeIcon className="w-5 h-5" />
                صفحه اصلی
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">انتخاب بیمارستان</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
            {userRole === UserRole.Admin && (
              <button
                onClick={onContactAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <ChatIcon className="w-5 h-5" />
                تماس با بیمارستان ها
              </button>
            )}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="w-5 h-5" />
              افزودن بیمارستان
            </button>
        </div>
      </div>

      {hospitals.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl shadow">
            <h2 className="text-xl font-medium text-slate-500">هیچ بیمارستانی یافت نشد.</h2>
            <p className="text-slate-400 mt-2">برای شروع، یک بیمارستان جدید اضافه کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {hospitals.map((h) => (
            <div
              key={h.id}
              className="relative group bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 border-t-4 border-indigo-500 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                onClick={() => onSelectHospital(h.id)}
                className="p-6 cursor-pointer"
              >
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{h.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{h.province}, {h.city}</p>
                {h.supervisorName && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">سوپروایزر: {h.supervisorName}</p>}
                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{h.departments.length} بخش</p>
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
                    if(window.confirm(`آیا از حذف بیمارستان "${h.name}" مطمئن هستید؟`)) {
                      onDeleteHospital(h.id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-700 rounded-full"
                  aria-label="Delete Hospital"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default HospitalList;