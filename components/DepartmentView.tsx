





import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Department, StaffMember, SkillCategory, UserRole, NewsBanner, MonthlyWorkLog } from '../types';
import Modal from './Modal';
import { PlusIcon } from './icons/PlusIcon';
import FileUploader from './FileUploader';
import { parseComprehensiveExcel } from '../services/excelParser';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { ChecklistIcon } from './icons/ChecklistIcon';
import NewsCarousel from './NewsCarousel';
import { BookOpenIcon } from './icons/BookOpenIcon';


interface DepartmentViewProps {
  department: Department;
  onBack: () => void;
  onAddStaff: (departmentId: string, name: string, title: string, nationalId: string, password?: string) => void;
  onUpdateStaff: (departmentId: string, staffId: string, updatedData: Partial<Omit<StaffMember, 'id' | 'assessments'>>) => void;
  onDeleteStaff: (departmentId: string, staffId: string) => void;
  onSelectStaff: (staffId: string) => void;
  onComprehensiveImport: (departmentId: string, data: { [staffName: string]: Map<string, SkillCategory[]> }) => void;
  onManageChecklists: () => void;
  onManageExams: () => void;
  onManageTraining: () => void;
  onManagePatientEducation: () => void;
  onAddOrUpdateWorkLog: (departmentId: string, staffId: string, workLog: MonthlyWorkLog) => void;
  userRole: UserRole;
  newsBanners: NewsBanner[];
  activeYear: number;
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const CHART_COLORS = ['#3b82f6', '#16a34a', '#f97316', '#dc2626', '#8b5cf6', '#db2777'];

const DepartmentView: React.FC<DepartmentViewProps> = ({
  department,
  onBack,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onSelectStaff,
  onComprehensiveImport,
  onManageChecklists,
  onManageExams,
  onManageTraining,
  onManagePatientEducation,
  onAddOrUpdateWorkLog,
  userRole,
  newsBanners,
  activeYear,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form state for staff modal
  const [staffName, setStaffName] = useState('');
  const [staffTitle, setStaffTitle] = useState('');
  const [staffNationalId, setStaffNationalId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Work Log Modal State
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [selectedStaffForWorkLog, setSelectedStaffForWorkLog] = useState<StaffMember | null>(null);
  const [selectedLogMonth, setSelectedLogMonth] = useState<string>(PERSIAN_MONTHS[0]);
  const [overtimeHours, setOvertimeHours] = useState('');
  const [requiredHours, setRequiredHours] = useState('');
  const [leaveTaken, setLeaveTaken] = useState('');
  const [annualLeave, setAnnualLeave] = useState('');
  const [workExperience, setWorkExperience] = useState('');

  const resetForm = () => {
    setStaffName('');
    setStaffTitle('');
    setStaffNationalId('');
    setStaffPassword('');
    setEditingStaff(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setStaffName(staff.name);
    setStaffTitle(staff.title);
    setStaffNationalId(staff.nationalId || '');
    setStaffPassword(staff.password || '');
    setIsModalOpen(true);
  };

  const handleSaveStaff = () => {
    if (!staffName.trim() || !staffTitle.trim()) {
      alert("لطفا نام و تخصص شغلی را وارد کنید.");
      return;
    }

    if (editingStaff) {
      onUpdateStaff(department.id, editingStaff.id, {
        name: staffName.trim(),
        title: staffTitle.trim(),
        nationalId: staffNationalId.trim(),
        password: staffPassword.trim(),
      });
    } else {
      onAddStaff(department.id, staffName.trim(), staffTitle.trim(), staffNationalId.trim(), staffPassword.trim());
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleComprehensiveUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const allStaffData = await parseComprehensiveExcel(file);
      onComprehensiveImport(department.id, allStaffData);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "خطای ناشناخته در پردازش فایل.");
    } finally {
      setIsUploading(false);
    }
  };
  
    // --- Work Log Handlers ---
  const resetWorkLogForm = () => {
    setSelectedLogMonth(PERSIAN_MONTHS[0]);
    setOvertimeHours('');
    setRequiredHours('');
    setLeaveTaken('');
    setAnnualLeave('');
    setWorkExperience('');
  };

  const handleOpenWorkLogModal = (staff: StaffMember) => {
    setSelectedStaffForWorkLog(staff);
    resetWorkLogForm(); 
    setIsWorkLogModalOpen(true);
  };
  
  const handleCloseWorkLogModal = () => {
    setIsWorkLogModalOpen(false);
    setSelectedStaffForWorkLog(null);
    resetWorkLogForm();
  };
  
  useEffect(() => {
    if (isWorkLogModalOpen && selectedStaffForWorkLog) {
      const log = selectedStaffForWorkLog.workLogs?.find(l => l.month === selectedLogMonth && l.year === activeYear);
      if (log) {
        setOvertimeHours(String(log.overtimeHours));
        setRequiredHours(String(log.requiredHours));
        setLeaveTaken(String(log.leaveTakenInMonth));
        setAnnualLeave(String(log.annualLeaveRemaining));
        setWorkExperience(String(log.workExperienceInYears ?? ''));
      } else {
        setOvertimeHours('');
        setRequiredHours('');
        setLeaveTaken('');
        setAnnualLeave('');
        setWorkExperience('');
      }
    }
  }, [isWorkLogModalOpen, selectedStaffForWorkLog, selectedLogMonth, activeYear]);

  const handleSaveWorkLog = () => {
    if (!selectedStaffForWorkLog) return;
    
    const workLog: MonthlyWorkLog = {
      month: selectedLogMonth,
      year: activeYear,
      overtimeHours: parseFloat(overtimeHours || '0'),
      requiredHours: parseFloat(requiredHours || '0'),
      leaveTakenInMonth: parseFloat(leaveTaken || '0'),
      annualLeaveRemaining: parseFloat(annualLeave || '0'),
      workExperienceInYears: parseFloat(workExperience || '0'),
    };
    
    onAddOrUpdateWorkLog(department.id, selectedStaffForWorkLog.id, workLog);
    handleCloseWorkLogModal();
    alert('اطلاعات با موفقیت ذخیره شد.');
  };

  const chartInfo = useMemo(() => {
    const allCategoryNames = new Set<string>();
    department.staff.forEach(staff => {
        (staff.assessments || []).forEach(assessment => {
            (assessment.skillCategories || []).forEach(cat => allCategoryNames.add(cat.name));
        });
    });
    const categoryNames = Array.from(allCategoryNames);
    const monthlyData: { [month: string]: { [category: string]: number[] } } = {};

    department.staff.forEach(staff => {
      (staff.assessments || [])
        .filter(assessment => assessment.year === activeYear)
        .forEach(assessment => {
        if (!monthlyData[assessment.month]) monthlyData[assessment.month] = {};
        const assessmentHasItems = (assessment.skillCategories || []).some(cat => (cat.items || []).length > 0);
        if (!assessmentHasItems) return; // Skip empty assessments

        (assessment.skillCategories || []).forEach(cat => {
          if (!monthlyData[assessment.month][cat.name]) monthlyData[assessment.month][cat.name] = [];
          const items = cat.items || [];
          const totalScore = items.reduce((sum, item) => sum + (item?.score || 0), 0);
          const maxScore = items.length * (assessment.maxScore ?? 4);
          const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
          monthlyData[assessment.month][cat.name].push(percentage);
        });
      });
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const formattedData = PERSIAN_MONTHS.map(month => {
        const monthScores = monthlyData[month];
        const monthAvgs: { [key:string]: any } = { name: month };
        categoryNames.forEach(catName => {
            const avgResult = avg(monthScores?.[catName] || []);
            monthAvgs[catName] = avgResult !== null ? parseFloat(avgResult.toFixed(1)) : null;
        });
        return monthAvgs;
    });
    return { data: formattedData, categoryNames };
  }, [department.staff, activeYear]);
  
   const staffProgressChartData = useMemo(() => {
    const monthlyData: { [month: string]: { name: string; [staffName: string]: number | string | null } } = {};
    
    PERSIAN_MONTHS.forEach(month => {
      monthlyData[month] = { name: month };
    });

    department.staff.forEach(staff => {
      (staff.assessments || [])
        .filter(assessment => assessment.year === activeYear)
        .forEach(assessment => {
        const categories = assessment.skillCategories || [];
        const totalScore = categories.reduce((catSum, cat) => 
          (cat?.items || []).reduce((itemSum, item) => itemSum + (item?.score || 0), 0) + catSum, 0);
        
        const maxScore = categories.reduce((catSum, cat) => 
          ((cat?.items || []).length * (assessment.maxScore ?? 4)) + catSum, 0);

        const percentage = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(1)) : null;
        
        if (monthlyData[assessment.month]) {
          monthlyData[assessment.month][staff.name] = percentage;
        }
      });
    });

    // Sort and return
    return PERSIAN_MONTHS
      .map(month => monthlyData[month])
      .filter(monthData => Object.keys(monthData).length > 1); // Only include months with at least one assessment

  }, [department.staff, activeYear]);
  
  const sortedStaff = useMemo(() => {
    if (!department.staff) {
      return [];
    }
    // Sort staff alphabetically by name
    return [...department.staff].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [department.staff]);


  const renderStaffListView = () => (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">مسئول بخش</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{department.managerName}</p>
        </div>
         <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">کد ملی مسئول</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{department.managerNationalId}</p>
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">تعداد نیرو</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{department.staffCount}</p>
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">تعداد تخت</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{department.bedCount}</p>
        </div>
      </div>

      {chartInfo.data.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">روند میانگین امتیازات مهارت بخش در سال {activeYear}</h2>
          <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartInfo.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(100, 116, 139, 0.3)" />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" padding={{ left: 20, right: 20 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
                <Tooltip
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value: number | null, name: string) => {
                    if (value === null || value === undefined) {
                        return ["ثبت نشده", name];
                    }
                    return [`${value}%`, name];
                    }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                {chartInfo.categoryNames.map((catName, index) => {
                    return <Line key={catName} type="monotone" dataKey={catName} name={catName} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} activeDot={{ r: 8 }} />
                })}
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {staffProgressChartData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">روند پیشرفت فردی پرسنل در سال {activeYear}</h2>
          <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={staffProgressChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(100, 116, 139, 0.3)" />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" padding={{ left: 20, right: 20 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
                <Tooltip
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value: number | null, name: string) => {
                    if (value === null || value === undefined) {
                        return ["ثبت نشده", name];
                    }
                    return [`${value}%`, name];
                    }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                {department.staff.map((staff, index) => {
                    return <Line key={staff.id} type="monotone" dataKey={staff.name} name={staff.name} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} connectNulls activeDot={{ r: 8 }} />
                })}
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">بارگذاری اکسل عملکردی جامع</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          یک فایل اکسل با شیت‌های متعدد آپلود کنید. نام هر شیت باید نام یکی از پرسنل باشد. این فایل، ارزیابی‌های تمام پرسنل موجود در آن را به صورت یکجا ثبت یا به‌روزرسانی می‌کند. اگر پرسنلی در فایل اکسل وجود داشته باشد که در لیست زیر نیست، به طور خودکار اضافه خواهد شد.
        </p>
        {isUploading && <p className="text-center text-slate-500">در حال پردازش فایل...</p>}
        {uploadError && <p className="text-center text-red-500 my-2">{uploadError}</p>}
        <FileUploader
            onFileUpload={handleComprehensiveUpload}
            accept=".xlsx"
            title="آپلود فایل اکسل جامع بخش"
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">لیست پرسنل</h2>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="w-5 h-5" />
          افزودن پرسنل
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">نام پرسنل</th>
              <th scope="col" className="px-6 py-3">تخصص شغلی</th>
              <th scope="col" className="px-6 py-3 text-center">اقدامات</th>
            </tr>
          </thead>
          <tbody>
            {sortedStaff.map((staff) => (
              <tr key={staff.id} className="border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-700/50">
                <td scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white cursor-pointer" onClick={() => onSelectStaff(staff.id)}>
                  {staff.name}
                </td>
                <td className="px-6 py-4 cursor-pointer" onClick={() => onSelectStaff(staff.id)}>
                  {staff.title}
                </td>
                <td className="px-6 py-4 text-center">
                   <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => handleOpenWorkLogModal(staff)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-teal-500 rounded-md shadow-sm hover:bg-teal-600 transition-transform transform hover:scale-105"
                            title="ثبت کارکرد ماهانه"
                        >
                            کارکرد
                        </button>
                        <button
                            onClick={() => handleOpenEditModal(staff)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition-transform transform hover:scale-105"
                            title="ویرایش پرسنل"
                        >
                            ویرایش
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if(window.confirm(`آیا از حذف "${staff.name}" مطمئن هستید؟`)) {
                                onDeleteStaff(department.id, staff.id);
                                }
                            }}
                            className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-md shadow-sm hover:bg-red-600 transition-transform transform hover:scale-105"
                            title="حذف پرسنل"
                            >
                            حذف
                        </button>
                    </div>
                </td>
              </tr>
            ))}
             {sortedStaff.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-slate-400">هیچ پرسنلی در این بخش ثبت نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStaff ? 'ویرایش اطلاعات پرسنل' : 'افزودن پرسنل جدید'}>
        <div className="space-y-4">
          <input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="نام و نام خانوادگی"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={staffTitle}
            onChange={(e) => setStaffTitle(e.target.value)}
            placeholder="تخصص شغلی (مثال: پرستار)"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            inputMode="numeric"
            value={staffNationalId}
            onChange={(e) => setStaffNationalId(e.target.value.replace(/\D/g, ''))}
            placeholder="کد ملی (برای ورود پرسنل)"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
           <input
            type="password"
            value={staffPassword}
            onChange={(e) => setStaffPassword(e.target.value)}
            placeholder="رمز عبور (برای ورود پرسنل)"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">انصراف</button>
            <button onClick={handleSaveStaff} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">{editingStaff ? 'ذخیره تغییرات' : 'افزودن'}</button>
          </div>
        </div>
      </Modal>

       <Modal isOpen={isWorkLogModalOpen} onClose={handleCloseWorkLogModal} title={`ثبت کارکرد ماهانه برای ${selectedStaffForWorkLog?.name}`}>
        <div className="space-y-4">
          <div>
            <label htmlFor="log-month" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              انتخاب ماه
            </label>
            <select
              id="log-month"
              value={selectedLogMonth}
              onChange={(e) => setSelectedLogMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PERSIAN_MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="required-hours" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              موظفی پرسنل در این ماه
            </label>
            <input
              id="required-hours"
              type="number"
              value={requiredHours}
              onChange={(e) => setRequiredHours(e.target.value)}
              placeholder="مثال: 180"
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="overtime-hours" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              ساعت اضافه کار
            </label>
            <input
              id="overtime-hours"
              type="number"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
              placeholder="مثال: 25.5"
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="leave-taken" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              میزان مرخصی گرفته شده در ماه
            </label>
            <input
              id="leave-taken"
              type="number"
              value={leaveTaken}
              onChange={(e) => setLeaveTaken(e.target.value)}
              placeholder="مثال: 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="annual-leave" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              میزان مرخصی مانده در سال
            </label>
            <input
              id="annual-leave"
              type="number"
              value={annualLeave}
              onChange={(e) => setAnnualLeave(e.target.value)}
              placeholder="مثال: 18"
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="work-experience" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              سابقه کار (سال)
            </label>
            <input
              id="work-experience"
              type="number"
              value={workExperience}
              onChange={(e) => setWorkExperience(e.target.value)}
              placeholder="مثال: 5"
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleCloseWorkLogModal} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
              انصراف
            </button>
            <button onClick={handleSaveWorkLog} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              ذخیره
            </button>
          </div>
        </div>
      </Modal>
    </>
  );

  const baseButtonClass = "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{department.name} - <span className="text-slate-500 text-2xl">سال {activeYear}</span></h1>
        {(userRole === UserRole.Admin || userRole === UserRole.Supervisor || userRole === UserRole.Manager) && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                    onClick={onManagePatientEducation}
                    className={`${baseButtonClass} bg-orange-500 hover:bg-orange-600 focus:ring-orange-400`}
                >
                    <BookOpenIcon className="w-5 h-5" />
                    آموزش به بیمار
                </button>
                <button
                    onClick={onManageTraining}
                    className={`${baseButtonClass} bg-sky-500 hover:bg-sky-600 focus:ring-sky-400`}
                >
                    <AcademicCapIcon className="w-5 h-5" />
                    آموزش به پرسنل
                </button>
                <button
                    onClick={onManageExams}
                    className={`${baseButtonClass} bg-violet-600 hover:bg-violet-700 focus:ring-violet-500`}
                >
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    مدیریت آزمون‌ها
                </button>
                <button
                    onClick={onManageChecklists}
                    className={`${baseButtonClass} bg-teal-600 hover:bg-teal-700 focus:ring-teal-500`}
                >
                    <ChecklistIcon className="w-5 h-5" />
                    مدیریت قالب‌های چک‌لیست
                </button>
            </div>
        )}
    </div>

    {newsBanners && newsBanners.length > 0 && (
        <div className="mb-8 max-w-5xl mx-auto">
            <NewsCarousel banners={newsBanners} />
        </div>
    )}

      {renderStaffListView()}
    </div>
  );
};

export default DepartmentView;
