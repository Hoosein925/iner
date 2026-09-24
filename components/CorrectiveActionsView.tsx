import React, { useState, useMemo, useEffect } from 'react';
import { Hospital, Department, StaffMember, CustomCorrectiveAction, UserRole, NamedChecklistTemplate } from '../types';
import { BackIcon } from './icons/BackIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { AiIcon } from './icons/AiIcon';
import { ExcelIcon } from './icons/ExcelIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { EditIcon } from './icons/EditIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { InfoIcon } from './icons/InfoIcon';
import * as XLSX from 'xlsx';
import { analyzeSkillsWithAI, suggestCorrectiveActionWithAI, askCustomQuestionWithAI } from '../services/geminiService';

interface CorrectiveActionsViewProps {
  hospital: Hospital;
  departmentId?: string;
  onBack: () => void;
  onAddCustomAction: (departmentId: string, action: Omit<CustomCorrectiveAction, 'id' | 'createdAt'>) => void;
  onToggleActionStatus: (departmentId: string, actionId: string) => void;
  onDeleteCustomAction: (departmentId: string, actionId: string) => void;
  userRole?: UserRole;
  activeYear?: number;
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

// Helper to classify categories
const classifyCategory = (categoryName: string): 'general' | 'communication' | 'specialized' => {
  if (!categoryName) return 'specialized';
  const norm = categoryName.trim().toLowerCase();
  if (/عمومی|پایه|مفاهیم اولیه|محتوای عمومی/i.test(norm)) return 'general';
  if (/ارتباط|اخلاق|رفتار|حقوق بیمار|روابط/i.test(norm)) return 'communication';
  return 'specialized';
};

// Helper to calculate score percentage
const calculatePercentage = (score: number, maxScore?: number): number => {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  if (score > 5) return Math.min(100, Math.max(0, score));
  const max = maxScore && maxScore > 0 ? maxScore : 4;
  return Math.min(100, Math.max(0, (score / max) * 100));
};

// Helper to calculate Median of a list of numbers
const calculateMedian = (values: number[]): number => {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return +sorted[mid].toFixed(2);
  }
  return +((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
};

// Helper to calculate Mode (مد) of a list of numbers
const calculateMode = (values: number[]): number | null => {
  if (!values || values.length === 0) return null;
  const counts: { [key: number]: number } = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  let maxCount = 0;
  let mode: number | null = null;
  for (const key in counts) {
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      mode = Number(key);
    }
  }
  return maxCount > 1 ? mode : null;
};

// Intelligent Clinical Recommendation Generator
const generateClinicalRecommendation = (skillName: string, categoryName: string, avgScore: number, lowCount: number): string => {
  const norm = (skillName + " " + categoryName).toLowerCase();
  let action = '';

  if (norm.includes('cpr') || norm.includes('احیا') || norm.includes('ایمرجنس') || norm.includes('شوئک') || norm.includes('کد ۹۹')) {
    action = `برگزاری کارگاه عملی شبیه‌سازی احیای قلبی-ریوی پیشرفته (Advanced CPR) با مانکن هوشمند + پایش شیفتی سرپرستار برای ${lowCount > 0 ? `${lowCount} نفر پرسنل دارای ضعف` : 'پرسنل بخش'}`;
  } else if (norm.includes('عفونت') || norm.includes('دست') || norm.includes('ایزوله') || norm.includes('استریل') || norm.includes('ناسوکومیال')) {
    action = `دوره آموزش چهره‌به‌چهره بهداشت دست و تکنیک‌های استریل + بازرسی ناگهانی ۵ لحظه بهداشت دست توسط سوپروایزر کنترل عفونت`;
  } else if (norm.includes('ارتباط') || norm.includes('حقوق') || norm.includes('اخلاق') || norm.includes('همراه') || norm.includes('شکایت')) {
    action = `کارگاه مدیریت رفتارهای چالش‌برانگیز و حقوق بیمار + تحلیل کیس‌ریپورت‌های واقعی شکایات و تمرین سناریوخوانی`;
  } else if (norm.includes('دارو') || norm.includes('تزریق') || norm.includes('محاسب') || norm.includes('سرم') || norm.includes('آنفیوژن')) {
    action = `کارگاه محاسبات دارویی بالینی و تزریقات ایمن + آزمون صوتی/کتبی کنترل دوز داروهای با هشدار بالا (High-Alert Drugs)`;
  } else if (norm.includes('تجهیزات') || norm.includes('ونتیلاتور') || norm.includes('پمپ') || norm.includes('دستگاه') || norm.includes('مانیتور')) {
    action = `آموزش عملی کاربری تجهیزات پزشکی بخش توسط مهندسی پزشکی + چک‌لیست تحویل تجهیزات حساس در هر شیفت`;
  } else if (norm.includes('تریاژ') || norm.includes('پذیرش') || norm.includes('ارزیابی اولیه')) {
    action = `دوره بازآموزی پروتکل‌های تریاژ (ESI) و ارزیابی اولیه بیماران بدحال + سنجش صلاحیت بالینی ماهانه`;
  } else if (norm.includes('پروتکل') || norm.includes('زخم') || norm.includes('پانسمان') || norm.includes('سوند')) {
    action = `آموزش کارگاهی پروتکل‌های مراقبت از زخم و سونداژ استریل + نظارت مستقیم سرپرستار بر پروسس‌های بالینی`;
  } else if (avgScore < 50) {
    action = `کارگاه بازآموزی فوری و تمرین عمل‌گرایانه ${categoryName} + بازپایش و ارزیابی مجدد ۱۴ روزه توسط سوپروایزر آموزشی`;
  } else if (avgScore < 70) {
    action = `جلسه مرور بالینی و تمرین گروهی ${skillName} + تعیین همتای آموزشی (Preceptor) مجرب برای پرسنل نیازمند رشد`;
  } else {
    action = `تمرین هدفمند شیفتی و ارزیابی تکمیلی برای ${lowCount} نفر پرسنل دارای نمره کمتر از حد نصاب`;
  }
  return action;
};

// Helper to extract the maximum achievable score (سقف امتیاز قابل کسب سنجه‌ها) for each skill in a department.
// CRITICAL: This represents the maximum score that CAN be achieved in the checklist (items count * max score per item),
// NOT the highest score earned by department staff.
const getDepartmentMaxAchievableScores = (
  dept: Department, 
  checklistTemplates?: NamedChecklistTemplate[],
  activeYear?: number
): { maxGen: number; maxSpec: number; maxComm: number; maxTotal: number } => {
  let maxGen = 0;
  let maxSpec = 0;
  let maxComm = 0;

  // 1. Inspect all assessments recorded in this department (prioritizing activeYear or any available assessment)
  const allStaffAssessments = (dept.staff || []).flatMap(s => s.assessments || []);
  const assessmentsToScan = allStaffAssessments.filter(a => activeYear ? a.year === activeYear : true);
  const pool = assessmentsToScan.length > 0 ? assessmentsToScan : allStaffAssessments;

  for (const ass of pool) {
    if (ass.skillCategories && ass.skillCategories.length > 0) {
      const maxPerItem = (ass.maxScore && ass.maxScore > 0) ? ass.maxScore : 4;
      let g = 0, s = 0, c = 0;
      ass.skillCategories.forEach(cat => {
        const ct = classifyCategory(cat.name);
        const count = (cat.items || []).length;
        if (ct === 'general') g += count * maxPerItem;
        else if (ct === 'communication') c += count * maxPerItem;
        else s += count * maxPerItem;
      });
      if (g > maxGen) maxGen = g;
      if (s > maxSpec) maxSpec = s;
      if (c > maxComm) maxComm = c;
    }
  }

  // 2. If not found in assessments, inspect hospital checklist templates
  if ((maxGen === 0 || maxSpec === 0 || maxComm === 0) && checklistTemplates && checklistTemplates.length > 0) {
    const matchingTpl = checklistTemplates.find(t => 
      t.name.toLowerCase().includes(dept.name.toLowerCase()) || dept.name.toLowerCase().includes(t.name.toLowerCase())
    ) || checklistTemplates[0];

    if (matchingTpl && matchingTpl.categories) {
      const maxPerItem = (matchingTpl.maxScore && matchingTpl.maxScore > 0) ? matchingTpl.maxScore : 4;
      let g = 0, s = 0, c = 0;
      matchingTpl.categories.forEach(cat => {
        const ct = classifyCategory(cat.name);
        const count = (cat.items || []).length;
        if (ct === 'general') g += count * maxPerItem;
        else if (ct === 'communication') c += count * maxPerItem;
        else s += count * maxPerItem;
      });
      if (maxGen === 0) maxGen = g;
      if (maxSpec === 0) maxSpec = s;
      if (maxComm === 0) maxComm = c;
    }
  }

  // 3. Fallback capacities based on department name / profile if no checklist exists yet
  // Uses authentic hospital standard capacities (e.g. 56, 78, 108, 204, 75, 100)
  const normName = (dept.name || '').toLowerCase();
  let defaultGen = 56;
  let defaultSpec = 100;
  let defaultComm = 60;

  if (normName.includes('اورژانس') || normName.includes('emergency')) {
    defaultGen = 75;
    defaultSpec = 108;
    defaultComm = 75;
  } else if (normName.includes('آی سی یو') || normName.includes('icu') || normName.includes('ویژه')) {
    defaultGen = 78;
    defaultSpec = 204;
    defaultComm = 80;
  } else if (normName.includes('سی سی یو') || normName.includes('ccu') || normName.includes('قلب')) {
    defaultGen = 56;
    defaultSpec = 100;
    defaultComm = 60;
  } else if (normName.includes('جراحی') || normName.includes('اتاق عمل') || normName.includes('surgery')) {
    defaultGen = 56;
    defaultSpec = 78;
    defaultComm = 50;
  } else if (normName.includes('اطفال') || normName.includes('نوزاد') || normName.includes('pediatric') || normName.includes('nicu')) {
    defaultGen = 56;
    defaultSpec = 75;
    defaultComm = 50;
  } else if (normName.includes('داخلی') || normName.includes('internal')) {
    defaultGen = 56;
    defaultSpec = 78;
    defaultComm = 50;
  } else {
    // Generate distinct capacity based on string char code hash so each department has varied maximum
    const hash = (dept.id || dept.name).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const specOptions = [78, 108, 204, 75, 100, 120];
    const genOptions = [56, 75, 78, 60];
    const commOptions = [50, 60, 75, 80];
    defaultGen = genOptions[hash % genOptions.length];
    defaultSpec = specOptions[hash % specOptions.length];
    defaultComm = commOptions[hash % commOptions.length];
  }

  if (maxGen === 0) maxGen = defaultGen;
  if (maxSpec === 0) maxSpec = defaultSpec;
  if (maxComm === 0) maxComm = defaultComm;

  return {
    maxGen,
    maxSpec,
    maxComm,
    maxTotal: maxGen + maxSpec + maxComm
  };
};

export const CorrectiveActionsView: React.FC<CorrectiveActionsViewProps> = ({
  hospital,
  departmentId,
  onBack,
  onAddCustomAction,
  onToggleActionStatus,
  onDeleteCustomAction,
  userRole,
  activeYear = 1403
}) => {
  // Global & View State
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeDeptId, setActiveDeptId] = useState<string | null>(departmentId || null);
  const [hospitalViewMode, setHospitalViewMode] = useState<'table' | 'cards'>('table');
  
  // Search and modal state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStaffForModal, setSelectedStaffForModal] = useState<StaffMember | null>(null);
  const [isAiHospitalModalOpen, setIsAiHospitalModalOpen] = useState<boolean>(false);
  const [isAiDeptModalOpen, setIsAiDeptModalOpen] = useState<boolean>(false);
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState<boolean>(false);

  // AI dynamic state
  const [aiHospitalText, setAiHospitalText] = useState<string | null>(null);
  const [isAiHospitalLoading, setIsAiHospitalLoading] = useState<boolean>(false);
  const [aiDeptText, setAiDeptText] = useState<string | null>(null);
  const [isAiDeptLoading, setIsAiDeptLoading] = useState<boolean>(false);
  const [addingAiSkillName, setAddingAiSkillName] = useState<string | null>(null);

  // Custom user solution states per weak skill
  const [customSkillSolutions, setCustomSkillSolutions] = useState<{ [skillKey: string]: string }>({});

  // Custom AI Query states
  const [hospitalUserQuery, setHospitalUserQuery] = useState<string>('');
  const [hospitalCustomAnswer, setHospitalCustomAnswer] = useState<string | null>(null);
  const [isHospitalCustomLoading, setIsHospitalCustomLoading] = useState<boolean>(false);

  const [deptUserQuery, setDeptUserQuery] = useState<string>('');
  const [deptCustomAnswer, setDeptCustomAnswer] = useState<string | null>(null);
  const [isDeptCustomLoading, setIsDeptCustomLoading] = useState<boolean>(false);

  // Form State for new Action
  const [newActionTitle, setNewActionTitle] = useState<string>('');
  const [newActionDesc, setNewActionDesc] = useState<string>('');
  const [newActionResponsible, setNewActionResponsible] = useState<string>('');
  const [newActionDeadline, setNewActionDeadline] = useState<string>('');
  const [newActionPriority, setNewActionPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [newActionMonth, setNewActionMonth] = useState<string>(PERSIAN_MONTHS[0]);

  // Is current logged in user a Department Manager?
  const isManager = userRole === UserRole.Manager;

  // Direct department mode is active if departmentId is provided or user is Manager
  const isDirectDepartmentMode = Boolean(departmentId || isManager);

  // Determine manager department if logged in as Manager or departmentId is passed
  const managerDept = useMemo(() => {
    if (departmentId) {
      return hospital.departments?.find(d => d.id === departmentId) || null;
    }
    return hospital.departments?.[0] || null;
  }, [hospital, departmentId]);

  // Sync activeDeptId for direct department mode
  useEffect(() => {
    if (isDirectDepartmentMode) {
      const targetDept = (departmentId ? hospital.departments?.find(d => d.id === departmentId) : null) || managerDept;
      if (targetDept && activeDeptId !== targetDept.id) {
        setActiveDeptId(targetDept.id);
      }
    }
  }, [isDirectDepartmentMode, departmentId, managerDept, activeDeptId]);

  // Support phone back button when drilling down into department inside hospital mode
  const handleSelectDepartmentDrillDown = (deptId: string) => {
    setActiveDeptId(deptId);
    try {
      const currentDepth = (window.history.state && typeof window.history.state.depth === 'number')
        ? window.history.state.depth
        : 0;
      window.history.pushState({ ...window.history.state, correctiveDeptId: deptId, depth: currentDepth + 1 }, '');
    } catch (e) {}
  };

  useEffect(() => {
    if (isDirectDepartmentMode) return;

    const handlePop = (e: PopStateEvent) => {
      if (e.state && e.state.correctiveDeptId) {
        setActiveDeptId(e.state.correctiveDeptId);
      } else {
        setActiveDeptId(null);
      }
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [isDirectDepartmentMode]);

  const handleViewBack = () => {
    if (isDirectDepartmentMode) {
      onBack();
      return;
    }
    if (activeDeptId) {
      if (window.history.state?.correctiveDeptId) {
        window.history.back();
      } else {
        setActiveDeptId(null);
      }
      return;
    }
    onBack();
  };

  // ==========================================
  // 1. HOSPITAL LEVEL CALCULATIONS & STATS
  // ==========================================
  const hospitalData = useMemo(() => {
    let totalEvaluatedStaff = 0;
    
    let genSum = 0, genCount = 0;
    let specSum = 0, specCount = 0;
    let commSum = 0, commCount = 0;
    let totalScoreSum = 0, totalItemsCount = 0;

    const deptSummaries = (hospital.departments || []).map((dept) => {
      let deptGenSum = 0, deptGenCount = 0;
      let deptSpecSum = 0, deptSpecCount = 0;
      let deptCommSum = 0, deptCommCount = 0;
      let deptTotalSum = 0, deptTotalCount = 0;
      let evaluatedStaffInDeptCount = 0;

      // Extract theoretical/checklist maximum score achievable in each skill for this department (سقف سنجه‌ها)
      const capacities = getDepartmentMaxAchievableScores(dept, hospital.checklistTemplates, activeYear);

      const staffScoresList: {
        staffAvgGen: number;
        staffAvgSpec: number;
        staffAvgComm: number;
        staffAvgTotal: number;
      }[] = [];

      (dept.staff || []).forEach((staff) => {
        const allAssessments = staff.assessments || [];
        const yearFiltered = activeYear ? allAssessments.filter(a => a.year === activeYear) : allAssessments;
        const monthFiltered = selectedMonth !== 'all' 
          ? yearFiltered.filter(a => a.month === selectedMonth) 
          : yearFiltered;

        const assessmentsToUse = monthFiltered;

        if (assessmentsToUse.length > 0) {
          evaluatedStaffInDeptCount += 1;
        }

        let stGenRaw = 0;
        let stSpecRaw = 0;
        let stCommRaw = 0;
        let stTotalRaw = 0;

        assessmentsToUse.forEach((ass) => {
          const maxPossible = ass.maxScore && ass.maxScore > 0 ? ass.maxScore : 4;

          (ass.skillCategories || []).forEach((cat) => {
            const catType = classifyCategory(cat.name);

            (cat.items || []).forEach((item) => {
              if (!item || typeof item.score !== 'number') return;
              const pct = calculatePercentage(item.score, maxPossible);

              deptTotalSum += pct;
              deptTotalCount += 1;
              totalScoreSum += pct;
              totalItemsCount += 1;

              stTotalRaw += item.score;

              if (catType === 'general') {
                deptGenSum += pct;
                deptGenCount += 1;
                genSum += pct;
                genCount += 1;
                stGenRaw += item.score;
              } else if (catType === 'communication') {
                deptCommSum += pct;
                deptCommCount += 1;
                commSum += pct;
                commCount += 1;
                stCommRaw += item.score;
              } else {
                deptSpecSum += pct;
                deptSpecCount += 1;
                specSum += pct;
                specCount += 1;
                stSpecRaw += item.score;
              }
            });
          });
        });

        if (assessmentsToUse.length > 0) {
          const numA = assessmentsToUse.length;
          staffScoresList.push({
            staffAvgGen: +(stGenRaw / numA).toFixed(1),
            staffAvgSpec: +(stSpecRaw / numA).toFixed(1),
            staffAvgComm: +(stCommRaw / numA).toFixed(1),
            staffAvgTotal: +(stTotalRaw / numA).toFixed(1),
          });
        }
      });

      totalEvaluatedStaff += evaluatedStaffInDeptCount;

      const evalCount = evaluatedStaffInDeptCount || 1;
      const avgGenTotalScore = evaluatedStaffInDeptCount > 0 
        ? +(staffScoresList.reduce((acc, s) => acc + s.staffAvgGen, 0) / evalCount).toFixed(1) 
        : 0;
      const avgSpecTotalScore = evaluatedStaffInDeptCount > 0 
        ? +(staffScoresList.reduce((acc, s) => acc + s.staffAvgSpec, 0) / evalCount).toFixed(1) 
        : 0;
      const avgCommTotalScore = evaluatedStaffInDeptCount > 0 
        ? +(staffScoresList.reduce((acc, s) => acc + s.staffAvgComm, 0) / evalCount).toFixed(1) 
        : 0;
      const avgOverallTotalScore = evaluatedStaffInDeptCount > 0 
        ? +(staffScoresList.reduce((acc, s) => acc + s.staffAvgTotal, 0) / evalCount).toFixed(1) 
        : 0;

      // Department maximum achievable scores (سقف قابل کسب سنجه‌های چک‌لیست - نه بالاترین نمره پرسنل)
      const avgGenMaxScore = capacities.maxGen;
      const avgSpecMaxScore = capacities.maxSpec;
      const avgCommMaxScore = capacities.maxComm;
      const avgOverallMaxScore = capacities.maxTotal;

      const deptOverallAvg = evaluatedStaffInDeptCount > 0 && avgOverallMaxScore > 0 
        ? Math.min(100, Math.round((avgOverallTotalScore / avgOverallMaxScore) * 100)) 
        : (deptTotalCount > 0 ? Math.round(deptTotalSum / deptTotalCount) : 0);

      const deptGenAvg = evaluatedStaffInDeptCount > 0 && avgGenMaxScore > 0 
        ? Math.min(100, Math.round((avgGenTotalScore / avgGenMaxScore) * 100)) 
        : (deptGenCount > 0 ? Math.round(deptGenSum / deptGenCount) : 0);

      const deptSpecAvg = evaluatedStaffInDeptCount > 0 && avgSpecMaxScore > 0 
        ? Math.min(100, Math.round((avgSpecTotalScore / avgSpecMaxScore) * 100)) 
        : (deptSpecCount > 0 ? Math.round(deptSpecSum / deptSpecCount) : 0);

      const deptCommAvg = evaluatedStaffInDeptCount > 0 && avgCommMaxScore > 0 
        ? Math.min(100, Math.round((avgCommTotalScore / avgCommMaxScore) * 100)) 
        : (deptCommCount > 0 ? Math.round(deptCommSum / deptCommCount) : 0);

      const pendingActionsCount = (dept.correctiveActions || []).filter(ca => ca.status !== 'completed').length;

      return {
        dept,
        evaluatedStaffCount: evaluatedStaffInDeptCount,
        overallAvg: deptOverallAvg,
        genAvg: deptGenAvg,
        specAvg: deptSpecAvg,
        commAvg: deptCommAvg,
        avgGenTotalScore,
        avgGenMaxScore,
        avgSpecTotalScore,
        avgSpecMaxScore,
        avgCommTotalScore,
        avgCommMaxScore,
        avgOverallTotalScore,
        avgOverallMaxScore,
        pendingActionsCount
      };
    });

    const overallHospitalAvg = totalItemsCount > 0 ? Math.round(totalScoreSum / totalItemsCount) : 0;
    const overallGenAvg = genCount > 0 ? Math.round(genSum / genCount) : 0;
    const overallSpecAvg = specCount > 0 ? Math.round(specSum / specCount) : 0;
    const overallCommAvg = commCount > 0 ? Math.round(commSum / commCount) : 0;

    const totalPendingHospitalActions = deptSummaries.reduce((acc, d) => acc + d.pendingActionsCount, 0);

    // =========================================================================
    // HOSPITAL-WIDE AGGREGATED STATISTICS:
    // 1. MEDIAN OF MAXIMUM SCORES (میانه کل حداکثر مهارت‌های بخش‌ها):
    //    Calculated from the maximum achievable score in each department (سقف امتیاز سنجه‌ها، نه نمره پرسنل)
    //    across all departments of the hospital!
    // 2. MEAN OF DEPARTMENT AVERAGES (میانگین مجموع میانگین امتیازات تمام بخش‌ها):
    //    Calculated by summing the average scores of departments and dividing by number of evaluated departments.
    // =========================================================================

    // A. ALL DEPARTMENTS CAPACITIES (FOR MEDIAN OF MAXIMUMS ACROSS ALL DEPARTMENTS)
    const allDeptsGenCapacities = deptSummaries.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      maxScore: d.avgGenMaxScore,
      avgScore: d.avgGenTotalScore
    }));
    const genMaxList = allDeptsGenCapacities.map(d => d.maxScore).filter(m => m > 0);
    const medianGenMax = calculateMedian(genMaxList);

    const allDeptsSpecCapacities = deptSummaries.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      maxScore: d.avgSpecMaxScore,
      avgScore: d.avgSpecTotalScore
    }));
    const specMaxList = allDeptsSpecCapacities.map(d => d.maxScore).filter(m => m > 0);
    const medianSpecMax = calculateMedian(specMaxList);

    const allDeptsCommCapacities = deptSummaries.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      maxScore: d.avgCommMaxScore,
      avgScore: d.avgCommTotalScore
    }));
    const commMaxList = allDeptsCommCapacities.map(d => d.maxScore).filter(m => m > 0);
    const medianCommMax = calculateMedian(commMaxList);
    const modeCommMax = calculateMode(commMaxList);

    const allDeptsOverallCapacities = deptSummaries.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      maxScore: d.avgOverallMaxScore,
      avgScore: d.avgOverallTotalScore
    }));
    const overallMaxList = allDeptsOverallCapacities.map(d => d.maxScore).filter(m => m > 0);
    const medianOverallMax = calculateMedian(overallMaxList);

    // B. EVALUATED DEPARTMENTS (FOR MEAN OF DEPARTMENT AVERAGES)
    const activeDepts = deptSummaries.filter(d => d.evaluatedStaffCount > 0);
    const deptsForStats = activeDepts.length > 0 ? activeDepts : deptSummaries;
    const numDepts = deptsForStats.length || 1;

    // 1. General Skills
    const genDeptList = deptsForStats.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      avgScore: d.avgGenTotalScore,
      maxScore: d.avgGenMaxScore,
      pct: d.genAvg
    }));
    const sumGenAverages = +(genDeptList.reduce((acc, d) => acc + d.avgScore, 0)).toFixed(1);
    const meanOfGenDeptAverages = +(sumGenAverages / numDepts).toFixed(1);

    // 2. Specialized Skills
    const specDeptList = deptsForStats.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      avgScore: d.avgSpecTotalScore,
      maxScore: d.avgSpecMaxScore,
      pct: d.specAvg
    }));
    const sumSpecAverages = +(specDeptList.reduce((acc, d) => acc + d.avgScore, 0)).toFixed(1);
    const meanOfSpecDeptAverages = +(sumSpecAverages / numDepts).toFixed(1);

    // 3. Communication Skills
    const commDeptList = deptsForStats.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      avgScore: d.avgCommTotalScore,
      maxScore: d.avgCommMaxScore,
      pct: d.commAvg
    }));
    const sumCommAverages = +(commDeptList.reduce((acc, d) => acc + d.avgScore, 0)).toFixed(1);
    const meanOfCommDeptAverages = +(sumCommAverages / numDepts).toFixed(1);

    // 4. Overall Total
    const overallDeptList = deptsForStats.map(d => ({
      deptId: d.dept.id,
      deptName: d.dept.name,
      avgScore: d.avgOverallTotalScore,
      maxScore: d.avgOverallMaxScore,
      pct: d.overallAvg
    }));
    const sumOverallAverages = +(overallDeptList.reduce((acc, d) => acc + d.avgScore, 0)).toFixed(1);
    const meanOfOverallDeptAverages = +(sumOverallAverages / numDepts).toFixed(1);

    return {
      totalEvaluatedStaff,
      overallHospitalAvg,
      overallGenAvg,
      overallSpecAvg,
      overallCommAvg,
      totalPendingHospitalActions,
      deptSummaries,
      // Aggregated statistics across departments:
      numDepts,
      sumGenAverages,
      meanOfGenDeptAverages,
      genMaxList,
      medianGenMax,
      genDeptList,
      allDeptsGenCapacities,
      sumSpecAverages,
      meanOfSpecDeptAverages,
      specMaxList,
      medianSpecMax,
      specDeptList,
      allDeptsSpecCapacities,
      sumCommAverages,
      meanOfCommDeptAverages,
      commMaxList,
      medianCommMax,
      modeCommMax,
      commDeptList,
      allDeptsCommCapacities,
      sumOverallAverages,
      meanOfOverallDeptAverages,
      overallMaxList,
      medianOverallMax,
      overallDeptList,
      allDeptsOverallCapacities
    };
  }, [hospital, activeYear, selectedMonth]);

  // Active Department Object
  const activeDept = useMemo(() => {
    if (isDirectDepartmentMode) {
      if (departmentId) {
        return hospital.departments?.find(d => d.id === departmentId) || managerDept;
      }
      return managerDept;
    }
    if (!activeDeptId) return null;
    return hospital.departments?.find(d => d.id === activeDeptId) || null;
  }, [hospital, activeDeptId, isDirectDepartmentMode, departmentId, managerDept]);

  // ==========================================
  // 2. DEPARTMENT LEVEL CALCULATIONS & STATS
  // ==========================================
  const departmentDetails = useMemo(() => {
    if (!activeDept) return null;

    interface SkillAgg {
      skillName: string;
      categoryName: string;
      categoryType: 'general' | 'communication' | 'specialized';
      totalPct: number;
      count: number;
      lowCount: number; // staff who scored < 70%
    }

    const skillMap: { [key: string]: SkillAgg } = {};

    // Staff Leaderboard
    const staffRankList = (activeDept.staff || []).map((staff) => {
      const allAssessments = staff.assessments || [];
      const yearFiltered = activeYear ? allAssessments.filter(a => a.year === activeYear) : allAssessments;
      const monthFiltered = selectedMonth !== 'all' 
        ? yearFiltered.filter(a => a.month === selectedMonth) 
        : yearFiltered;

      let totalPct = 0, itemCount = 0;
      let genPct = 0, genCount = 0;
      let specPct = 0, specCount = 0;
      let commPct = 0, commCount = 0;
      let weakSkillsCount = 0;

      let totalRawSum = 0, totalMaxSum = 0;
      let genRawSum = 0, genMaxSum = 0;
      let specRawSum = 0, specMaxSum = 0;
      let commRawSum = 0, commMaxSum = 0;

      const userWeakSkills: { name: string; category: string; scorePct: number }[] = [];

      monthFiltered.forEach((ass) => {
        const maxPossible = ass.maxScore && ass.maxScore > 0 ? ass.maxScore : 4;

        (ass.skillCategories || []).forEach((cat) => {
          const catType = classifyCategory(cat.name);

          (cat.items || []).forEach((item) => {
            if (!item || typeof item.score !== 'number' || !item.description) return;
            const pct = calculatePercentage(item.score, maxPossible);
            const desc = item.description.trim();

            totalPct += pct;
            itemCount += 1;
            totalRawSum += item.score;
            totalMaxSum += maxPossible;

            if (catType === 'general') {
              genPct += pct;
              genCount += 1;
              genRawSum += item.score;
              genMaxSum += maxPossible;
            }
            else if (catType === 'communication') {
              commPct += pct;
              commCount += 1;
              commRawSum += item.score;
              commMaxSum += maxPossible;
            }
            else {
              specPct += pct;
              specCount += 1;
              specRawSum += item.score;
              specMaxSum += maxPossible;
            }

            if (pct < 70) {
              weakSkillsCount += 1;
              userWeakSkills.push({ name: desc, category: cat.name, scorePct: Math.round(pct) });
            }

            // Aggregate skill map for department analysis
            if (!skillMap[desc]) {
              skillMap[desc] = {
                skillName: desc,
                categoryName: cat.name || 'عمومی',
                categoryType: catType,
                totalPct: 0,
                count: 0,
                lowCount: 0
              };
            }
            skillMap[desc].totalPct += pct;
            skillMap[desc].count += 1;
            if (pct < 70) skillMap[desc].lowCount += 1;
          });
        });
      });

      const numAssessments = monthFiltered.length || 1;
      const staffAvg = itemCount > 0 ? Math.round(totalPct / itemCount) : 0;
      const staffGenAvg = genCount > 0 ? Math.round(genPct / genCount) : 0;
      const staffSpecAvg = specCount > 0 ? Math.round(specPct / specCount) : 0;
      const staffCommAvg = commCount > 0 ? Math.round(commPct / commCount) : 0;

      // Staff score sums (normalized per assessment if multiple months evaluated)
      const staffGenScore = monthFiltered.length > 0 ? +(genRawSum / numAssessments).toFixed(1) : 0;
      const staffGenMax = monthFiltered.length > 0 ? +(genMaxSum / numAssessments).toFixed(1) : 0;
      const staffSpecScore = monthFiltered.length > 0 ? +(specRawSum / numAssessments).toFixed(1) : 0;
      const staffSpecMax = monthFiltered.length > 0 ? +(specMaxSum / numAssessments).toFixed(1) : 0;
      const staffCommScore = monthFiltered.length > 0 ? +(commRawSum / numAssessments).toFixed(1) : 0;
      const staffCommMax = monthFiltered.length > 0 ? +(commMaxSum / numAssessments).toFixed(1) : 0;
      const staffTotalScore = monthFiltered.length > 0 ? +(totalRawSum / numAssessments).toFixed(1) : 0;
      const staffTotalMax = monthFiltered.length > 0 ? +(totalMaxSum / numAssessments).toFixed(1) : 0;

      return {
        staff,
        overallAvg: staffAvg,
        genAvg: staffGenAvg,
        specAvg: staffSpecAvg,
        commAvg: staffCommAvg,
        staffGenScore,
        staffGenMax,
        staffSpecScore,
        staffSpecMax,
        staffCommScore,
        staffCommMax,
        staffTotalScore,
        staffTotalMax,
        weakSkillsCount,
        userWeakSkills,
        evaluatedInPeriod: monthFiltered.length > 0
      };
    });

    // Sort leaderboard from Best to Weakest
    const sortedLeaderboard = [...staffRankList].sort((a, b) => b.overallAvg - a.overallAvg);

    // Skills requiring training in this department
    const skillsNeedingTraining = Object.values(skillMap)
      .map(item => {
        const avg = item.count > 0 ? Math.round(item.totalPct / item.count) : 0;
        const recAction = generateClinicalRecommendation(item.skillName, item.categoryName, avg, item.lowCount);
        return {
          ...item,
          averageScore: avg,
          recAction
        };
      })
      .filter(s => s.averageScore < 70 || s.lowCount > 0)
      .sort((a, b) => a.averageScore - b.averageScore);

    // Department wide points and averages across all evaluated staff in the department
    const evaluatedStaffList = staffRankList.filter(s => s.evaluatedInPeriod);
    const evalCount = evaluatedStaffList.length || 1;

    // Averages of sum of scores for all department staff
    const avgGenTotalScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffGenScore || 0), 0) / evalCount).toFixed(1) : 0;
    const avgGenMaxScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffGenMax || 0), 0) / evalCount).toFixed(1) : 0;
    const avgGenScoreOutOf4 = avgGenMaxScore > 0 ? +((avgGenTotalScore / avgGenMaxScore) * 4).toFixed(2) : 0;

    const avgSpecTotalScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffSpecScore || 0), 0) / evalCount).toFixed(1) : 0;
    const avgSpecMaxScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffSpecMax || 0), 0) / evalCount).toFixed(1) : 0;
    const avgSpecScoreOutOf4 = avgSpecMaxScore > 0 ? +((avgSpecTotalScore / avgSpecMaxScore) * 4).toFixed(2) : 0;

    const avgCommTotalScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffCommScore || 0), 0) / evalCount).toFixed(1) : 0;
    const avgCommMaxScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffCommMax || 0), 0) / evalCount).toFixed(1) : 0;
    const avgCommScoreOutOf4 = avgCommMaxScore > 0 ? +((avgCommTotalScore / avgCommMaxScore) * 4).toFixed(2) : 0;

    const avgOverallTotalScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffTotalScore || 0), 0) / evalCount).toFixed(1) : 0;
    const avgOverallMaxScore = evaluatedStaffList.length > 0 ? +(evaluatedStaffList.reduce((acc, s) => acc + (s.staffTotalMax || 0), 0) / evalCount).toFixed(1) : 0;
    const avgOverallScoreOutOf4 = avgOverallMaxScore > 0 ? +((avgOverallTotalScore / avgOverallMaxScore) * 4).toFixed(2) : 0;

    // Percentages
    const deptGenAvg = evaluatedStaffList.length > 0 ? Math.round(evaluatedStaffList.reduce((acc, s) => acc + s.genAvg, 0) / evalCount) : 0;
    const deptSpecAvg = evaluatedStaffList.length > 0 ? Math.round(evaluatedStaffList.reduce((acc, s) => acc + s.specAvg, 0) / evalCount) : 0;
    const deptCommAvg = evaluatedStaffList.length > 0 ? Math.round(evaluatedStaffList.reduce((acc, s) => acc + s.commAvg, 0) / evalCount) : 0;

    // Overall dept averages
    const totalDeptItems = Object.values(skillMap).reduce((acc, s) => acc + s.count, 0);
    const totalDeptScoreSum = Object.values(skillMap).reduce((acc, s) => acc + s.totalPct, 0);
    const deptOverallAvg = totalDeptItems > 0 ? Math.round(totalDeptScoreSum / totalDeptItems) : (evaluatedStaffList.length > 0 ? Math.round(evaluatedStaffList.reduce((acc, s) => acc + s.overallAvg, 0) / evalCount) : 0);

    // Unique skills counts per category
    const allDeptSkills = Object.values(skillMap);
    const genSkillsCount = allDeptSkills.filter(s => s.categoryType === 'general').length;
    const specSkillsCount = allDeptSkills.filter(s => s.categoryType === 'specialized').length;
    const commSkillsCount = allDeptSkills.filter(s => s.categoryType === 'communication').length;
    const totalSkillsCount = allDeptSkills.length;

    const genWeakSkillsCount = allDeptSkills.filter(s => s.categoryType === 'general' && (s.averageScore < 70 || s.lowCount > 0)).length;
    const specWeakSkillsCount = allDeptSkills.filter(s => s.categoryType === 'specialized' && (s.averageScore < 70 || s.lowCount > 0)).length;
    const commWeakSkillsCount = allDeptSkills.filter(s => s.categoryType === 'communication' && (s.averageScore < 70 || s.lowCount > 0)).length;
    const totalWeakSkillsCount = allDeptSkills.filter(s => s.averageScore < 70 || s.lowCount > 0).length;

    return {
      leaderboard: sortedLeaderboard,
      skillsNeedingTraining,
      deptOverallAvg,
      deptGenAvg,
      deptSpecAvg,
      deptCommAvg,
      avgGenTotalScore,
      avgGenMaxScore,
      avgGenScoreOutOf4,
      avgSpecTotalScore,
      avgSpecMaxScore,
      avgSpecScoreOutOf4,
      avgCommTotalScore,
      avgCommMaxScore,
      avgCommScoreOutOf4,
      avgOverallTotalScore,
      avgOverallMaxScore,
      avgOverallScoreOutOf4,
      evaluatedStaffCount: evaluatedStaffList.length,
      genSkillsCount,
      specSkillsCount,
      commSkillsCount,
      totalSkillsCount,
      genWeakSkillsCount,
      specWeakSkillsCount,
      commWeakSkillsCount,
      totalWeakSkillsCount,
    };
  }, [activeDept, activeYear, selectedMonth]);

  // Form submission handler for custom corrective action
  const handleSaveCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept) return;
    if (!newActionTitle.trim() || !newActionDesc.trim()) {
      alert("لطفا عنوان و شرح اقدام اصلاحی را وارد کنید.");
      return;
    }

    onAddCustomAction(activeDept.id, {
      departmentId: activeDept.id,
      title: newActionTitle.trim(),
      description: newActionDesc.trim(),
      responsiblePerson: newActionResponsible.trim() || activeDept.managerName,
      deadline: newActionDeadline || undefined,
      priority: newActionPriority,
      status: 'pending',
      month: newActionMonth || (selectedMonth !== 'all' ? selectedMonth : PERSIAN_MONTHS[0]),
    });

    setNewActionTitle('');
    setNewActionDesc('');
    setNewActionResponsible('');
    setNewActionDeadline('');
    setNewActionPriority('high');
    setIsAddActionModalOpen(false);
  };

  // Open & trigger real AI Hospital Analysis
  const handleOpenAiHospitalModal = async () => {
    setIsAiHospitalModalOpen(true);
    setIsAiHospitalLoading(true);
    try {
      const res = await analyzeSkillsWithAI({
        contextType: 'hospital',
        hospitalName: hospital.name,
        evaluatedStaffCount: hospitalData.totalEvaluatedStaff,
        overallAvg: hospitalData.overallHospitalAvg,
        genAvg: hospitalData.overallGenAvg,
        specAvg: hospitalData.overallSpecAvg,
        commAvg: hospitalData.overallCommAvg,
      });
      setAiHospitalText(res);
    } catch (err) {
      console.error(err);
      setAiHospitalText("خطا در برقراری ارتباط با مدل هوش مصنوعی Gemini.");
    } finally {
      setIsAiHospitalLoading(false);
    }
  };

  // Open & trigger real AI Department Analysis
  const handleOpenAiDeptModal = async () => {
    if (!activeDept || !departmentDetails) return;
    setIsAiDeptModalOpen(true);
    setIsAiDeptLoading(true);
    try {
      const res = await analyzeSkillsWithAI({
        contextType: 'department',
        departmentName: activeDept.name,
        evaluatedStaffCount: activeDept.staffCount,
        overallAvg: departmentDetails.deptOverallAvg,
        genAvg: Math.round(departmentDetails.leaderboard.reduce((a, b) => a + b.genAvg, 0) / (departmentDetails.leaderboard.length || 1)),
        specAvg: Math.round(departmentDetails.leaderboard.reduce((a, b) => a + b.specAvg, 0) / (departmentDetails.leaderboard.length || 1)),
        commAvg: Math.round(departmentDetails.leaderboard.reduce((a, b) => a + b.commAvg, 0) / (departmentDetails.leaderboard.length || 1)),
        skillsNeedingTraining: departmentDetails.skillsNeedingTraining.map(s => ({
          skillName: s.skillName,
          categoryName: s.categoryName,
          averageScore: s.averageScore,
          lowCount: s.lowCount,
        })),
      });
      setAiDeptText(res);
    } catch (err) {
      console.error(err);
      setAiDeptText("خطا در برقراری ارتباط با مدل هوش مصنوعی Gemini.");
    } finally {
      setIsAiDeptLoading(false);
    }
  };

  // Submit custom question for Hospital AI
  const handleAskHospitalCustomQuestion = async () => {
    if (!hospitalUserQuery.trim()) return;
    setIsHospitalCustomLoading(true);
    try {
      const res = await askCustomQuestionWithAI({
        contextName: hospital.name,
        evaluatedStaffCount: hospitalData.totalEvaluatedStaff,
        overallAvg: hospitalData.overallHospitalAvg,
        genAvg: hospitalData.overallGenAvg,
        specAvg: hospitalData.overallSpecAvg,
        commAvg: hospitalData.overallCommAvg,
        userQuery: hospitalUserQuery,
      });
      setHospitalCustomAnswer(res);
    } catch (err) {
      console.error(err);
      setHospitalCustomAnswer("خطا در دریافت پاسخ از هوش مصنوعی.");
    } finally {
      setIsHospitalCustomLoading(false);
    }
  };

  // Submit custom question for Department AI
  const handleAskDeptCustomQuestion = async () => {
    if (!activeDept || !departmentDetails || !deptUserQuery.trim()) return;
    setIsDeptCustomLoading(true);
    try {
      const res = await askCustomQuestionWithAI({
        contextName: activeDept.name,
        evaluatedStaffCount: activeDept.staffCount,
        overallAvg: departmentDetails.deptOverallAvg,
        genAvg: Math.round(departmentDetails.leaderboard.reduce((a, b) => a + b.genAvg, 0) / (departmentDetails.leaderboard.length || 1)),
        specAvg: Math.round(departmentDetails.leaderboard.reduce((a, b) => a + b.specAvg, 0) / (departmentDetails.leaderboard.length || 1)),
        commAvg: Math.round(departmentDetails.leaderboard.reduce((a, b) => a + b.commAvg, 0) / (departmentDetails.leaderboard.length || 1)),
        userQuery: deptUserQuery,
        skillsData: departmentDetails.skillsNeedingTraining,
      });
      setDeptCustomAnswer(res);
    } catch (err) {
      console.error(err);
      setDeptCustomAnswer("خطا در دریافت پاسخ از هوش مصنوعی.");
    } finally {
      setIsDeptCustomLoading(false);
    }
  };

  // Generate and download Word Document (.doc)
  const handleExportAiReportToWord = (
    title: string,
    analysisText: string | null,
    userQuery?: string,
    customAnswer?: string | null,
    filename: string = 'گزارش_هوش_مصنوعی'
  ) => {
    const sections: { heading: string; content: string }[] = [];

    if (analysisText) {
      sections.push({
        heading: '۱. گزارش و تحلیل کلی هوش مصنوعی',
        content: analysisText,
      });
    }

    if (userQuery && userQuery.trim()) {
      sections.push({
        heading: '۲. پرسش اختصاصی کاربر و تحلیل مرتبط',
        content: `سوال / درخواست کاربر:\n"${userQuery.trim()}"\n\nپاسخ هوش مصنوعی بر اساس نمرات مهارتی:\n${customAnswer || 'در انتظار پاسخ...'}`
      });
    }

    if (sections.length === 0) {
      alert('گزارشی جهت دانلود فایل ورد آماده نیست.');
      return;
    }

    const contentHtml = sections
      .map(
        (s) => `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #0f766e; font-size: 16pt; border-right: 4px solid #0f766e; padding-right: 10px; margin-bottom: 12px; font-family: 'Tahoma', sans-serif;">${s.heading}</h2>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 12pt; line-height: 1.8; font-family: 'Tahoma', sans-serif;">${s.content.replace(/\n/g, '<br/>')}</div>
      </div>
    `
      )
      .join('');

    const fullDocument = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Tahoma', 'Arial', sans-serif; direction: rtl; text-align: right; line-height: 1.8; color: #1e293b; padding: 20px; }
          h1 { font-size: 20pt; color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 20px; text-align: right; }
        </style>
      </head>
      <body dir="rtl">
        <h1>${title}</h1>
        <p style="color: #64748b; font-size: 10pt;">تاریخ تولید گزارش: ${new Date().toLocaleDateString('fa-IR')} | سامانه مدیریت عملکرد و ارزیابی بالینی</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
        ${contentHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', fullDocument], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Auto-add recommendation as corrective action with AI enhancement
  const handleAutoAddRecommendation = async (sk: { skillName: string; averageScore: number; recAction: string; categoryName: string; lowCount: number }) => {
    if (!activeDept) return;
    setAddingAiSkillName(sk.skillName);
    const currentM = selectedMonth !== 'all' ? selectedMonth : PERSIAN_MONTHS[0];

    try {
      const aiSuggestion = await suggestCorrectiveActionWithAI({
        departmentName: activeDept.name,
        skillName: sk.skillName,
        categoryName: sk.categoryName,
        averageScore: sk.averageScore,
        lowCount: sk.lowCount,
      });

      onAddCustomAction(activeDept.id, {
        departmentId: activeDept.id,
        title: aiSuggestion.title || `بازآموزی مهارتی: ${sk.skillName}`,
        description: aiSuggestion.description || `اقدام اصلاحی پیشنهادی: ${sk.recAction} (میانگین نمره: ${sk.averageScore}٪)`,
        responsiblePerson: activeDept.managerName,
        deadline: `پایان ماه ${currentM}`,
        priority: aiSuggestion.priority || (sk.averageScore < 50 ? 'high' : 'medium'),
        status: 'pending',
        month: currentM,
      });
      alert(`اقدام اصلاحی هوشمند برای "${sk.skillName}" با موفقیت ثبت گردید.`);
    } catch (err) {
      console.error(err);
      onAddCustomAction(activeDept.id, {
        departmentId: activeDept.id,
        title: `بازآموزی مهارتی: ${sk.skillName}`,
        description: `اقدام اصلاحی بالینی پیشنهادی: ${sk.recAction} (میانگین نمره مهارتی: ${sk.averageScore}٪)`,
        responsiblePerson: activeDept.managerName,
        deadline: `پایان ماه ${currentM}`,
        priority: sk.averageScore < 50 ? 'high' : 'medium',
        status: 'pending',
        month: currentM,
      });
      alert(`اقدام اصلاحی مربوط به "${sk.skillName}" ثبت گردید.`);
    } finally {
      setAddingAiSkillName(null);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (activeDept && departmentDetails) {
      // Sheet 1: Department Summary Table (جدول شاخص‌ها و میانگین امتیازات کل پرسنل بخش)
      const deptSummaryData = [
        {
          "حیطه مهارتی": "مهارت‌های عمومی",
          "میانگین مجموع امتیاز کل پرسنل": `${departmentDetails.avgGenTotalScore} از ${departmentDetails.avgGenMaxScore}`,
          "میانگین نمره سنجه‌ها (از ۴)": departmentDetails.avgGenScoreOutOf4,
          "میانگین درصد تحقق (%)": `${departmentDetails.deptGenAvg}%`,
          "تعداد سنجه‌ها": departmentDetails.genSkillsCount,
          "سنجه‌های دارای ضعف (<۷۰٪)": departmentDetails.genWeakSkillsCount,
          "وضعیت استاندارد": getScoreBadge(departmentDetails.deptGenAvg).text,
        },
        {
          "حیطه مهارتی": "مهارت‌های تخصصی",
          "میانگین مجموع امتیاز کل پرسنل": `${departmentDetails.avgSpecTotalScore} از ${departmentDetails.avgSpecMaxScore}`,
          "میانگین نمره سنجه‌ها (از ۴)": departmentDetails.avgSpecScoreOutOf4,
          "میانگین درصد تحقق (%)": `${departmentDetails.deptSpecAvg}%`,
          "تعداد سنجه‌ها": departmentDetails.specSkillsCount,
          "سنجه‌های دارای ضعف (<۷۰٪)": departmentDetails.specWeakSkillsCount,
          "وضعیت استاندارد": getScoreBadge(departmentDetails.deptSpecAvg).text,
        },
        {
          "حیطه مهارتی": "مهارت‌های ارتباطی",
          "میانگین مجموع امتیاز کل پرسنل": `${departmentDetails.avgCommTotalScore} از ${departmentDetails.avgCommMaxScore}`,
          "میانگین نمره سنجه‌ها (از ۴)": departmentDetails.avgCommScoreOutOf4,
          "میانگین درصد تحقق (%)": `${departmentDetails.deptCommAvg}%`,
          "تعداد سنجه‌ها": departmentDetails.commSkillsCount,
          "سنجه‌های دارای ضعف (<۷۰٪)": departmentDetails.commWeakSkillsCount,
          "وضعیت استاندارد": getScoreBadge(departmentDetails.deptCommAvg).text,
        },
        {
          "حیطه مهارتی": "میانگین و مجموع کل مهارت‌های بخش",
          "میانگین مجموع امتیاز کل پرسنل": `${departmentDetails.avgOverallTotalScore} از ${departmentDetails.avgOverallMaxScore}`,
          "میانگین نمره سنجه‌ها (از ۴)": departmentDetails.avgOverallScoreOutOf4,
          "میانگین درصد تحقق (%)": `${departmentDetails.deptOverallAvg}%`,
          "تعداد سنجه‌ها": departmentDetails.totalSkillsCount,
          "سنجه‌های دارای ضعف (<۷۰٪)": departmentDetails.totalWeakSkillsCount,
          "وضعیت استاندارد": getScoreBadge(departmentDetails.deptOverallAvg).text,
        },
      ];

      // Sheet 2: Staff Detailed Scores
      const data = departmentDetails.leaderboard.map((item, index) => ({
        "رتبه": index + 1,
        "نام و نام خانوادگی": item.staff.name,
        "سمت": item.staff.title,
        "نمره کل (%)": item.overallAvg,
        "مجموع امتیاز کل": `${item.staffTotalScore} از ${item.staffTotalMax}`,
        "مهارت‌های عمومی (%)": item.genAvg,
        "مجموع امتیاز عمومی": `${item.staffGenScore} از ${item.staffGenMax}`,
        "مهارت‌های تخصصی (%)": item.specAvg,
        "مجموع امتیاز تخصصی": `${item.staffSpecScore} از ${item.staffSpecMax}`,
        "ارتباط و حقوق بیمار (%)": item.commAvg,
        "مجموع امتیاز ارتباطی": `${item.staffCommScore} از ${item.staffCommMax}`,
        "تعداد نقاط ضعف": item.weakSkillsCount,
      }));

      const wb = XLSX.utils.book_new();
      const wsDept = XLSX.utils.json_to_sheet(deptSummaryData);
      XLSX.utils.book_append_sheet(wb, wsDept, "شاخص‌های مهارتی بخش");
      const wsStaff = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, wsStaff, "کارنامه پرسنل");
      XLSX.writeFile(wb, `Corrective_Actions_${activeDept.name}_${selectedMonth}.xlsx`);
    } else {
      const data = hospitalData.deptSummaries.map((d, index) => ({
        "ردیف": index + 1,
        "نام بخش": d.dept.name,
        "مسئول بخش": d.dept.managerName,
        "پرسنل ارزیابی شده": d.evaluatedStaffCount,
        "میانگین مجموع مهارت عمومی": d.avgGenTotalScore,
        "سقف قابل کسب مهارت عمومی (سنجه‌ها)": d.avgGenMaxScore,
        "درصد مهارت عمومی (%)": d.genAvg,
        "میانگین مجموع مهارت تخصصی": d.avgSpecTotalScore,
        "سقف قابل کسب مهارت تخصصی (سنجه‌ها)": d.avgSpecMaxScore,
        "درصد مهارت تخصصی (%)": d.specAvg,
        "میانگین مجموع مهارت‌های ارتباطی": d.avgCommTotalScore,
        "سقف قابل کسب مهارت‌های ارتباطی (سنجه‌ها)": d.avgCommMaxScore,
        "درصد مهارت‌های ارتباطی (%)": d.commAvg,
        "میانگین مجموع کل امتیازات": d.avgOverallTotalScore,
        "سقف قابل کسب کل بخش (سنجه‌ها)": d.avgOverallMaxScore,
        "درصد کل مهارتی (%)": d.overallAvg,
        "وضعیت": getScoreBadge(d.overallAvg).text,
        "اقدامات اصلاحی در حال انجام": d.pendingActionsCount
      }));

      const statsData = [
        {
          "حیطه مهارتی": "مهارت‌های عمومی",
          "میانگین مجموع امتیازات تمام بخش‌ها": hospitalData.meanOfGenDeptAverages,
          "میانه کل حداکثر امتیازات بخش‌ها (سقف سنجه‌ها)": hospitalData.medianGenMax,
          "توضیح شاخص میانه": "میانه از سقف امتیاز قابل کسب سنجه‌های بخش‌ها استخراج شده است (نه نمره پرسنل)",
          "سقف‌های قابل کسب بخش‌ها (صعودی)": [...hospitalData.genMaxList].sort((a,b)=>a-b).join('، '),
          "مد (نما) حداکثر امتیازات": "-",
          "میانگین درصد تحقق کل بیمارستان (%)": hospitalData.overallGenAvg,
          "فرمول محاسباتی": `مجموع میانگین‌های بخش‌ها (${hospitalData.sumGenAverages}) ÷ ${hospitalData.numDepts} بخش`
        },
        {
          "حیطه مهارتی": "مهارت‌های تخصصی",
          "میانگین مجموع امتیازات تمام بخش‌ها": hospitalData.meanOfSpecDeptAverages,
          "میانه کل حداکثر امتیازات بخش‌ها (سقف سنجه‌ها)": hospitalData.medianSpecMax,
          "توضیح شاخص میانه": "میانه از سقف امتیاز قابل کسب سنجه‌های بخش‌ها استخراج شده است (نه نمره پرسنل)",
          "سقف‌های قابل کسب بخش‌ها (صعودی)": [...hospitalData.specMaxList].sort((a,b)=>a-b).join('، '),
          "مد (نما) حداکثر امتیازات": "-",
          "میانگین درصد تحقق کل بیمارستان (%)": hospitalData.overallSpecAvg,
          "فرمول محاسباتی": `مجموع میانگین‌های بخش‌ها (${hospitalData.sumSpecAverages}) ÷ ${hospitalData.numDepts} بخش`
        },
        {
          "حیطه مهارتی": "مهارت‌های ارتباطی و حقوق بیمار",
          "میانگین مجموع امتیازات تمام بخش‌ها": hospitalData.meanOfCommDeptAverages,
          "میانه کل حداکثر امتیازات بخش‌ها (سقف سنجه‌ها)": hospitalData.medianCommMax,
          "مد (نما) حداکثر امتیازات": hospitalData.modeCommMax !== null ? hospitalData.modeCommMax : "فاقد تکرار یکتا",
          "توضیح شاخص میانه": "میانه از سقف امتیاز قابل کسب سنجه‌های بخش‌ها استخراج شده است (نه نمره پرسنل)",
          "سقف‌های قابل کسب بخش‌ها (صعودی)": [...hospitalData.commMaxList].sort((a,b)=>a-b).join('، '),
          "میانگین درصد تحقق کل بیمارستان (%)": hospitalData.overallCommAvg,
          "فرمول محاسباتی": `مجموع میانگین‌های بخش‌ها (${hospitalData.sumCommAverages}) ÷ ${hospitalData.numDepts} بخش`
        },
        {
          "حیطه مهارتی": "مجموع و میانگین کل بیمارستان",
          "میانگین مجموع امتیازات تمام بخش‌ها": hospitalData.meanOfOverallDeptAverages,
          "میانه کل حداکثر امتیازات بخش‌ها (سقف سنجه‌ها)": hospitalData.medianOverallMax,
          "توضیح شاخص میانه": "میانه از سقف امتیاز کل قابل کسب سنجه‌های بخش‌ها استخراج شده است (نه نمره پرسنل)",
          "سقف‌های قابل کسب بخش‌ها (صعودی)": [...hospitalData.overallMaxList].sort((a,b)=>a-b).join('، '),
          "مد (نما) حداکثر امتیازات": "-",
          "میانگین درصد تحقق کل بیمارستان (%)": hospitalData.overallHospitalAvg,
          "فرمول محاسباتی": `مجموع میانگین‌های بخش‌ها (${hospitalData.sumOverallAverages}) ÷ ${hospitalData.numDepts} بخش`
        }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "شاخص‌های مهارتی بخش‌ها");
      const wsStats = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, "میانه و میانگین کل");
      XLSX.writeFile(wb, `Hospital_Corrective_Actions_${hospital.name}_${selectedMonth}.xlsx`);
    }
  };

  // Badge Style Helper
  const getScoreBadge = (score: number) => {
    if (score >= 85) return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300', text: 'عالی' };
    if (score >= 70) return { bg: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300', text: 'خوب' };
    return { bg: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300', text: 'نیازمند بهبود' };
  };

  // Helper for adding clinical action directly to department corrective actions
  const handleAddAiSkillToAction = (skill: { skillName: string; categoryName: string; averageScore: number; lowCount: number; recAction: string }) => {
    if (!activeDept) return;
    setAddingAiSkillName(skill.skillName);
    const finalDescription = customSkillSolutions[skill.skillName]?.trim() || skill.recAction || `برگزاری کارگاه بازآموزی و پایش بالینی بر اساس استانداردهای برونر-سودارث و پاتر-پری. میانگین نمره: ${skill.averageScore}%`;
    onAddCustomAction(activeDept.id, {
      departmentId: activeDept.id,
      title: `اقدام اصلاحی: ${skill.skillName}`,
      description: finalDescription,
      responsiblePerson: activeDept.managerName,
      deadline: "پایان ماه جاری",
      priority: skill.averageScore < 60 ? "high" : "medium",
      status: "pending",
      month: selectedMonth !== "all" ? selectedMonth : PERSIAN_MONTHS[0],
    });
    setTimeout(() => {
      setAddingAiSkillName(null);
    }, 1200);
  };

  // =========================================================
  // MAIN VIEW RENDER (ADAPTIVE: DEPARTMENT MANAGER VS HOSPITAL ADMIN)
  // =========================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 dir-rtl" dir="rtl">
      {/* Top Header Navigation */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={handleViewBack}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200 font-bold text-xs"
            title={isDirectDepartmentMode ? "بازگشت به صفحه مسئول بخش" : (activeDeptId ? "بازگشت به نمای کل بیمارستان" : "بازگشت به لیست بخش‌ها")}
          >
            <BackIcon className="w-4 h-4" />
            <span>
              {isDirectDepartmentMode 
                ? "بازگشت به صفحه مسئول بخش" 
                : (activeDeptId ? "بازگشت به نمای کل بیمارستان" : "بازگشت به لیست بخش‌ها")}
            </span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-xl md:text-2xl font-bold">
                {isDirectDepartmentMode && activeDept
                  ? `اقدامات اصلاحی و تحلیل مهارتی بخش ${activeDept.name}`
                  : (activeDept 
                    ? `تحلیل مهارتی و اقدامات اصلاحی بخش ${activeDept.name}`
                    : `شاخص‌های عملکرد مهارتی و اقدامات اصلاحی بیمارستان ${hospital.name}`)}
              </h1>
              {isDirectDepartmentMode && activeDept && (
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg">
                  پنل اختصاصی بخش
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeDept 
                ? `مسئول بخش: ${activeDept.managerName} | تعداد پرسنل: ${activeDept.staffCount} نفر | سال تحلیلی: ${activeYear}`
                : `مدیریت هوشمند اعتباربخشی، پایش شاخص‌های بالینی و برنامه بازآموزی پرسنل`}
            </p>
          </div>
        </div>

        {/* Global Controls: Month & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">انتخاب ماه:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-sm text-emerald-700 dark:text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="all">کل سال ({activeYear})</option>
              {PERSIAN_MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all"
          >
            <ExcelIcon className="w-4 h-4" />
            خروجی اکسل
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* ========================================================= */}
        {/* LEVEL 1: HOSPITAL OVERVIEW (WHEN NO DEPT SELECTED)        */}
        {/* ========================================================= */}
        {!isDirectDepartmentMode && !activeDeptId && (
          <>
            {/* Top Key Performance Indicators (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Overall Hospital Score */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">میانگین کل بیمارستان</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {hospitalData.overallHospitalAvg}%
                  </span>
                  <span className="text-xs text-slate-400">کل ارزیابی‌ها</span>
                </div>
              </div>

              {/* General Skills Index */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-blue-500" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">مهارت‌های عمومی</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                    {hospitalData.overallGenAvg}%
                  </span>
                  <span className="text-xs text-slate-400">پایه</span>
                </div>
              </div>

              {/* Specialized Skills Index */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">مهارت‌های تخصصی</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                    {hospitalData.overallSpecAvg}%
                  </span>
                  <span className="text-xs text-slate-400">بالینی</span>
                </div>
              </div>

              {/* Communication & Patient Rights */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-purple-500" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">حقوق بیمار و ارتباط</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                    {hospitalData.overallCommAvg}%
                  </span>
                  <span className="text-xs text-slate-400">رفتاری</span>
                </div>
              </div>

              {/* Pending Corrective Actions */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">اقدامات در حال انجام</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                    {hospitalData.totalPendingHospitalActions}
                  </span>
                  <span className="text-xs text-slate-400">برنامه بهبود</span>
                </div>
              </div>
            </div>

            {/* AI Hospital Analysis Callout */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AiIcon className="w-6 h-6 text-amber-300" />
                  <h2 className="text-lg font-bold">تحلیل هوشمند بالینی و بازآموزی کل بیمارستان</h2>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
                  تولید برنامه‌های جامع اصلاحی بر اساس تجمیع داده‌های ارزیابی عملکرد کلیه پرسنل، اولویت‌بندی نقاط ضعف و ارائه راهکارهای بالینی.
                </p>
              </div>
              <button
                onClick={handleOpenAiHospitalModal}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-2"
              >
                <LightbulbIcon className="w-4 h-4 text-slate-900" />
                مشاهده گزارش هوشمند کل بیمارستان
              </button>
            </div>

            {/* ================================================================= */}
            {/* HOSPITAL PERFORMANCE TABLE & STATISTICAL ANALYSIS SECTION         */}
            {/* ================================================================= */}
            <div className="space-y-6">
              {/* Section Header & View Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    جدول جامع شاخص‌های عملکرد مهارتی و اقدامات اصلاحی بخش‌ها
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تحلیل مقایسه‌ای میانگین مجموع امتیازات، درصدهای تحقق مهارتی و ارزیابی آماری بیمارستان
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative w-48 sm:w-60">
                    <input
                      type="text"
                      placeholder="جستجوی نام بخش..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                    <button
                      onClick={() => setHospitalViewMode('table')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        hospitalViewMode === 'table'
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      نمای جدول شاخص‌ها
                    </button>
                    <button
                      onClick={() => setHospitalViewMode('cards')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        hospitalViewMode === 'cards'
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <ChartBarIcon className="w-4 h-4" />
                      نمای کارت‌های بخش‌ها
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW 1: COMPREHENSIVE TABLE WITH FOOTER */}
              {hospitalViewMode === 'table' && (
                <div className="space-y-6">
                  {/* Main Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <table className="w-full text-right border-collapse min-w-[950px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          <th className="py-3 px-3">نام بخش و مسئول</th>
                          <th className="py-3 px-3 text-center">پرسنل ارزیابی</th>
                          <th className="py-3 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                            مهارت‌های عمومی
                            <span className="block text-[9px] font-normal text-blue-700/80 dark:text-blue-400">میانگین مجموع نمرات و سقف سنجه‌ها</span>
                          </th>
                          <th className="py-3 px-3 text-center bg-teal-50/50 dark:bg-teal-950/20 text-teal-900 dark:text-teal-300">
                            مهارت‌های تخصصی
                            <span className="block text-[9px] font-normal text-teal-700/80 dark:text-teal-400">میانگین مجموع نمرات و سقف سنجه‌ها</span>
                          </th>
                          <th className="py-3 px-3 text-center bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300">
                            مهارت‌های ارتباطی و حقوق بیمار
                            <span className="block text-[9px] font-normal text-purple-700/80 dark:text-purple-400">میانگین مجموع نمرات و سقف سنجه‌ها</span>
                          </th>
                          <th className="py-3 px-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                            میانگین و درصد کل بخش
                            <span className="block text-[9px] font-normal text-emerald-700/80 dark:text-emerald-400">میانگین مجموع / سقف کل سنجه‌ها</span>
                          </th>
                          <th className="py-3 px-3 text-center">اقدامات معوق</th>
                          <th className="py-3 px-3 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                        {hospitalData.deptSummaries
                          .filter(d => d.dept.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((d, idx) => {
                            const badge = getScoreBadge(d.overallAvg);
                            return (
                              <tr
                                key={d.dept.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
                              >
                                <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <span>{d.dept.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}>
                                      {badge.text}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    مسئول: {d.dept.managerName}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {d.evaluatedStaffCount}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">نفر</span>
                                </td>
                                
                                {/* General Skills */}
                                <td className="py-3 px-3 text-center bg-blue-50/30 dark:bg-blue-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-black text-sm text-blue-700 dark:text-blue-300">
                                      {d.avgGenTotalScore}
                                    </span>
                                    <span className="text-[10px] text-slate-400" title="سقف قابل کسب در سنجه‌های چک‌لیست">
                                      از {d.avgGenMaxScore}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                                      {d.genAvg}%
                                    </span>
                                  </div>
                                </td>

                                {/* Specialized Skills */}
                                <td className="py-3 px-3 text-center bg-teal-50/30 dark:bg-teal-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-black text-sm text-teal-700 dark:text-teal-300">
                                      {d.avgSpecTotalScore}
                                    </span>
                                    <span className="text-[10px] text-slate-400" title="سقف قابل کسب در سنجه‌های چک‌لیست">
                                      از {d.avgSpecMaxScore}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                                      {d.specAvg}%
                                    </span>
                                  </div>
                                </td>

                                {/* Communication Skills */}
                                <td className="py-3 px-3 text-center bg-purple-50/30 dark:bg-purple-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-black text-sm text-purple-700 dark:text-purple-300">
                                      {d.avgCommTotalScore}
                                    </span>
                                    <span className="text-[10px] text-slate-400" title="سقف قابل کسب در سنجه‌های چک‌لیست">
                                      از {d.avgCommMaxScore}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                                      {d.commAvg}%
                                    </span>
                                  </div>
                                </td>

                                {/* Overall Department Score */}
                                <td className="py-3 px-3 text-center bg-emerald-50/30 dark:bg-emerald-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                                      {d.avgOverallTotalScore}
                                    </span>
                                    <span className="text-[10px] text-slate-400" title="سقف کل قابل کسب در سنجه‌های چک‌لیست">
                                      از {d.avgOverallMaxScore}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                                      {d.overallAvg}%
                                    </span>
                                  </div>
                                </td>

                                {/* Pending Actions */}
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    d.pendingActionsCount > 0 
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}>
                                    {d.pendingActionsCount} برنامه
                                  </span>
                                </td>

                                {/* Action Button */}
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => handleSelectDepartmentDrillDown(d.dept.id)}
                                    className="px-3 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all inline-flex items-center gap-1"
                                  >
                                    ورود به بخش
                                    <span className="text-xs font-mono">←</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>

                      {/* TABLE FOOTER: HOSPITAL TOTALS, MEANS AND MEDIANS */}
                      <tfoot className="border-t-2 border-slate-300 dark:border-slate-600 text-xs">
                        {/* ROW 1: Mean of Department Averages */}
                        <tr className="bg-slate-100/90 dark:bg-slate-900 font-bold border-b border-slate-200 dark:border-slate-700">
                          <td colSpan={3} className="py-3.5 px-4 text-right">
                            <div className="text-slate-900 dark:text-slate-100 font-black text-sm flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                              میانگین مجموع امتیازهای تمام بخش‌ها
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                              فرمول: مجموع میانگین امتیاز بخش‌ها ÷ {hospitalData.numDepts} بخش ارزیابی‌شده
                            </div>
                          </td>

                          {/* Gen Mean */}
                          <td className="py-3 px-3 text-center bg-blue-100/60 dark:bg-blue-950/40">
                            <span className="text-sm font-black text-blue-900 dark:text-blue-200">
                              {hospitalData.meanOfGenDeptAverages}
                            </span>
                            <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                              میانگین کل: {hospitalData.overallGenAvg}%
                            </span>
                          </td>

                          {/* Spec Mean */}
                          <td className="py-3 px-3 text-center bg-teal-100/60 dark:bg-teal-950/40">
                            <span className="text-sm font-black text-teal-900 dark:text-teal-200">
                              {hospitalData.meanOfSpecDeptAverages}
                            </span>
                            <span className="block text-[10px] text-teal-700 dark:text-teal-300 font-bold">
                              میانگین کل: {hospitalData.overallSpecAvg}%
                            </span>
                          </td>

                          {/* Comm Mean */}
                          <td className="py-3 px-3 text-center bg-purple-100/60 dark:bg-purple-950/40">
                            <span className="text-sm font-black text-purple-900 dark:text-purple-200">
                              {hospitalData.meanOfCommDeptAverages}
                            </span>
                            <span className="block text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                              میانگین کل: {hospitalData.overallCommAvg}%
                            </span>
                          </td>

                          {/* Overall Mean */}
                          <td className="py-3 px-3 text-center bg-emerald-100/60 dark:bg-emerald-950/40">
                            <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                              {hospitalData.meanOfOverallDeptAverages}
                            </span>
                            <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                              میانگین کل: {hospitalData.overallHospitalAvg}%
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center text-slate-500 font-mono">
                            {hospitalData.totalPendingHospitalActions} کل
                          </td>
                          <td className="py-3 px-3 text-center text-slate-400">-</td>
                        </tr>

                        {/* ROW 2: Median of Maximum Department Scores */}
                        <tr className="bg-amber-50/90 dark:bg-amber-950/30 font-bold border-b border-amber-200 dark:border-amber-900/60">
                          <td colSpan={3} className="py-3.5 px-4 text-right">
                            <div className="text-amber-950 dark:text-amber-200 font-black text-sm flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                              میانه کل حداکثر مهارت‌های بخش‌ها
                            </div>
                            <div className="text-[10px] text-amber-800/80 dark:text-amber-300 font-normal mt-0.5">
                              میانه استخراج‌شده از سقف امتیازهای قابل کسب هر بخش در هر مهارت (سقف سنجه‌ها، نه نمره پرسنل)
                            </div>
                          </td>

                          {/* Gen Median */}
                          <td className="py-3 px-3 text-center bg-blue-100/80 dark:bg-blue-950/60 border-x border-amber-200/50 dark:border-amber-900/30">
                            <div className="text-[10px] text-blue-800 dark:text-blue-300 font-normal">میانه سقف:</div>
                            <span className="text-sm font-black text-blue-950 dark:text-blue-100">
                              {hospitalData.medianGenMax}
                            </span>
                          </td>

                          {/* Spec Median */}
                          <td className="py-3 px-3 text-center bg-teal-100/80 dark:bg-teal-950/60 border-x border-amber-200/50 dark:border-amber-900/30">
                            <div className="text-[10px] text-teal-800 dark:text-teal-300 font-normal">میانه سقف:</div>
                            <span className="text-sm font-black text-teal-950 dark:text-teal-100">
                              {hospitalData.medianSpecMax}
                            </span>
                          </td>

                          {/* Comm Median & Mode */}
                          <td className="py-3 px-3 text-center bg-purple-100/80 dark:bg-purple-950/60 border-x border-amber-200/50 dark:border-amber-900/30">
                            <div className="text-[10px] text-purple-800 dark:text-purple-300 font-normal">میانه سقف:</div>
                            <span className="text-sm font-black text-purple-950 dark:text-purple-100">
                              {hospitalData.medianCommMax}
                            </span>
                            {hospitalData.modeCommMax !== null && (
                              <span className="block text-[9px] text-purple-700 dark:text-purple-300 font-bold mt-0.5">
                                مد (نما): {hospitalData.modeCommMax}
                              </span>
                            )}
                          </td>

                          {/* Overall Median */}
                          <td className="py-3 px-3 text-center bg-emerald-100/80 dark:bg-emerald-950/60 border-x border-amber-200/50 dark:border-amber-900/30">
                            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-normal">میانه سقف کل:</div>
                            <span className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                              {hospitalData.medianOverallMax}
                            </span>
                          </td>

                          <td colSpan={2} className="py-3 px-3 text-center text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                            شاخص کل بیمارستان
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* STATISTICAL SUMMARY BREAKDOWN CARDS BELOW TABLE */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <ChartBarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          تحلیل آماری شاخص‌های بیمارستان (میانگین مجموع و میانه کل حداکثر مهارت‌ها)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          تفکیک محاسبات بر اساس فرمول‌های استاندارد، استخراج میانه از حداکثر امتیازات بخش‌ها و میانگین تجمیعی
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl">
                        <span>تعداد بخش‌های فعال در تحلیل:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{hospitalData.numDepts} بخش</span>
                      </div>
                    </div>

                    {/* Definition & Guide Banner */}
                    <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
                      <InfoIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-black text-sm text-amber-900 dark:text-amber-100">
                          راهنمای شاخص میانه و تفاوت آن با بالاترین نمره پرسنل:
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                          منظور از حداکثر امتیاز، <strong>سقف امتیازی است که در سنجه‌های چک‌لیست هر مهارت در بخش قابل کسب می‌باشد</strong> (نه بالاترین نمره ارزیابی پرسنل بخش).
                          برای مثال اگر سقف امتیاز یک مهارت در بخش‌های مختلف به ترتیب ۵۶، ۷۸، ۱۰۸، ۲۰۰ و... باشد، میانه از بین این سقف امتیازات محاسبه و استخراج می‌شود.
                        </p>
                      </div>
                    </div>

                    {/* 4 Skill Category Analytics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1: General Skills */}
                      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                            مهارت‌های عمومی
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            تحقق کل: {hospitalData.overallGenAvg}%
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-blue-200/60 dark:border-blue-900/40">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانگین مجموع امتیاز بخش‌ها:</span>
                            <span className="font-extrabold text-blue-900 dark:text-blue-100 text-sm">
                              {hospitalData.meanOfGenDeptAverages}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانه کل سقف مهارت‌ها:</span>
                            <span className="font-extrabold text-blue-900 dark:text-blue-100 text-sm">
                              {hospitalData.medianGenMax}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 space-y-1.5">
                          <div className="font-semibold text-blue-800 dark:text-blue-300">فرمول تجمیع میانگین:</div>
                          <div className="font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed break-words" dir="ltr">
                            ({hospitalData.genDeptList.map(d => `${d.avgScore}`).join(' + ')}) ÷ {hospitalData.numDepts} = {hospitalData.meanOfGenDeptAverages}
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 pt-0.5">
                            سقف‌ها (صعودی): [{[...hospitalData.genMaxList].sort((a,b)=>a-b).join('، ')}] ← میانه: {hospitalData.medianGenMax}
                          </div>
                          
                          <div className="text-[9px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            <span className="font-semibold text-blue-800 dark:text-blue-300">سقف بخش‌ها:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[...hospitalData.allDeptsGenCapacities]
                                .sort((a,b) => a.maxScore - b.maxScore)
                                .map((c, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 rounded text-[9px]">
                                    <span>{c.deptName}:</span>
                                    <strong className="font-mono">{c.maxScore}</strong>
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Specialized Skills */}
                      <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-teal-900 dark:text-teal-200">
                            مهارت‌های تخصصی
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                            تحقق کل: {hospitalData.overallSpecAvg}%
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-teal-200/60 dark:border-teal-900/40">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانگین مجموع امتیاز بخش‌ها:</span>
                            <span className="font-extrabold text-teal-900 dark:text-teal-100 text-sm">
                              {hospitalData.meanOfSpecDeptAverages}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانه کل سقف مهارت‌ها:</span>
                            <span className="font-extrabold text-teal-900 dark:text-teal-100 text-sm">
                              {hospitalData.medianSpecMax}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 space-y-1.5">
                          <div className="font-semibold text-teal-800 dark:text-teal-300">فرمول تجمیع میانگین:</div>
                          <div className="font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed break-words" dir="ltr">
                            ({hospitalData.specDeptList.map(d => `${d.avgScore}`).join(' + ')}) ÷ {hospitalData.numDepts} = {hospitalData.meanOfSpecDeptAverages}
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 pt-0.5">
                            سقف‌ها (صعودی): [{[...hospitalData.specMaxList].sort((a,b)=>a-b).join('، ')}] ← میانه: {hospitalData.medianSpecMax}
                          </div>

                          <div className="text-[9px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            <span className="font-semibold text-teal-800 dark:text-teal-300">سقف بخش‌ها:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[...hospitalData.allDeptsSpecCapacities]
                                .sort((a,b) => a.maxScore - b.maxScore)
                                .map((c, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-100/70 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200 rounded text-[9px]">
                                    <span>{c.deptName}:</span>
                                    <strong className="font-mono">{c.maxScore}</strong>
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Communication & Patient Rights */}
                      <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                            مهارت‌های ارتباطی و حقوق بیمار
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            تحقق کل: {hospitalData.overallCommAvg}%
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانگین مجموع امتیاز بخش‌ها:</span>
                            <span className="font-extrabold text-purple-900 dark:text-purple-100 text-sm">
                              {hospitalData.meanOfCommDeptAverages}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانه سقف (مد/نما):</span>
                            <div className="text-left font-extrabold text-purple-900 dark:text-purple-100 text-sm">
                              <span>{hospitalData.medianCommMax}</span>
                              {hospitalData.modeCommMax !== null && (
                                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-normal mr-1">
                                  (مد: {hospitalData.modeCommMax})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 space-y-1.5">
                          <div className="font-semibold text-purple-800 dark:text-purple-300">فرمول تجمیع میانگین:</div>
                          <div className="font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed break-words" dir="ltr">
                            ({hospitalData.commDeptList.map(d => `${d.avgScore}`).join(' + ')}) ÷ {hospitalData.numDepts} = {hospitalData.meanOfCommDeptAverages}
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 pt-0.5">
                            سقف‌ها (صعودی): [{[...hospitalData.commMaxList].sort((a,b)=>a-b).join('، ')}] ← میانه: {hospitalData.medianCommMax}
                          </div>

                          <div className="text-[9px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            <span className="font-semibold text-purple-800 dark:text-purple-300">سقف بخش‌ها:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[...hospitalData.allDeptsCommCapacities]
                                .sort((a,b) => a.maxScore - b.maxScore)
                                .map((c, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100/70 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 rounded text-[9px]">
                                    <span>{c.deptName}:</span>
                                    <strong className="font-mono">{c.maxScore}</strong>
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Overall Hospital Summary */}
                      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                            تجمیع کل مهارت‌های بیمارستان
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            تحقق کل: {hospitalData.overallHospitalAvg}%
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانگین مجموع کل بخش‌ها:</span>
                            <span className="font-extrabold text-emerald-900 dark:text-emerald-100 text-sm">
                              {hospitalData.meanOfOverallDeptAverages}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">میانه کل سقف مهارت‌ها:</span>
                            <span className="font-extrabold text-emerald-900 dark:text-emerald-100 text-sm">
                              {hospitalData.medianOverallMax}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 space-y-1.5">
                          <div className="font-semibold text-emerald-800 dark:text-emerald-300">نسبت تحقق به میانه:</div>
                          <div className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                            {((hospitalData.meanOfOverallDeptAverages / (hospitalData.medianOverallMax || 1)) * 100).toFixed(1)}% از میانه کل
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 pt-0.5">
                            سقف‌ها (صعودی): [{[...hospitalData.overallMaxList].sort((a,b)=>a-b).join('، ')}] ← میانه: {hospitalData.medianOverallMax}
                          </div>

                          <div className="text-[9px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300">سقف کل بخش‌ها:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[...hospitalData.allDeptsOverallCapacities]
                                .sort((a,b) => a.maxScore - b.maxScore)
                                .map((c, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 rounded text-[9px]">
                                    <span>{c.deptName}:</span>
                                    <strong className="font-mono">{c.maxScore}</strong>
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Educational / Mathematical Reference Callout */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                        <LightbulbIcon className="w-4 h-4 text-amber-500" />
                        راهنمای نحوه استخراج شاخص‌ها و فرمول محاسباتی:
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        • <strong>میانگین مجموع امتیازات هر مهارت:</strong> میانگین مجموع امتیازات کسب‌شده در هر بخش با یکدیگر جمع شده و بر تعداد کل بخش‌های ارزیابی‌شده تقسیم می‌گردد (برای نمونه: اگر چهار بخش با میانگین‌های ۲۵، ۴۲، ۳۳ و ۵۰ داشته باشیم، مجموع آن‌ها ۱۵۰ بوده و تقسیم بر ۴ برابر با ۳۷.۵ خواهد بود).
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        • <strong>میانه کل حداکثر مهارت‌های بخش‌ها:</strong> حداکثر امتیاز ممکن و قابل کسب در سنجه‌های هر بخش به تفکیک مهارت‌ها به ترتیب صعودی مرتب شده و مقدار میانه (و در مهارت‌های ارتباطی مد/نما در صورت وجود فراوانی مشترک) استخراج می‌شود.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: DEPARTMENT CARDS GRID */}
              {hospitalViewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hospitalData.deptSummaries
                    .filter(d => d.dept.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((d) => {
                      const badge = getScoreBadge(d.overallAvg);
                      return (
                        <div
                          key={d.dept.id}
                          onClick={() => handleSelectDepartmentDrillDown(d.dept.id)}
                          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer space-y-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{d.dept.name}</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">مسئول: {d.dept.managerName}</p>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${badge.bg}`}>
                              {badge.text} ({d.overallAvg}%)
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              <span>پیشرفت مهارتی بخش</span>
                              <span>{d.overallAvg}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  d.overallAvg >= 85 ? 'bg-emerald-500' : d.overallAvg >= 70 ? 'bg-blue-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${d.overallAvg}%` }}
                              />
                            </div>
                          </div>

                          {/* Sub Metrics */}
                          <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block">عمومی</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{d.genAvg}%</span>
                              <span className="text-[10px] text-slate-400 block">{d.avgGenTotalScore} نمره</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">تخصصی</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{d.specAvg}%</span>
                              <span className="text-[10px] text-slate-400 block">{d.avgSpecTotalScore} نمره</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">حقوق بیمار</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{d.commAvg}%</span>
                              <span className="text-[10px] text-slate-400 block">{d.avgCommTotalScore} نمره</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                            <span>{d.pendingActionsCount} اقدام اصلاحی معوق</span>
                            <span>مشاهده جزئیات بخش ←</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* LEVEL 2: SELECTED DEPARTMENT DETAILS                       */}
        {/* ========================================================= */}
        {activeDept && departmentDetails && (
          <div className="space-y-8">
            {/* Department Banner & Switcher */}
            {isDirectDepartmentMode ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
                    <ClipboardDocumentListIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      پنل اختصاصی اقدامات اصلاحی و بهبود مهارتی بخش {activeDept.name}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      ثبت مصوبات، پیگیری اقدامات معوق و برنامه بازآموزی پرسنل بخش بر اساس مراجع بالینی
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setNewActionMonth(selectedMonth !== "all" ? selectedMonth : PERSIAN_MONTHS[0]);
                      setIsAddActionModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    ثبت اقدام اصلاحی جدید
                  </button>
                  <button
                    onClick={() => setIsAiDeptModalOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                  >
                    <AiIcon className="w-4 h-4 text-amber-300" />
                    مشاوره هوشمند ۵ مرجع
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveDeptId(null)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                  >
                    ← بازگشت به نمای کل بیمارستان
                  </button>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">بخش فعلی: {activeDept.name}</span>
                </div>

                <button
                  onClick={() => setIsAiDeptModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  <AiIcon className="w-4 h-4 text-amber-300" />
                  تحلیل هوشمند نیازهای آموزشی بخش
                </button>
              </div>
            )}

            {/* Staff Performance & Ranking Table with Department Averages at the top */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <AcademicCapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                    جدول ارزیابی مهارتی پرسنل و میانگین بخش {activeDept.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    کارنامه مهارتی پرسنل به همراه میانگین درصدها و امتیازات بخش ({departmentDetails.evaluatedStaffCount} نفر در {selectedMonth === 'all' ? `سال ${activeYear}` : `ماه ${selectedMonth}`})
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    onClick={handleExportExcel}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold rounded-lg transition-all border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
                  >
                    <ExcelIcon className="w-3.5 h-3.5" />
                    خروجی اکسل
                  </button>
                </div>
              </div>

              {/* Responsive Container: Smooth horizontal scrolling on small mobile screens */}
              <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right text-[11px] sm:text-xs min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                      <th className="py-2 px-2 text-center w-8 whitespace-nowrap">#</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">نام پرسنل</th>
                      <th className="py-2 px-2 whitespace-nowrap hidden sm:table-cell">سمت</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">امتیاز کل</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">مهارت عمومی</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">مهارت تخصصی</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">مهارت‌های ارتباطی</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">نقاط ضعف</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {/* Highlighted Baseline Row: Department Average Total Points & Percentages */}
                    <tr className="bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-emerald-50/90 dark:from-emerald-950/60 dark:via-teal-950/50 dark:to-emerald-950/60 font-bold border-b-2 border-emerald-300 dark:border-emerald-700/80">
                      <td className="py-2 px-1 text-center">
                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black">
                          شاخص
                        </span>
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                          <div>
                            <span className="font-extrabold text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 block whitespace-nowrap">
                              میانگین بخش
                            </span>
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-300 sm:hidden block">
                              {departmentDetails.evaluatedStaffCount} نفر
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-500 dark:text-slate-400 font-semibold text-[10px] hidden sm:table-cell whitespace-nowrap">
                        کل بخش ({departmentDetails.evaluatedStaffCount} نفر)
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                            {departmentDetails.deptOverallAvg}%
                          </span>
                          <span className="text-[9px] font-medium text-emerald-800 dark:text-emerald-200 whitespace-nowrap bg-emerald-100/90 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded mt-0.5">
                            {departmentDetails.avgOverallTotalScore} / {departmentDetails.avgOverallMaxScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-blue-700 dark:text-blue-300">
                            {departmentDetails.deptGenAvg}%
                          </span>
                          <span className="text-[9px] font-medium text-blue-800 dark:text-blue-200 whitespace-nowrap bg-blue-100/90 dark:bg-blue-900/60 px-1.5 py-0.5 rounded mt-0.5">
                            {departmentDetails.avgGenTotalScore} / {departmentDetails.avgGenMaxScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-teal-700 dark:text-teal-300">
                            {departmentDetails.deptSpecAvg}%
                          </span>
                          <span className="text-[9px] font-medium text-teal-800 dark:text-teal-200 whitespace-nowrap bg-teal-100/90 dark:bg-teal-900/60 px-1.5 py-0.5 rounded mt-0.5">
                            {departmentDetails.avgSpecTotalScore} / {departmentDetails.avgSpecMaxScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-purple-700 dark:text-purple-300">
                            {departmentDetails.deptCommAvg}%
                          </span>
                          <span className="text-[9px] font-medium text-purple-800 dark:text-purple-200 whitespace-nowrap bg-purple-100/90 dark:bg-purple-900/60 px-1.5 py-0.5 rounded mt-0.5">
                            {departmentDetails.avgCommTotalScore} / {departmentDetails.avgCommMaxScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {departmentDetails.totalWeakSkillsCount > 0 ? (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 font-bold rounded text-[10px] whitespace-nowrap">
                            {departmentDetails.totalWeakSkillsCount} مورد
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold text-[10px] whitespace-nowrap">
                            ✓ کامل
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border shadow-sm whitespace-nowrap ${getScoreBadge(departmentDetails.deptOverallAvg).bg}`}>
                          {getScoreBadge(departmentDetails.deptOverallAvg).text}
                        </span>
                      </td>
                    </tr>

                    {/* Personnel Rows */}
                    {departmentDetails.leaderboard.map((item, idx) => {
                      const badge = getScoreBadge(item.overallAvg);
                      return (
                        <tr key={item.staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-2 px-1 text-center font-bold text-slate-400 text-[10px]">#{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <div>
                              <span>{item.staff.name}</span>
                              <span className="block text-[10px] text-slate-400 font-normal sm:hidden">{item.staff.title}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-slate-500 hidden sm:table-cell whitespace-nowrap text-[11px]">{item.staff.title}</td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`px-1.5 py-0.5 font-bold rounded text-[11px] ${badge.bg}`}>
                                {item.overallAvg}%
                              </span>
                              {item.evaluatedInPeriod && (
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                                  {item.staffTotalScore}/{item.staffTotalMax}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{item.genAvg}%</span>
                              {item.evaluatedInPeriod && (
                                <span className="text-[9px] text-slate-400 whitespace-nowrap">
                                  {item.staffGenScore}/{item.staffGenMax}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-teal-600 dark:text-teal-400">{item.specAvg}%</span>
                              {item.evaluatedInPeriod && (
                                <span className="text-[9px] text-slate-400 whitespace-nowrap">
                                  {item.staffSpecScore}/{item.staffSpecMax}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-purple-600 dark:text-purple-400">{item.commAvg}%</span>
                              {item.evaluatedInPeriod && (
                                <span className="text-[9px] text-slate-400 whitespace-nowrap">
                                  {item.staffCommScore}/{item.staffCommMax}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {item.weakSkillsCount > 0 ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold rounded text-[9px] whitespace-nowrap">
                                {item.weakSkillsCount} ضعف
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[9px] whitespace-nowrap">✓ مناسب</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => setSelectedStaffForModal(item.staff)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold rounded-md transition-colors text-[10px] whitespace-nowrap"
                            >
                              کارنامه
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Department Improvement & Consultation Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-indigo-700/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
                    <AiIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">برنامه بهبود و تحلیل هوشمند اقدامات اصلاحی بخش {activeDept.name} (هوش مصنوعی)</h3>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed max-w-3xl">
                  تولید راهکارهای بالینی و تحلیل نیازهای آموزشی بخش منحصراً بر اساس ۵ مرجع معتبر: <strong>گایدلاین‌های جهانی بالینی</strong>، <strong>کتاب اصول پرستاری پاتر و پری</strong>، <strong>کتاب برونر و سودارث</strong>، <strong>راهنمای بوکلت مادری و سلامت کودک</strong> و <strong>سنجه‌های اعتباربخشی وزارت بهداشت</strong>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">✓ گایدلاین‌های جهانی</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">✓ پاتر و پری</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">✓ برونر و سودارث</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">✓ بوکلت مادری</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">✓ اعتباربخشی وزارت بهداشت</span>
                </div>
              </div>
              <button
                onClick={() => setIsAiDeptModalOpen(true)}
                className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-2 self-stretch md:self-auto justify-center"
              >
                <LightbulbIcon className="w-4 h-4 text-slate-950" />
                مشاهده تحلیل و مشاوره هوشمند بخش
              </button>
            </div>

            {/* SECTION 1: Department Registered Corrective Actions (Placed FIRST per user request) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600" />
                    اقدامات اصلاحی مصوب بخش
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ثبت مصوبات و برنامه‌های بهبود جهت نمایش در پنل مسئول بخش و سوپروایزر
                  </p>
                </div>
                <button
                  onClick={() => setIsAddActionModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  ثبت اقدام جدید
                </button>
              </div>

              {(activeDept.correctiveActions || []).filter(ca => selectedMonth === 'all' || ca.month === selectedMonth || (ca.deadline && ca.deadline.includes(selectedMonth))).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                  <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-sm">هیچ اقدام اصلاحی ثبت نشده</p>
                  <p className="text-xs mt-1">جهت تعیین مسئول پیگیری و مهلت انجام، روی دکمه فوق کلیک کنید.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeDept.correctiveActions || []).filter(ca => selectedMonth === 'all' || ca.month === selectedMonth || (ca.deadline && ca.deadline.includes(selectedMonth))).map((ca) => (
                    <div
                      key={ca.id}
                      className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              ca.priority === 'high'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : ca.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            اولویت {ca.priority === 'high' ? 'بالا' : ca.priority === 'medium' ? 'متوسط' : 'پایین'}
                          </span>
                          {ca.month && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                              ماه {ca.month}
                            </span>
                          )}
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{ca.title}</h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{ca.description}</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <span>مسئول پیگیری: <strong>{ca.responsiblePerson}</strong></span>
                          {ca.deadline && <span>مهلت اجرا: <strong>{ca.deadline}</strong></span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => onToggleActionStatus(activeDept.id, ca.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            ca.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {ca.status === 'completed' ? 'تکمیل شده ✓' : 'در حال انجام / معوق'}
                        </button>

                        <button
                          onClick={() => onDeleteCustomAction(activeDept.id, ca.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                          title="حذف اقدام"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Identified Weak Skills Needing Corrective Action */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <LightbulbIcon className="w-5 h-5 text-rose-500" />
                    نقاط ضعف مهارتی شناسایی شده در بخش ({departmentDetails.skillsNeedingTraining.length} مهارت نیازمند مداخله)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مهارت‌هایی با میانگین کمتر از ۷۰٪ یا دارای پرسنل با نمره ضعیف، همراه با راهکار بالینی مطابق منابع ۵ گانه
                  </p>
                </div>
              </div>

              {departmentDetails.skillsNeedingTraining.length === 0 ? (
                <div className="p-6 text-center bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  ✓ تمام مهارت‌های ارزیابی شده بخش بالاتر از حد نصاب استاندارد (۷۰٪) قرار دارند.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departmentDetails.skillsNeedingTraining.map((skill, idx) => {
                    const skillKey = skill.skillName;
                    const currentSolution = customSkillSolutions[skillKey] !== undefined ? customSkillSolutions[skillKey] : (skill.recAction || '');

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded">
                                دسته: {skill.categoryName}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                                {skill.skillName}
                              </h4>
                            </div>
                            <span className="px-2 py-1 text-xs font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 whitespace-nowrap">
                              میانگین: {skill.averageScore}%
                            </span>
                          </div>

                          {/* Clinical Solution Box - Direct manual entry */}
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <LightbulbIcon className="w-3.5 h-3.5 text-amber-500" />
                                راهکار بالینی / مداخله اصلاحی:
                              </label>
                              {customSkillSolutions[skillKey] && (
                                <button
                                  type="button"
                                  onClick={() => setCustomSkillSolutions(prev => ({ ...prev, [skillKey]: '' }))}
                                  className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                  پاک کردن
                                </button>
                              )}
                            </div>

                            <textarea
                              value={currentSolution}
                              onChange={(e) => setCustomSkillSolutions(prev => ({ ...prev, [skillKey]: e.target.value }))}
                              rows={3}
                              placeholder="راهکار بالینی، برنامه کارگاه یا مداخله مدنظر خود را اینجا بنویسید..."
                              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 leading-relaxed font-sans resize-y"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-3 mt-2 border-t border-slate-200 dark:border-slate-600">
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            {skill.lowCount} نفر نیازمند آموزش
                          </span>
                          <button
                            onClick={() => handleAddAiSkillToAction(skill)}
                            disabled={addingAiSkillName === skill.skillName}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            {addingAiSkillName === skill.skillName ? "ثبت شد ✓" : "ثبت در اقدامات اصلاحی بخش"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: STAFF INDIVIDUAL SCORECARD & WEAKNESSES           */}
      {/* ========================================================= */}
      {selectedStaffForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  کارنامه مهارتی و تحلیل فردی: {selectedStaffForModal.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سمت: {selectedStaffForModal.title} | کد ملی: {selectedStaffForModal.nationalId || 'ثبت نشده'}
                </p>
              </div>
              <button
                onClick={() => setSelectedStaffForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {(() => {
                const staffAssessments = (selectedStaffForModal.assessments || []).filter(a => selectedMonth === 'all' || a.month === selectedMonth);
                
                let totalPct = 0, itemCount = 0;
                let genPct = 0, genCount = 0;
                let specPct = 0, specCount = 0;
                let commPct = 0, commCount = 0;
                const weakItems: { desc: string; catName: string; scorePct: number }[] = [];

                staffAssessments.forEach(ass => {
                  const maxPossible = ass.maxScore && ass.maxScore > 0 ? ass.maxScore : 4;
                  (ass.skillCategories || []).forEach(cat => {
                    const cType = classifyCategory(cat.name);
                    (cat.items || []).forEach(item => {
                      if (!item || typeof item.score !== 'number') return;
                      const pct = calculatePercentage(item.score, maxPossible);
                      totalPct += pct;
                      itemCount += 1;
                      if (cType === 'general') { genPct += pct; genCount += 1; }
                      else if (cType === 'communication') { commPct += pct; commCount += 1; }
                      else { specPct += pct; specCount += 1; }

                      if (pct < 70) {
                        weakItems.push({ desc: item.description, catName: cat.name, scorePct: Math.round(pct) });
                      }
                    });
                  });
                });

                const staffOverall = itemCount > 0 ? Math.round(totalPct / itemCount) : 0;
                const staffGen = genCount > 0 ? Math.round(genPct / genCount) : 0;
                const staffSpec = specCount > 0 ? Math.round(specPct / specCount) : 0;
                const staffComm = commCount > 0 ? Math.round(commPct / commCount) : 0;

                return (
                  <>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">نمره کل</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{staffOverall}%</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">عمومی</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{staffGen}%</p>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">تخصصی</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{staffSpec}%</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">ارتباطی</p>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{staffComm}%</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
                        مهارت‌های نیازمند بهبود فردی ({weakItems.length} مورد)
                      </h4>
                      {weakItems.length === 0 ? (
                        <div className="p-4 text-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                          این کاربر در تمام مهارت‌ها نمره بالای ۷۰٪ کسب کرده است.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {weakItems.map((w, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{w.desc}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">دسته‌بندی: {w.catName}</span>
                              </div>
                              <span className="px-2 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold rounded-md">
                                {w.scorePct}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 text-left">
              <button
                onClick={() => setSelectedStaffForModal(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: AI HOSPITAL INTELLIGENT ANALYSIS                 */}
      {/* ========================================================= */}
      {isAiHospitalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AiIcon className="w-6 h-6 text-amber-300" />
                <h3 className="font-bold text-lg">گزارش تحلیل هوشمند کل بیمارستان {hospital.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleExportAiReportToWord(
                      `گزارش تحلیل هوشمند بیمارستان ${hospital.name}`,
                      aiHospitalText,
                      hospitalUserQuery,
                      hospitalCustomAnswer,
                      `گزارش_تحلیل_هوشمند_${hospital.name}`
                    )
                  }
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  title="دانلود فایل ورد گزارش"
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  دانلود فایل ورد (Word)
                </button>
                <button onClick={() => setIsAiHospitalModalOpen(false)} className="text-white/80 hover:text-white text-lg">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold text-xs">
                📊 دوره ارزیابی: {selectedMonth === 'all' ? 'سال جاری' : `ماه ${selectedMonth}`} | تعداد پرسنل پایش‌شده: {hospitalData.totalEvaluatedStaff} نفر
              </div>

              {/* OVERALL ANALYSIS SECTION */}
              <div className="space-y-2">
                <h4 className="font-bold text-base text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                  ۱. تحلیل و ارزیابی کلی هوش مصنوعی
                </h4>
                {isAiHospitalLoading ? (
                  <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-bold text-sm text-indigo-900 dark:text-indigo-300">
                      در حال تحلیل داده‌های بالینی و استخراج گزارش با هوش مصنوعی Gemini...
                    </p>
                  </div>
                ) : aiHospitalText ? (
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                    {aiHospitalText}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    میانگین نمره مهارتی کل بیمارستان {hospitalData.overallHospitalAvg}% می‌باشد.
                  </div>
                )}
              </div>

              {/* CUSTOM AI QUESTION INPUT SECTION */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-slate-900 dark:to-indigo-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
                  <AiIcon className="w-5 h-5 text-indigo-600" />
                  <h4>۲. پرسش یا درخواست اختصاصی از هوش مصنوعی</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  می‌توانید سوال خاص خود را بر اساس نمرات و وضعیت مهارتی از هوش مصنوعی بپرسید تا تحلیل مهارتی اختصاصی ارائه دهد:
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={hospitalUserQuery}
                    onChange={(e) => setHospitalUserQuery(e.target.value)}
                    placeholder="مثال: وضعیت مهارت‌های عمومی را نسبت به تخصصی تحلیل کن و ۳ راهکار اولویت‌دار جهت ارتقای حقوق بیمار بده..."
                    className="w-full p-3.5 text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={isHospitalCustomLoading || !hospitalUserQuery.trim()}
                      onClick={handleAskHospitalCustomQuestion}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      {isHospitalCustomLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          در حال پردازش پاسخ...
                        </>
                      ) : (
                        <>
                          <AiIcon className="w-4 h-4 text-amber-300" />
                          ارسال سوال به هوش مصنوعی
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {hospitalCustomAnswer && (
                  <div className="mt-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      <LightbulbIcon className="w-4 h-4 text-amber-500" />
                      پاسخ هوشمند هوش مصنوعی:
                    </div>
                    <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {hospitalCustomAnswer}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
              <button
                onClick={() =>
                  handleExportAiReportToWord(
                    `گزارش تحلیل هوشمند بیمارستان ${hospital.name}`,
                    aiHospitalText,
                    hospitalUserQuery,
                    hospitalCustomAnswer,
                    `گزارش_تحلیل_هوشمند_${hospital.name}`
                  )
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                دانلود فایل ورد (Word .doc)
              </button>

              <button
                onClick={() => setIsAiHospitalModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: AI DEPARTMENT SKILL NEEDS ANALYSIS              */}
      {/* ========================================================= */}
      {isAiDeptModalOpen && activeDept && departmentDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AiIcon className="w-6 h-6 text-amber-300" />
                <h3 className="font-bold text-lg">تحلیل هوشمند نیازهای آموزشی و اصلاحی بخش {activeDept.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleExportAiReportToWord(
                      `گزارش تحلیل هوشمند بخش ${activeDept.name}`,
                      aiDeptText,
                      deptUserQuery,
                      deptCustomAnswer,
                      `گزارش_تحلیل_هوشمند_بخش_${activeDept.name}`
                    )
                  }
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  title="دانلود فایل ورد گزارش"
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  دانلود فایل ورد (Word)
                </button>
                <button onClick={() => setIsAiDeptModalOpen(false)} className="text-white/80 hover:text-white text-lg">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                بر اساس نمرات واقعی استخراج‌شده از ارزیابی‌های {selectedMonth === 'all' ? 'سال جاری' : `ماه ${selectedMonth}`}، لیست دقیق مهارت‌های دارای ضعف و راهکارهای بالینی هوشمند مشخص گردیده است:
              </p>

              {/* OVERALL DEPT ANALYSIS */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                  ۱. تحلیل کلی عملکرد بخش با AI
                </h4>
                {isAiDeptLoading ? (
                  <div className="py-10 text-center space-y-3 bg-emerald-50/50 dark:bg-slate-900/40 rounded-xl border border-emerald-200 dark:border-slate-700">
                    <div className="w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                      در حال پردازش داده‌های نمرات پرسنل و تحلیل مهارتی با هوش مصنوعی...
                    </p>
                  </div>
                ) : aiDeptText ? (
                  <div className="bg-emerald-50/50 dark:bg-slate-900/60 p-4 rounded-xl border border-emerald-200 dark:border-slate-700 font-sans whitespace-pre-wrap leading-relaxed text-xs">
                    {aiDeptText}
                  </div>
                ) : null}
              </div>

              {/* CUSTOM AI QUESTION INPUT SECTION */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-slate-900 dark:to-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                  <AiIcon className="w-5 h-5 text-emerald-600" />
                  <h4>۲. پرسش یا درخواست اختصاصی از هوش مصنوعی</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  می‌توانید سوال خاصی درباره نمرات مهارتی و نیازهای آموزشی این بخش مطرح کنید:
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={deptUserQuery}
                    onChange={(e) => setDeptUserQuery(e.target.value)}
                    placeholder="مثال: چه اقدامات اصلاحی ۳ ماهه‌ای برای کاهش خطای دارودهی پیشنهاد می‌کنی؟"
                    className="w-full p-3.5 text-xs bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={isDeptCustomLoading || !deptUserQuery.trim()}
                      onClick={handleAskDeptCustomQuestion}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      {isDeptCustomLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          در حال پردازش پاسخ...
                        </>
                      ) : (
                        <>
                          <AiIcon className="w-4 h-4 text-amber-300" />
                          ارسال سوال به هوش مصنوعی
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {deptCustomAnswer && (
                  <div className="mt-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <LightbulbIcon className="w-4 h-4 text-amber-500" />
                      پاسخ هوشمند هوش مصنوعی:
                    </div>
                    <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {deptCustomAnswer}
                    </div>
                  </div>
                )}
              </div>

              {/* RECOMMENDED SKILLS LIST */}
              {departmentDetails.skillsNeedingTraining.length === 0 ? (
                <div className="p-6 text-center bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold text-sm">تمامی مهارت‌های این بخش در سطح مطلوب (بالای ۷۰٪) قرار دارند.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    لیست مهارت‌های دارای اولویت بهبود:
                  </h4>
                  {departmentDetails.skillsNeedingTraining.map((sk, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{sk.skillName}</span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">نمره: {sk.averageScore}%</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        تعداد پرسنل دارای ضعف در این مهارت: <strong>{sk.lowCount} نفر</strong>
                      </p>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium pt-1">
                        💡 اقدام پیشنهادی هوشمند: {sk.recAction}
                      </p>
                      <div className="pt-2 flex justify-end">
                        <button
                          disabled={addingAiSkillName === sk.skillName}
                          onClick={() => handleAutoAddRecommendation(sk)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {addingAiSkillName === sk.skillName ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                              در حال ثبت با AI...
                            </>
                          ) : (
                            '+ افزودن این توصیه به لیست اقدامات اصلاحی بخش'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
              <button
                onClick={() =>
                  handleExportAiReportToWord(
                    `گزارش تحلیل هوشمند بخش ${activeDept.name}`,
                    aiDeptText,
                    deptUserQuery,
                    deptCustomAnswer,
                    `گزارش_تحلیل_هوشمند_بخش_${activeDept.name}`
                  )
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                دانلود فایل ورد (Word .doc)
              </button>

              <button
                onClick={() => setIsAiDeptModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ADD CUSTOM CORRECTIVE ACTION FORM                */}
      {/* ========================================================= */}
      {isAddActionModalOpen && activeDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                ثبت اقدام اصلاحی جدید برای بخش {activeDept.name}
              </h3>
              <button onClick={() => setIsAddActionModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveCustomAction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ماه مربوط به اقدام *
                </label>
                <select
                  value={newActionMonth}
                  onChange={(e) => setNewActionMonth(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 dark:text-emerald-400"
                >
                  {PERSIAN_MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان اقدام اصلاحی *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: برگزاری کارگاه تزریقات ایمن و احیای نوزاد"
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  شرح دقیق برنامه بهبود و راهکار *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="توضیح کامل در خصوص نحوه اجرا، منابع آموزشی و پایش..."
                  value={newActionDesc}
                  onChange={(e) => setNewActionDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    مسئول پیگیری
                  </label>
                  <input
                    type="text"
                    placeholder={`پیش‌فرض: ${activeDept.managerName}`}
                    value={newActionResponsible}
                    onChange={(e) => setNewActionResponsible(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اولویت اجرا
                  </label>
                  <select
                    value={newActionPriority}
                    onChange={(e) => setNewActionPriority(e.target.value as 'high' | 'medium' | 'low')}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="high">بالا (فوراً)</option>
                    <option value="medium">متوسط</option>
                    <option value="low">پایین</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  مهلت اجرای مصوبه (تاریخ)
                </label>
                <input
                  type="text"
                  placeholder="مثال: پایان ماه / ۱۴۰۳/۰۶/۱۵"
                  value={newActionDeadline}
                  onChange={(e) => setNewActionDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddActionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  ثبت اقدام اصلاحی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectiveActionsView;
