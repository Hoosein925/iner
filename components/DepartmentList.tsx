import React, { useState, useRef } from 'react';
// FIX: Import the 'Department' type.
import { Hospital, UserRole, Department } from '../types';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon } from './icons/EditIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { ChatIcon } from './icons/ChatIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { SaveIcon } from './icons/SaveIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { AiIcon } from './icons/AiIcon';
import { BackIcon } from './icons/BackIcon';
import PeriodicPlanModal from './PeriodicPlanModal';
import { generatePeriodicPlanWithAI, DepartmentSummaryForHospital } from '../services/geminiService';

interface DepartmentListProps {
  hospital: Hospital;
  onAddDepartment: (name: string, managerName: string, managerNationalId: string, managerPassword: string, staffCount: number, bedCount: number) => void;
  onUpdateDepartment: (id: string, updatedData: Partial<Omit<Department, 'id' | 'staff'>>) => void;
  onDeleteDepartment: (id: string) => void;
  onSelectDepartment: (id: string) => void;
  onBack: () => void;
  onManageAccreditation: () => void;
  onManageNewsBanners: () => void;
  onManageNeedsAssessment: () => void;
  onManageCorrectiveActions: () => void;
  onManageSensitiveIndicators: () => void;
  onResetHospital: (supervisorNationalId: string) => Promise<boolean>;
  onContactAdmin: () => void;
  onArchiveYear: (yearToArchive: number) => void;
  onReplaceHospitalData: (hospitalData: Hospital) => void;
  userRole: UserRole;
}

const DepartmentList: React.FC<DepartmentListProps> = ({
  hospital,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onSelectDepartment,
  onBack,
  onManageAccreditation,
  onManageNewsBanners,
  onManageNeedsAssessment,
  onManageCorrectiveActions,
  onManageSensitiveIndicators,
  onResetHospital,
  onContactAdmin,
  onArchiveYear,
  onReplaceHospitalData,
  userRole,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerNationalId, setNewManagerNationalId] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [newStaffCount, setNewStaffCount] = useState('');
  const [newBedCount, setNewBedCount] = useState('');

  // State for reset modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: confirm, 2: credentials
  const [supervisorIdInput, setSupervisorIdInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // State for archive modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveStep, setArchiveStep] = useState(1);
  const [yearConfirmation, setYearConfirmation] = useState('');
  const suggestedYear = new Date().toLocaleDateString('fa-IR-u-nu-latn').split('/')[0];

  // State for Hospital-Level AI Strategic Plan (Supervisor Level)
  const [isHospitalPlanOpen, setIsHospitalPlanOpen] = useState(false);
  const [hospitalPlanContent, setHospitalPlanContent] = useState<string | null>(null);
  const [isHospitalPlanLoading, setIsHospitalPlanLoading] = useState(false);
  const [hospitalOverallAvg, setHospitalOverallAvg] = useState(80);
  const [hospitalGenAvg, setHospitalGenAvg] = useState(80);
  const [hospitalSpecAvg, setHospitalSpecAvg] = useState(80);
  const [hospitalCommAvg, setHospitalCommAvg] = useState(80);
  const [hospitalTotalStaff, setHospitalTotalStaff] = useState(0);

  const handleOpenHospitalStrategicPlan = async () => {
    setIsHospitalPlanOpen(true);
    setIsHospitalPlanLoading(true);
    setHospitalPlanContent(null);

    try {
      const departmentsData: DepartmentSummaryForHospital[] = [];
      let totalAssessedStaff = 0;
      let totalItems = 0;
      let totalScoreSum = 0;
      let genItems = 0;
      let genScoreSum = 0;
      let specItems = 0;
      let specScoreSum = 0;
      let commItems = 0;
      let commScoreSum = 0;

      const skillMap = new Map<string, { categoryName: string; totalScore: number; count: number; radif?: number; referenceText?: string }>();

      (hospital.departments || []).forEach(dep => {
        let depAssessedStaffCount = 0;
        let depTotalScoreSum = 0;
        let depTotalItems = 0;
        let depGenSum = 0, depGenItems = 0;
        let depSpecSum = 0, depSpecItems = 0;
        let depCommSum = 0, depCommItems = 0;

        const depSkillMap = new Map<string, { name: string; category: string; totalScore: number; count: number; weakCount: number }>();
        const staffScores: Array<{ name: string; title: string; overallAvg: number }> = [];

        (dep.staff || []).forEach(staff => {
          const staffAssessments = staff.assessments || [];
          if (staffAssessments.length > 0) {
            depAssessedStaffCount++;
            totalAssessedStaff++;
            const latestAss = staffAssessments[staffAssessments.length - 1];
            const maxScore = latestAss.maxScore ?? 4;

            let stScoreSum = 0;
            let stItemsCount = 0;

            (latestAss.skillCategories || []).forEach(cat => {
              const isGeneral = cat.name.includes('عمومی');
              const isSpecial = cat.name.includes('تخصصی') || cat.name.includes('ویژه');
              const isComm = cat.name.includes('ارتباط') || cat.name.includes('حقوق');
              const catShort = isGeneral ? 'مهارت‌های عمومی' : isComm ? 'مهارت‌های ارتباطی' : 'مهارت‌های تخصصی';

              (cat.items || []).forEach((item, itemIdx) => {
                const score = typeof item.score === 'number' ? item.score : 0;
                const normalizedScore = maxScore > 0 ? (score / maxScore) * 4 : 0;
                const radif = item.radif || (itemIdx + 1);
                const desc = item.description || (item as any).name || '';
                const refText = `مهارت شماره ${radif} از ${catShort}`;

                totalItems++;
                totalScoreSum += normalizedScore;
                depTotalItems++;
                depTotalScoreSum += normalizedScore;
                stItemsCount++;
                stScoreSum += normalizedScore;

                if (isGeneral) {
                  genItems++; genScoreSum += normalizedScore;
                  depGenItems++; depGenSum += normalizedScore;
                } else if (isSpecial) {
                  specItems++; specScoreSum += normalizedScore;
                  depSpecItems++; depSpecSum += normalizedScore;
                } else if (isComm) {
                  commItems++; commScoreSum += normalizedScore;
                  depCommItems++; depCommSum += normalizedScore;
                }

                // Hospital-wide map
                const existing = skillMap.get(desc);
                if (existing) {
                  existing.totalScore += normalizedScore;
                  existing.count += 1;
                } else {
                  skillMap.set(desc, {
                    categoryName: catShort,
                    totalScore: normalizedScore,
                    count: 1,
                    radif,
                    referenceText: refText
                  });
                }

                // Department map
                const isWeak = normalizedScore < 2.8; // score < 70%
                const dExisting = depSkillMap.get(desc);
                if (dExisting) {
                  dExisting.totalScore += normalizedScore;
                  dExisting.count += 1;
                  if (isWeak) dExisting.weakCount += 1;
                } else {
                  depSkillMap.set(desc, {
                    name: desc,
                    category: catShort,
                    totalScore: normalizedScore,
                    count: 1,
                    weakCount: isWeak ? 1 : 0
                  });
                }
              });
            });

            const staffOverallAvg = stItemsCount > 0 ? Math.round((stScoreSum / (stItemsCount * 4)) * 100) : 0;
            staffScores.push({
              name: staff.name,
              title: staff.title || 'کارشناس پرستاری',
              overallAvg: staffOverallAvg
            });
          }
        });

        // Sort staff by overall score descending to designate top performers / preceptors
        staffScores.sort((a, b) => b.overallAvg - a.overallAvg);
        const topStaff = staffScores.slice(0, 3);

        const depOverallAvg = depTotalItems > 0 ? Math.round((depTotalScoreSum / (depTotalItems * 4)) * 100) : 80;
        const depGenAvg = depGenItems > 0 ? Math.round((depGenSum / (depGenItems * 4)) * 100) : 80;
        const depSpecAvg = depSpecItems > 0 ? Math.round((depSpecSum / (depSpecItems * 4)) * 100) : 80;
        const depCommAvg = depCommItems > 0 ? Math.round((depCommSum / (depCommItems * 4)) * 100) : 80;

        // Calculate skill percentages for department
        const depSkills = Array.from(depSkillMap.values()).map(s => {
          const avgScore = s.count > 0 ? s.totalScore / s.count : 0;
          const scorePct = Math.round((avgScore / 4) * 100);
          return {
            name: s.name,
            category: s.category,
            scorePct,
            count: s.weakCount || (scorePct < 75 ? s.count : 0)
          };
        });

        // Sort ascending for weak skills (lowest score first)
        const sortedAsc = [...depSkills].sort((a, b) => a.scorePct - b.scorePct);
        const weakSkills = sortedAsc.filter(s => s.scorePct < 80).slice(0, 5);
        if (weakSkills.length === 0 && sortedAsc.length > 0) {
          weakSkills.push(...sortedAsc.slice(0, 2));
        }

        // Sort descending for top skills (highest score first)
        const sortedDesc = [...depSkills].sort((a, b) => b.scorePct - a.scorePct);
        const topSkills = sortedDesc.filter(s => s.scorePct >= 85).slice(0, 5);

        departmentsData.push({
          id: dep.id,
          name: dep.name,
          managerName: dep.managerName || 'سرپرستار بخش',
          staffCount: dep.staff?.length || 0,
          evaluatedStaffCount: depAssessedStaffCount,
          overallAvg: depOverallAvg,
          genAvg: depGenAvg,
          specAvg: depSpecAvg,
          commAvg: depCommAvg,
          weakSkills,
          topSkills,
          topStaff
        });
      });

      const oAvg = totalItems > 0 ? Math.round((totalScoreSum / (totalItems * 4)) * 100) : 80;
      const gAvg = genItems > 0 ? Math.round((genScoreSum / (genItems * 4)) * 100) : 80;
      const sAvg = specItems > 0 ? Math.round((specScoreSum / (specItems * 4)) * 100) : 80;
      const cAvg = commItems > 0 ? Math.round((commScoreSum / (commItems * 4)) * 100) : 80;

      setHospitalOverallAvg(oAvg);
      setHospitalGenAvg(gAvg);
      setHospitalSpecAvg(sAvg);
      setHospitalCommAvg(cAvg);
      setHospitalTotalStaff(totalAssessedStaff);

      const skillsSummary = Array.from(skillMap.entries()).map(([skillName, data]) => {
        const avgScore = data.count > 0 ? Number((data.totalScore / data.count).toFixed(2)) : 0;
        const percentage = Math.round((avgScore / 4) * 100);
        return {
          skillName,
          categoryName: data.categoryName,
          radif: (data as any).radif,
          referenceText: (data as any).referenceText,
          score: avgScore,
          percentage
        };
      });

      const res = await generatePeriodicPlanWithAI({
        mode: 'hospital',
        targetTitle: `برنامه راهبردی و ارتقای مهارت‌های پرستاری مرکز درمانی ${hospital.name}`,
        departmentName: 'کلیه بخش‌های درمانی و پاراکلینیکی بیمارستان',
        hospitalName: hospital.name,
        overallAvg: oAvg,
        genAvg: gAvg,
        specAvg: sAvg,
        commAvg: cAvg,
        totalStaffCount: totalAssessedStaff,
        skillsSummary,
        departmentsData,
        activeYear: 1405
      });

      const planText = typeof res === 'string' ? res : (res as any)?.plan || 'برنامه‌ای دریافت نشد.';
      setHospitalPlanContent(planText);
    } catch (err) {
      console.error('Failed to generate hospital strategic plan:', err);
      setHospitalPlanContent('خطا در دریافت برنامه راهبردی کل بیمارستان. لطفاً مجدداً تلاش فرمایید.');
    } finally {
      setIsHospitalPlanLoading(false);
    }
  };

  const resetForm = () => {
      setNewDepartmentName('');
      setNewManagerName('');
      setNewManagerNationalId('');
      setNewManagerPassword('');
      setNewStaffCount('');
      setNewBedCount('');
      setEditingDepartment(null);
  }

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dep: Department) => {
    setEditingDepartment(dep);
    setNewDepartmentName(dep.name);
    setNewManagerName(dep.managerName);
    setNewManagerNationalId(dep.managerNationalId);
    setNewManagerPassword(dep.managerPassword);
    setNewStaffCount(String(dep.staffCount));
    setNewBedCount(String(dep.bedCount));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalOpen(false);
  };
  
  const handleSaveDepartment = () => {
    if (newDepartmentName.trim() && newManagerName.trim() && newManagerNationalId.trim() && newManagerPassword.trim() && newStaffCount && newBedCount) {
      const staffCountNum = parseInt(newStaffCount, 10);
      const bedCountNum = parseInt(newBedCount, 10);
      
      if(editingDepartment) {
        onUpdateDepartment(editingDepartment.id, {
          name: newDepartmentName.trim(),
          managerName: newManagerName.trim(),
          managerNationalId: newManagerNationalId.trim(),
          managerPassword: newManagerPassword.trim(),
          staffCount: staffCountNum,
          bedCount: bedCountNum,
        });
      } else {
        onAddDepartment(
          newDepartmentName.trim(), 
          newManagerName.trim(),
          newManagerNationalId.trim(),
          newManagerPassword.trim(),
          staffCountNum,
          bedCountNum
        );
      }
      resetForm();
      setIsModalOpen(false);
    } else {
        alert("لطفاً تمام فیلدها را پر کنید.")
    }
  };

  // --- Reset Hospital Modal Handlers ---
  const resetResetModal = () => {
    setIsResetModalOpen(false);
    setTimeout(() => {
        setResetStep(1);
        setSupervisorIdInput('');
        setResetError(null);
    }, 300); // Delay reset to allow modal to close gracefully
  };

  const handleOpenResetModal = () => {
    setResetError(null);
    setResetStep(1);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    const success = await onResetHospital(supervisorIdInput.trim());
    if (success) {
      alert('تمام بخش‌های بیمارستان با موفقیت حذف شدند.');
      resetResetModal();
    } else {
      setResetError('کد ملی سوپروایزر نامعتبر است یا خطایی رخ داده است.');
    }
  };

    // --- Archive Year Modal Handlers ---
    const handleOpenArchiveModal = () => {
        setIsArchiveModalOpen(true);
    };

    const handleCloseArchiveModal = () => {
        setIsArchiveModalOpen(false);
        setTimeout(() => {
            setArchiveStep(1);
            setYearConfirmation('');
        }, 300);
    };

    const handleConfirmArchive = () => {
        const yearToArchive = parseInt(suggestedYear, 10);
        if (yearConfirmation === suggestedYear) {
            onArchiveYear(yearToArchive);
            alert(`اطلاعات سال ${suggestedYear} با موفقیت بایگانی شد و سامانه برای سال ${yearToArchive + 1} آماده است.`);
            handleCloseArchiveModal();
        } else {
            alert(`عدد وارد شده با سال جاری (${suggestedYear}) مطابقت ندارد.`);
        }
    };

    const baseBtnClass = "flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition-all hover:shadow-md active:scale-98 text-center";

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          {userRole === UserRole.Admin && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="بازگشت به لیست بیمارستان‌ها"
            >
              <BackIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>بازگشت به لیست بیمارستان‌ها</span>
            </button>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">
            بخش‌های بیمارستان: <span className="text-slate-600 dark:text-slate-400">{hospital.name}</span>
          </h1>
        </div>

        {/* Action Buttons: Responsive Grid on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto justify-end">
          {/* Hero Strategic Plan Button */}
          <button
            onClick={handleOpenHospitalStrategicPlan}
            className={`${baseBtnClass} col-span-2 sm:col-auto bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 hover:from-indigo-800 hover:to-blue-900 shadow-md border border-indigo-400/30 text-white`}
            title="تحلیل جامع هوش مصنوعی و تدوین برنامه راهبردی کل بیمارستان"
          >
            <AiIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse shrink-0" />
            <span>برنامه راهبردی کل بیمارستان (هوش مصنوعی)</span>
          </button>

          {/* Add New Department Button */}
          <button
            onClick={handleOpenAddModal}
            className={`${baseBtnClass} col-span-2 sm:col-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>افزودن بخش جدید</span>
          </button>

          {/* Sensitive Clinical Indicators Button - Located right above Corrective Actions */}
          <button
            onClick={onManageSensitiveIndicators}
            className={`${baseBtnClass} col-span-2 sm:col-auto bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md border border-purple-400/30`}
            title="پایش شاخص‌های حساس بیمارستانی (۱۳ شیت)، نمودارها و تحلیل هوش مصنوعی"
          >
            <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-300" />
            <span className="font-black">شاخص‌های حساس</span>
          </button>

          {/* Action Pairs in 2-column grid */}
          <button
            onClick={onManageCorrectiveActions}
            className={`${baseBtnClass} col-span-1 sm:col-auto bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500`}
          >
            <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>اقدامات اصلاحی</span>
          </button>

          <button
            onClick={onManageAccreditation}
            className={`${baseBtnClass} col-span-1 sm:col-auto bg-green-600 hover:bg-green-700 focus:ring-green-500`}
          >
            <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>مطالب اعتباربخشی</span>
          </button>

          {(userRole === UserRole.Supervisor || userRole === UserRole.Admin) && (
            <button
              onClick={onManageNeedsAssessment}
              className={`${baseBtnClass} col-span-1 sm:col-auto bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400`}
            >
              <LightbulbIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>نیازسنجی و نظرسنجی</span>
            </button>
          )}

          <button
            onClick={onManageNewsBanners}
            className={`${baseBtnClass} col-span-1 sm:col-auto bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500`}
          >
            <NewspaperIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>افزودن بنرهای خبری</span>
          </button>

          {(userRole === UserRole.Supervisor || userRole === UserRole.Admin) && (
            <button
              onClick={handleOpenArchiveModal}
              className={`${baseBtnClass} col-span-1 sm:col-auto bg-slate-700 hover:bg-slate-800 focus:ring-slate-500`}
            >
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>بایگانی سال جدید</span>
            </button>
          )}

          {(userRole === UserRole.Admin || userRole === UserRole.Supervisor) && (
            <button
              onClick={handleOpenResetModal}
              className={`${baseBtnClass} col-span-1 sm:col-auto bg-rose-600 hover:bg-rose-700 focus:ring-rose-500`}
            >
              <RefreshIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>ریست بیمارستان</span>
            </button>
          )}

          {userRole === UserRole.Supervisor && (
            <button
              onClick={onContactAdmin}
              className={`${baseBtnClass} col-span-2 sm:col-auto bg-purple-600 hover:bg-purple-700 focus:ring-purple-500`}
            >
              <ChatIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>تماس با ادمین کل</span>
            </button>
          )}
        </div>
      </div>

      {hospital.departments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl shadow">
            <h2 className="text-xl font-medium text-slate-500">هیچ بخشی یافت نشد.</h2>
            <p className="text-slate-400 mt-2">برای شروع، یک بخش جدید اضافه کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {hospital.departments.map((dep) => (
            <div
              key={dep.id}
              className="relative group bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 border-t-4 border-indigo-500 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                onClick={() => onSelectDepartment(dep.id)}
                className="p-6 cursor-pointer"
              >
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{dep.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{dep.staff.length} نفر پرسنل</p>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(dep); }}
                    className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-100 dark:bg-slate-700 rounded-full"
                    aria-label="Edit Department"
                >
                    <EditIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDepartmentToDelete(dep);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-700 rounded-full"
                  aria-label="Delete Department"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDepartment ? "ویرایش مشخصات بخش" : "افزودن بخش جدید"}>
        <div className="space-y-4">
          <input
            type="text"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            placeholder="نام بخش (مثال: اورژانس)"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
           <input
            type="text"
            value={newManagerName}
            onChange={(e) => setNewManagerName(e.target.value)}
            placeholder="نام مسئول بخش"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            inputMode="numeric"
            value={newManagerNationalId}
            onChange={(e) => setNewManagerNationalId(e.target.value.replace(/\D/g, ''))}
            placeholder="کد ملی مسئول بخش"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            value={newManagerPassword}
            onChange={(e) => setNewManagerPassword(e.target.value)}
            placeholder="رمز ورود مسئول بخش"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
           <input
            type="number"
            value={newStaffCount}
            onChange={(e) => setNewStaffCount(e.target.value)}
            placeholder="تعداد نیروی بخش"
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
           <input
            type="number"
            value={newBedCount}
            onChange={(e) => setNewBedCount(e.target.value)}
            placeholder="تعداد تخت های بخش"
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
                onClick={handleSaveDepartment}
                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
                {editingDepartment ? 'ذخیره تغییرات' : 'افزودن'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isResetModalOpen} onClose={resetResetModal} title="ریست کردن اطلاعات بیمارستان">
        {resetStep === 1 && (
            <div className="text-center">
                <p className="text-lg mb-6">آیا مایل به پاک کردن تمام بخش ها هستین؟ این عمل غیرقابل بازگشت است.</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={resetResetModal}
                        className="px-6 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                    >
                        خیر
                    </button>
                    <button
                        onClick={() => setResetStep(2)}
                        className="px-6 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                        بله، ادامه
                    </button>
                </div>
            </div>
        )}
        {resetStep === 2 && (
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    برای تایید، لطفاً کد ملی سوپروایزر آموزشی این بیمارستان را وارد کنید.
                    {userRole === UserRole.Admin && (
                        <span className="block mt-2 font-semibold">
                            (ادمین کل می‌تواند از کد ملی خود به عنوان کلید اصلی استفاده کند)
                        </span>
                    )}
                </p>
                <input
                    type="text"
                    inputMode="numeric"
                    value={supervisorIdInput}
                    onChange={(e) => { setSupervisorIdInput(e.target.value.replace(/\D/g, '')); setResetError(null); }}
                    placeholder="کد ملی سوپروایزر"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {resetError && <p className="text-red-500 text-sm text-center">{resetError}</p>}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={resetResetModal}
                        className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={handleConfirmReset}
                        className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                        تایید و حذف تمام بخش‌ها
                    </button>
                </div>
            </div>
        )}
      </Modal>

      <Modal isOpen={isArchiveModalOpen} onClose={handleCloseArchiveModal} title="بایگانی و شروع سال جدید">
        {archiveStep === 1 && (
            <div className="text-center space-y-4">
            <p className="text-lg">این عملیات تمام داده‌های عملکردی (ارزیابی‌ها، کارکرد ماهانه، آزمون‌ها و...) سال جاری را بایگانی کرده و سیستم را برای ثبت اطلاعات در سال جدید آماده می‌کند.</p>
            <p className="font-bold text-red-600">این عمل غیرقابل بازگشت است.</p>
            <div className="flex justify-center gap-4 pt-4">
                <button
                onClick={handleCloseArchiveModal}
                className="px-6 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                انصراف
                </button>
                <button
                onClick={() => setArchiveStep(2)}
                className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                متوجه شدم، ادامه
                </button>
            </div>
            </div>
        )}
        {archiveStep === 2 && (
            <div className="space-y-4">
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                برای تایید نهایی، لطفاً سال جاری ({suggestedYear}) را در کادر زیر وارد کنید.
            </p>
            <input
                type="text"
                inputMode="numeric"
                value={yearConfirmation}
                onChange={(e) => setYearConfirmation(e.target.value.replace(/\D/g, ''))}
                placeholder={suggestedYear}
                className="w-full text-center tracking-[.5em] text-2xl px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-3 pt-2">
                <button
                onClick={handleCloseArchiveModal}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                انصراف
                </button>
                <button
                onClick={handleConfirmArchive}
                className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                تایید و بایگانی
                </button>
            </div>
            </div>
        )}
        </Modal>

        <ConfirmationModal
          isOpen={!!departmentToDelete}
          onClose={() => setDepartmentToDelete(null)}
          onConfirm={() => {
            if (departmentToDelete) {
              onDeleteDepartment(departmentToDelete.id);
              setDepartmentToDelete(null);
            }
          }}
          title="تایید حذف بخش"
          message={`آیا از حذف بخش "${departmentToDelete?.name}" مطمئن هستید؟ با حذف این بخش، تمامی اطلاعات پرسنل، چک‌لیست‌ها و ارزیابی‌های مربوط به آن به طور کامل حذف خواهند شد.`}
          confirmButtonText="حذف بخش"
          cancelButtonText="انصراف"
        />

        <PeriodicPlanModal
          isOpen={isHospitalPlanOpen}
          onClose={() => setIsHospitalPlanOpen(false)}
          title={`برنامه راهبردی و بهبود کیفیت پرستاری کل بیمارستان (${hospital.name})`}
          content={hospitalPlanContent}
          isLoading={isHospitalPlanLoading}
          overallAvg={hospitalOverallAvg}
          genAvg={hospitalGenAvg}
          specAvg={hospitalSpecAvg}
          commAvg={hospitalCommAvg}
          targetTitle={hospital.name}
          mode="hospital"
          hospitalName={hospital.name}
          departmentName="کلیه بخش‌های درمانی و پاراکلینیکی"
          totalStaffCount={hospitalTotalStaff}
        />
     </div>
  );
};

export default DepartmentList;