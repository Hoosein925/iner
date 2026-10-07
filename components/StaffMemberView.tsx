import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Department,
  StaffMember,
  SkillCategory,
  Assessment,
  NamedChecklistTemplate,
  ExamTemplate,
  Question,
  QuestionType,
  ExamSubmission,
  ExamAnswer,
  UserRole,
  MonthlyTraining,
  TrainingMaterial,
  NewsBanner,
  MonthlyNeedsAssessment,
  SkillItem,
  StaffChecklistEvaluation,
} from '../types';
import { generatePeriodicPlanWithAI } from '../services/geminiService';
import SkillCategoryDisplay from './SkillCategoryDisplay';
import PeriodicPlanModal from './PeriodicPlanModal';
import SkillAiTrainingModal from './SkillAiTrainingModal';
import Modal from './Modal';
import { BackIcon } from './icons/BackIcon';
import { AiIcon } from './icons/AiIcon';
import { SaveIcon } from './icons/SaveIcon';
import { EditIcon } from './icons/EditIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import PreviewModal from './PreviewModal';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { AudioIcon } from './icons/AudioIcon';
import { PdfIcon } from './icons/PdfIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import NewsCarousel from './NewsCarousel';
import { LightbulbIcon } from './icons/LightbulbIcon';
import FileUploader from './FileUploader';
import { parseFilledChecklist } from '../services/excelParser';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ChecklistIcon } from './icons/ChecklistIcon';

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const CHART_COLORS = ['#3b82f6', '#16a34a', '#f97316', '#dc2626', '#8b5cf6', '#db2777'];

type Screen =
  | 'assessment_menu'
  | 'registered_months_scores'
  | 'skill_details'
  | 'assessment_form'
  | 'summary_chart'
  | 'exam_scores_hub'
  | 'exam_list'
  | 'exam_taking'
  | 'exam_result'
  | 'evaluation_results'
  | 'training_materials'
  | 'accreditation_materials'
  | 'needs_assessment'
  | 'work_log';

const getIconForMimeType = (type: string): { icon: React.ReactNode; color: string } => {
  if (type === 'article') return { icon: <DocumentIcon className="w-10 h-10" />, color: 'text-sky-500' };
  if (type.startsWith('image/')) return { icon: <ImageIcon className="w-10 h-10" />, color: 'text-blue-500' };
  if (type.startsWith('video/')) return { icon: <VideoIcon className="w-10 h-10" />, color: 'text-red-500' };
  if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-10 h-10" />, color: 'text-purple-500' };
  if (type === 'application/pdf') return { icon: <PdfIcon className="w-10 h-10" />, color: 'text-orange-500' };
  return { icon: <DocumentIcon className="w-10 h-10" />, color: 'text-slate-500' };
};

const formatJalaliDate = (isoOrTs?: string | number): string => {
  if (!isoOrTs) return 'ثبت شده';
  try {
    const d = typeof isoOrTs === 'number' || (!isNaN(Number(isoOrTs)) && String(isoOrTs).length > 8)
      ? new Date(Number(isoOrTs))
      : new Date(isoOrTs);
    if (isNaN(d.getTime())) return String(isoOrTs);
    return d.toLocaleDateString('fa-IR');
  } catch {
    return 'ثبت شده';
  }
};

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  backButtonText: string;
  staffMember: StaffMember;
  selectedMonth: string | null;
  currentScreen: Screen;
  userRole: UserRole;
  assessment?: Assessment | null;
  handleInternalBack: () => void;
  handleEditAssessment?: () => void;
  hideBack?: boolean;
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  children,
  backButtonText,
  staffMember,
  selectedMonth,
  currentScreen,
  userRole,
  assessment,
  handleInternalBack,
  handleEditAssessment,
  hideBack = false,
}) => {
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {staffMember.name} {staffMember.title ? `(${staffMember.title})` : ''} {selectedMonth ? `- ماه ${selectedMonth}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hideBack && (
            <button
              onClick={handleInternalBack}
              className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors text-sm shadow-sm"
            >
              <BackIcon className="w-4 h-4" />
              {backButtonText}
            </button>
          )}
          {currentScreen === 'skill_details' && userRole !== UserRole.Staff && assessment && handleEditAssessment && (
            <button
              onClick={handleEditAssessment}
              className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 text-sm shadow-sm"
            >
              <EditIcon className="w-4 h-4" /> ویرایش نمرات
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

interface StaffMemberViewProps {
  department: Department;
  staffMember: StaffMember;
  onBack: () => void;
  onAddOrUpdateAssessment: (
    departmentId: string,
    staffId: string,
    month: string,
    year: number,
    skills: SkillCategory[],
    template?: Partial<NamedChecklistTemplate>
  ) => void;
  onUpdateAssessmentMessages: (
    departmentId: string,
    staffId: string,
    month: string,
    year: number,
    messages: { supervisorMessage: string; managerMessage: string }
  ) => void;
  onSubmitExam: (departmentId: string, staffId: string, month: string, year: number, submission: ExamSubmission) => void;
  onSubmitNeedsAssessmentResponse: (departmentId: string, staffId: string, month: string, year: number, responses: Map<string, string>) => void;
  checklistTemplates: NamedChecklistTemplate[];
  examTemplates: ExamTemplate[];
  trainingMaterials: MonthlyTraining[];
  accreditationMaterials: TrainingMaterial[];
  newsBanners: NewsBanner[];
  needsAssessments: MonthlyNeedsAssessment[];
  userRole: UserRole;
  activeYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

const StaffMemberView: React.FC<StaffMemberViewProps> = ({
  department,
  staffMember,
  onBack,
  onAddOrUpdateAssessment,
  onUpdateAssessmentMessages,
  onSubmitExam,
  onSubmitNeedsAssessmentResponse,
  checklistTemplates,
  examTemplates,
  trainingMaterials,
  accreditationMaterials,
  newsBanners,
  needsAssessments,
  userRole,
  activeYear,
  availableYears,
  onYearChange,
}) => {
  // Directly open user dashboard ('assessment_menu'), bypassing months selection completely
  const [currentScreen, setCurrentScreen] = useState<Screen>('assessment_menu');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Messages state
  const [supervisorMessage, setSupervisorMessage] = useState('');
  const [managerMessage, setManagerMessage] = useState('');

  // Assessment edit/add state
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [assessmentFormData, setAssessmentFormData] = useState<SkillCategory[]>([]);
  const [activeAssessmentTemplate, setActiveAssessmentTemplate] = useState<Partial<NamedChecklistTemplate> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Exam state
  const [currentExam, setCurrentExam] = useState<ExamTemplate | null>(null);
  const [examAnswers, setExamAnswers] = useState<Map<string, string>>(new Map());
  const [currentSubmissionResult, setCurrentSubmissionResult] = useState<ExamSubmission | null>(null);

  // Media preview
  const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);

  // Needs assessment state
  const [needsAssessmentResponses, setNeedsAssessmentResponses] = useState<Map<string, string>>(new Map());

  // Checklist evaluation detail modal state
  const [selectedChecklistDetail, setSelectedChecklistDetail] = useState<StaffChecklistEvaluation | null>(null);

  // AI Improvement / Periodic Plan Modal State
  const [isPeriodicPlanModalOpen, setIsPeriodicPlanModalOpen] = useState(false);
  const [periodicPlanContent, setPeriodicPlanContent] = useState<string | null>(null);
  const [isPeriodicPlanLoading, setIsPeriodicPlanLoading] = useState(false);

  // AI Skill-Specific Training Modal State
  const [skillTrainingModalState, setSkillTrainingModalState] = useState<{
    isOpen: boolean;
    skillName: string;
    categoryName: string;
    currentScore?: number;
    maxScore?: number;
  }>({
    isOpen: false,
    skillName: '',
    categoryName: '',
  });

  // Reset screen directly to assessment_menu when staff member changes
  useEffect(() => {
    setCurrentScreen('assessment_menu');
    setSelectedMonth(null);
  }, [staffMember.id]);

  // Map assessments by month for active year
  const assessmentsByMonth = useMemo(() => {
    const map = new Map<string, Assessment>();
    (staffMember.assessments || [])
      .filter(a => a.year === activeYear)
      .forEach(a => {
        const sanitizedCategories = (a.skillCategories || []).map(cat => ({
          ...cat,
          items: (cat.items || []).filter(item => typeof item.score === 'number' && item.score >= 0),
        }));
        const totalItemsCount = sanitizedCategories.reduce((sum, cat) => sum + (cat.items ? cat.items.length : 0), 0);
        if (totalItemsCount >= 1) {
          map.set(a.month, {
            ...a,
            skillCategories: sanitizedCategories,
          });
        }
      });
    return map;
  }, [staffMember.assessments, activeYear]);

  // List of registered months that have scores
  const registeredMonths = useMemo(() => {
    return PERSIAN_MONTHS.filter(m => assessmentsByMonth.has(m));
  }, [assessmentsByMonth]);

  // Latest registered assessment
  const latestAssessment = useMemo(() => {
    if (selectedMonth && assessmentsByMonth.has(selectedMonth)) {
      return assessmentsByMonth.get(selectedMonth);
    }
    for (let i = PERSIAN_MONTHS.length - 1; i >= 0; i--) {
      const ass = assessmentsByMonth.get(PERSIAN_MONTHS[i]);
      if (ass) return ass;
    }
    return null;
  }, [selectedMonth, assessmentsByMonth]);

  // All exam submissions for this staff
  const allStaffExamSubmissions = useMemo(() => {
    const list: ExamSubmission[] = [];
    (staffMember.assessments || []).forEach(a => {
      (a.examSubmissions || []).forEach(sub => {
        list.push(sub);
      });
    });
    return list.sort((a, b) => (b.submissionDate || '').localeCompare(a.submissionDate || ''));
  }, [staffMember.assessments]);

  const submittedExamIds = useMemo(() => {
    return new Set(allStaffExamSubmissions.map(s => s.examTemplateId));
  }, [allStaffExamSubmissions]);

  // Sorted Educational materials by date priority (latest first)
  const allTrainingMaterialsSorted = useMemo(() => {
    const list: Array<{ material: TrainingMaterial; month: string }> = [];
    (trainingMaterials || []).forEach(tm => {
      (tm.materials || []).forEach(mat => {
        list.push({ material: mat, month: tm.month });
      });
    });

    return list.sort((a, b) => {
      const timeA = a.material.createdAt ? new Date(a.material.createdAt).getTime() : (!isNaN(Number(a.material.id)) && a.material.id.length > 8 ? Number(a.material.id) : 0);
      const timeB = b.material.createdAt ? new Date(b.material.createdAt).getTime() : (!isNaN(Number(b.material.id)) && b.material.id.length > 8 ? Number(b.material.id) : 0);
      return timeB - timeA;
    });
  }, [trainingMaterials]);

  // Sorted Accreditation materials by date/time priority (latest first)
  const allAccreditationMaterialsSorted = useMemo(() => {
    return [...(accreditationMaterials || [])].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (!isNaN(Number(a.id)) && a.id.length > 8 ? Number(a.id) : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (!isNaN(Number(b.id)) && b.id.length > 8 ? Number(b.id) : 0);
      return timeB - timeA;
    });
  }, [accreditationMaterials]);

  // All Needs Assessments topics across months
  const allNeedsAssessmentTopics = useMemo(() => {
    const list: Array<{ topic: any; month: string; year: number }> = [];
    (needsAssessments || [])
      .filter(na => na.year === activeYear)
      .forEach(na => {
        (na.topics || []).forEach(topic => {
          list.push({ topic, month: na.month, year: na.year });
        });
      });
    return list;
  }, [needsAssessments, activeYear]);

  // Initialize responses when entering needs assessment
  useEffect(() => {
    if (currentScreen === 'needs_assessment') {
      const initial = new Map<string, string>();
      allNeedsAssessmentTopics.forEach(({ topic }) => {
        const existing = topic.responses?.find((r: any) => r.staffId === staffMember.id);
        if (existing) {
          initial.set(topic.id, existing.response);
        }
      });
      setNeedsAssessmentResponses(initial);
    }
  }, [currentScreen, allNeedsAssessmentTopics, staffMember.id]);

  const handleNeedsAssessmentResponseChange = (topicId: string, response: string) => {
    setNeedsAssessmentResponses(new Map(needsAssessmentResponses.set(topicId, response)));
  };

  const handleSubmitNeedsAssessmentClick = (month: string, year: number) => {
    onSubmitNeedsAssessmentResponse(department.id, staffMember.id, month, year, needsAssessmentResponses);
    alert('نظرات شما با موفقیت ثبت شد.');
  };

  // Generate Improvement Plan based on latest score status
  const handleOpenStaffPeriodicPlan = async () => {
    setIsPeriodicPlanModalOpen(true);
    setIsPeriodicPlanLoading(true);
    setPeriodicPlanContent(null);

    try {
      const targetAssessment = latestAssessment;
      const maxPossibleScore = targetAssessment?.maxScore ?? 4;
      let totalItems = 0;
      let totalScoreSum = 0;
      let genItems = 0;
      let genScoreSum = 0;
      let specItems = 0;
      let specScoreSum = 0;
      let commItems = 0;
      let commScoreSum = 0;

      const skillsSummary: any[] = [];
      const weakSkills: any[] = [];

      if (targetAssessment && targetAssessment.skillCategories) {
        targetAssessment.skillCategories.forEach(cat => {
          const isGeneral = cat.name.includes('عمومی');
          const isSpecial = cat.name.includes('تخصصی') || cat.name.includes('ویژه');
          const isComm = cat.name.includes('ارتباط') || cat.name.includes('حقوق');
          const catShort = isGeneral ? 'مهارت‌های عمومی' : isComm ? 'مهارت‌های ارتباطی' : 'مهارت‌های تخصصی';

          (cat.items || []).forEach((item, itemIdx) => {
            const score = typeof item.score === 'number' ? item.score : 0;
            const radif = item.radif || itemIdx + 1;
            const refText = `مهارت شماره ${radif} از ${catShort}`;
            totalItems++;
            totalScoreSum += score;

            if (isGeneral) {
              genItems++;
              genScoreSum += score;
            } else if (isSpecial) {
              specItems++;
              specScoreSum += score;
            } else if (isComm) {
              commItems++;
              commScoreSum += score;
            } else {
              specItems++;
              specScoreSum += score;
            }

            const itemPercentage = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0;
            skillsSummary.push({
              skillName: item.description,
              categoryName: catShort,
              radif,
              referenceText: refText,
              score,
              percentage: Math.round(itemPercentage),
            });

            if (score < maxPossibleScore * 0.75) {
              weakSkills.push({
                skillName: item.description,
                categoryName: catShort,
                radif,
                referenceText: refText,
                score,
              });
            }
          });
        });
      }

      const overallAvg = totalItems > 0 ? Math.round((totalScoreSum / (totalItems * maxPossibleScore)) * 100) : 80;
      const genAvg = genItems > 0 ? Math.round((genScoreSum / (genItems * maxPossibleScore)) * 100) : overallAvg;
      const specAvg = specItems > 0 ? Math.round((specScoreSum / (specItems * maxPossibleScore)) * 100) : overallAvg;
      const commAvg = commItems > 0 ? Math.round((commScoreSum / (commItems * maxPossibleScore)) * 100) : overallAvg;

      const plan = await generatePeriodicPlanWithAI({
        mode: 'staff',
        departmentName: department.name,
        staffName: staffMember.name,
        staffTitle: staffMember.title,
        overallAvg,
        genAvg,
        specAvg,
        commAvg,
        totalStaffCount: 1,
        skillsSummary,
        weakSkills,
        supervisorMessage: targetAssessment?.supervisorMessage,
        managerMessage: targetAssessment?.managerMessage,
      });

      setPeriodicPlanContent(plan);
    } catch (err) {
      console.error('Error generating staff periodic plan:', err);
      setPeriodicPlanContent('خطا در تدوین برنامه جامع بهبود بالینی با هوش مصنوعی.');
    } finally {
      setIsPeriodicPlanLoading(false);
    }
  };

  const handleGenerateSkillTraining = (item: SkillItem, categoryName: string) => {
    const currentAssessment = selectedMonth ? assessmentsByMonth.get(selectedMonth) : latestAssessment;
    setSkillTrainingModalState({
      isOpen: true,
      skillName: item.description,
      categoryName,
      currentScore: item.score,
      maxScore: currentAssessment?.maxScore ?? 4,
    });
  };

  // Progress chart data and category names
  const progressChartInfo = useMemo(() => {
    const allCategoryNames = new Set<string>();
    (staffMember.assessments || []).forEach(ass => (ass.skillCategories || []).forEach(cat => allCategoryNames.add(cat.name)));
    const categoryNames = Array.from(allCategoryNames);

    const data = (staffMember.assessments || [])
      .filter(assessment => assessment.year === activeYear && PERSIAN_MONTHS.includes(assessment.month))
      .map(assessment => {
        const scores: { [key: string]: any } = { name: assessment.month };
        const maxPossibleScore = assessment.maxScore ?? 4;

        (assessment.skillCategories || []).forEach(cat => {
          const items = cat.items || [];
          const totalScore = items.reduce((sum, item) => sum + (item?.score || 0), 0);
          const maxScore = items.length * maxPossibleScore;
          scores[cat.name] = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(1)) : null;
        });
        categoryNames.forEach(name => {
          if (!(name in scores)) {
            scores[name] = null;
          }
        });
        return scores;
      })
      .sort((a, b) => PERSIAN_MONTHS.indexOf(a.name as string) - PERSIAN_MONTHS.indexOf(b.name as string));

    return { data, categoryNames };
  }, [staffMember.assessments, activeYear]);

  // Overall analytical summary of progress trends
  const progressTrendAnalysis = useMemo(() => {
    const { data, categoryNames } = progressChartInfo;
    if (data.length === 0) {
      return {
        hasData: false,
        trends: [],
        overallSummary: 'هنوز نمره‌ای در ماه‌های سال جاری برای تحلیل روند پیشرفت ثبت نشده است.',
      };
    }

    const trends: Array<{ name: string; status: 'up' | 'down' | 'stable'; text: string; firstVal: number; lastVal: number }> = [];

    categoryNames.forEach(catName => {
      const validPoints = data.map(d => d[catName]).filter((v): v is number => typeof v === 'number');
      if (validPoints.length === 0) return;

      const firstVal = validPoints[0];
      const lastVal = validPoints[validPoints.length - 1];
      const diff = lastVal - firstVal;

      if (diff >= 3) {
        trends.push({
          name: catName,
          status: 'up',
          firstVal,
          lastVal,
          text: `وضعیت ${catName} شما با رشد از ${firstVal}٪ به ${lastVal}٪ (رشد ${diff.toFixed(1)}٪) روندی رو به افزایش داشته است. پایبندی شما به استانداردهای مهارتی در این بخش ارتقا یافته است.`,
        });
      } else if (diff <= -3) {
        trends.push({
          name: catName,
          status: 'down',
          firstVal,
          lastVal,
          text: `وضعیت ${catName} شما با کاهش از ${firstVal}٪ به ${lastVal}٪ (افت ${Math.abs(diff).toFixed(1)}٪) روندی رو به کاهش داشته است. توصیه می‌شود در جلسات بازآموزی و کارگاه‌های مهارتی تمرکز بیشتری داشته باشید.`,
        });
      } else {
        trends.push({
          name: catName,
          status: 'stable',
          firstVal,
          lastVal,
          text: `وضعیت ${catName} شما در سطح مطلوب و تثبیت‌شده (میانگین ${lastVal}٪) حفظ شده است. استمرار این عملکرد شایسته تقدیر است.`,
        });
      }
    });

    const upCount = trends.filter(t => t.status === 'up').length;
    const downCount = trends.filter(t => t.status === 'down').length;

    let overallSummary = '';
    if (upCount > downCount) {
      overallSummary = `روند کلی مهارت‌های شما رو به رشد و پیشرفت مداوم است. مهارت‌های عمومی و تخصصی شما رشد مثبتی را نشان می‌دهند. 📈`;
    } else if (downCount > upCount) {
      overallSummary = `برخی از مهارت‌های شما رو به کاهش رفته و نیازمند توجه، مرور چک‌لیست‌های بالینی و شرکت در برنامه‌های بازآموزی بخش می‌باشد. 📉`;
    } else {
      overallSummary = `شاخص‌های عملکردی و مهارت‌های شما در طول سال جاری در سطحی پایدار و متوازن قرار دارد. 📊`;
    }

    return {
      hasData: true,
      trends,
      overallSummary,
    };
  }, [progressChartInfo]);

  // Exam taking handlers with randomized question sampling
  const handleStartExam = (exam: ExamTemplate) => {
    let questionsToUse = [...(exam.questions || [])];

    const shouldRandomize = exam.randomizeQuestions !== false;
    const countToDisplay = exam.questionCountToDisplay;

    // 1. Shuffle questions if randomization is enabled
    if (shouldRandomize && questionsToUse.length > 1) {
      for (let i = questionsToUse.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsToUse[i], questionsToUse[j]] = [questionsToUse[j], questionsToUse[i]];
      }
    }

    // 2. Select subset if specified (e.g. 10 questions out of 30)
    if (countToDisplay && countToDisplay > 0 && countToDisplay < questionsToUse.length) {
      questionsToUse = questionsToUse.slice(0, countToDisplay);
    }

    // 3. Shuffle options for multiple-choice questions to prevent cheating
    if (shouldRandomize) {
      questionsToUse = questionsToUse.map(q => {
        if (q.type === QuestionType.MultipleChoice && q.options && q.options.length > 1) {
          const shuffledOptions = [...q.options];
          for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
          }
          return { ...q, options: shuffledOptions };
        }
        return q;
      });
    }

    setCurrentExam({
      ...exam,
      questions: questionsToUse,
    });
    setExamAnswers(new Map());
    setCurrentScreen('exam_taking');
  };

  const handleExamAnswerChange = (questionId: string, answer: string) => {
    setExamAnswers(new Map(examAnswers.set(questionId, answer)));
  };

  const handleSubmitExamClick = () => {
    if (!currentExam) return;
    if (examAnswers.size !== currentExam.questions.length) {
      if (!window.confirm('شما به تمام سوالات پاسخ نداده‌اید. آیا مایل به ثبت نهایی آزمون هستید؟')) {
        return;
      }
    }
    const answers: ExamAnswer[] = Array.from(examAnswers.entries()).map(([questionId, answer]) => ({ questionId, answer }));
    let score = 0;
    const correctableQuestions = currentExam.questions.filter(q => q.type === QuestionType.MultipleChoice);
    correctableQuestions.forEach(q => {
      if (examAnswers.get(q.id) === q.correctAnswer) {
        score++;
      }
    });
    const submission: ExamSubmission = {
      id: Date.now().toString(),
      examTemplateId: currentExam.id,
      examName: currentExam.name,
      answers,
      score,
      totalCorrectableQuestions: correctableQuestions.length,
      submissionDate: new Date().toISOString(),
      questions: currentExam.questions,
    };

    const targetMonth = selectedMonth || currentExam.month || 'عمومی';
    onSubmitExam(department.id, staffMember.id, targetMonth, activeYear, submission);
    setCurrentSubmissionResult(submission);
    setCurrentExam(null);
    setCurrentScreen('exam_result');
  };

  const handleSaveMessages = () => {
    if (!selectedMonth) return;
    onUpdateAssessmentMessages(department.id, staffMember.id, selectedMonth, activeYear, { supervisorMessage, managerMessage });
    alert('پیام‌ها با موفقیت ذخیره شدند.');
  };

  const handleEditAssessment = () => {
    if (!selectedMonth) return;
    const assessment = assessmentsByMonth.get(selectedMonth);
    if (!assessment) return;
    const templateForEditing: Partial<NamedChecklistTemplate> = {
      id: assessment.templateId || 'imported-template',
      name: 'ویرایش ارزیابی',
      minScore: assessment.minScore ?? 0,
      maxScore: assessment.maxScore ?? 4,
    };
    setActiveAssessmentTemplate(templateForEditing);
    const categoriesToEdit = JSON.parse(JSON.stringify(assessment.skillCategories));
    setAssessmentFormData(categoriesToEdit);
    setCurrentScreen('assessment_form');
  };

  const handleSaveAssessment = () => {
    if (!selectedMonth) return;
    onAddOrUpdateAssessment(department.id, staffMember.id, selectedMonth, activeYear, assessmentFormData, activeAssessmentTemplate || undefined);
    setCurrentScreen('skill_details');
  };

  const handleScoreChange = (catIndex: number, itemIndex: number, score: number) => {
    const newCategories = [...assessmentFormData];
    const category = { ...newCategories[catIndex] };
    const items = [...category.items];
    const min = activeAssessmentTemplate?.minScore ?? 0;
    const max = activeAssessmentTemplate?.maxScore ?? 4;
    const finalScore = Math.max(min, Math.min(max, isNaN(score) ? 0 : score));
    items[itemIndex] = { ...items[itemIndex], score: finalScore };
    category.items = items;
    newCategories[catIndex] = category;
    setAssessmentFormData(newCategories);
  };

  const handleChecklistUpload = async (file: File) => {
    if (!selectedMonth) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const { skills, templateInfo } = await parseFilledChecklist(file);
      onAddOrUpdateAssessment(department.id, staffMember.id, selectedMonth, activeYear, skills, templateInfo);
      setIsChecklistModalOpen(false);
      setCurrentScreen('skill_details');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'خطا در پردازش فایل اکسل.');
    } finally {
      setIsUploading(false);
    }
  };

  // Internal Back navigation
  const handleInternalBack = () => {
    switch (currentScreen) {
      case 'skill_details':
        setCurrentScreen('registered_months_scores');
        break;
      case 'assessment_form':
        setCurrentScreen('skill_details');
        break;
      case 'registered_months_scores':
      case 'summary_chart':
      case 'exam_scores_hub':
      case 'training_materials':
      case 'accreditation_materials':
      case 'needs_assessment':
      case 'work_log':
        setCurrentScreen('assessment_menu');
        break;
      case 'exam_list':
      case 'evaluation_results':
        setCurrentScreen('exam_scores_hub');
        break;
      case 'exam_taking':
      case 'exam_result':
        setCurrentScreen('exam_list');
        setCurrentExam(null);
        setCurrentSubmissionResult(null);
        break;
      case 'assessment_menu':
      default:
        onBack();
        break;
    }
  };

  // RENDER 1: MAIN USER DASHBOARD (DIRECT STAFF PORTAL)
  const renderAssessmentMenu = () => {
    const navButtonClass = `flex flex-col items-center justify-center text-center gap-3 p-6 font-semibold rounded-2xl transition-all transform hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 shadow-lg bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:ring-indigo-500 border border-slate-200 dark:border-slate-700`;

    return (
      <PageWrapper
        title="صفحه پرسنلی"
        backButtonText={userRole === UserRole.Staff ? 'خروج' : 'بازگشت به بخش'}
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
        hideBack={userRole === UserRole.Staff}
      >
        {/* Year Selector */}
        {availableYears.length > 0 && (
          <div className="mb-6 flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                پایش عملکرد سال:
              </span>
              <select
                id="year-select"
                value={activeYear}
                onChange={e => onYearChange(parseInt(e.target.value, 10))}
                className="px-3 py-1 text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 font-bold focus:ring-2 focus:ring-indigo-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ماه‌های دارای نمره: <strong>{registeredMonths.length} ماه</strong>
            </div>
          </div>
        )}

        {/* 8 Clean Core Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Scores by Month */}
          <button
            onClick={() => setCurrentScreen('registered_months_scores')}
            className={navButtonClass}
          >
            <DocumentIcon className="w-12 h-12 text-indigo-500" />
            <span className="text-lg">نمرات مهارت‌ها</span>
          </button>

          {/* 2. Improvement Plan (AI) */}
          <button
            onClick={handleOpenStaffPeriodicPlan}
            className={`${navButtonClass} bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400`}
            title="برنامه بهبود بالینی و شرح وضعیت عملکردی هوش مصنوعی طبق آخرین نمرات"
          >
            <AiIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span className="text-lg font-bold text-indigo-950 dark:text-indigo-100">برنامه بهبود</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-normal">هوش مصنوعی + خروجی Word</span>
          </button>

          {/* 3. Progress Chart */}
          <button
            onClick={() => setCurrentScreen('summary_chart')}
            className={navButtonClass}
          >
            <ChartBarIcon className="w-12 h-12 text-teal-500" />
            <span className="text-lg">نمودار پیشرفت</span>
          </button>

          {/* 4. Exams & Scores (Hub) */}
          <button
            onClick={() => setCurrentScreen('exam_scores_hub')}
            className={navButtonClass}
          >
            <ClipboardDocumentCheckIcon className="w-12 h-12 text-violet-500" />
            <span className="text-lg">آزمون و نمرات</span>
          </button>

          {/* 5. Staff Training */}
          <button
            onClick={() => setCurrentScreen('training_materials')}
            className={navButtonClass}
          >
            <AcademicCapIcon className="w-12 h-12 text-sky-500" />
            <span className="text-lg">آموزش پرسنل</span>
          </button>

          {/* 6. Accreditation */}
          <button
            onClick={() => setCurrentScreen('accreditation_materials')}
            className={navButtonClass}
          >
            <ShieldCheckIcon className="w-12 h-12 text-emerald-500" />
            <span className="text-lg">اعتباربخشی</span>
          </button>

          {/* 7. Needs Assessment */}
          <button
            onClick={() => setCurrentScreen('needs_assessment')}
            className={navButtonClass}
          >
            <LightbulbIcon className="w-12 h-12 text-amber-500" />
            <span className="text-lg">نیازسنجی</span>
          </button>

          {/* 8. Work Log (Timesheet) */}
          <button
            onClick={() => setCurrentScreen('work_log')}
            className={navButtonClass}
          >
            <ClipboardDocumentListIcon className="w-12 h-12 text-sky-500" />
            <span className="text-lg">وضعیت کارکرد</span>
          </button>
        </div>
      </PageWrapper>
    );
  };

  // RENDER 2: REGISTERED MONTHS FOR SCORES
  const renderRegisteredMonthsScores = () => {
    return (
      <PageWrapper
        title="نمرات مهارت‌ها - انتخاب ماه ثبت شده"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
            جهت مشاهده نمرات تفکیکی مهارت‌ها، یکی از ماه‌های ثبت‌شده را انتخاب کنید:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {PERSIAN_MONTHS.map(month => {
              const assessment = assessmentsByMonth.get(month);
              const hasAssessment = !!assessment && assessment.skillCategories.some(c => c.items.length > 0);

              if (!hasAssessment) {
                return (
                  <div
                    key={month}
                    className="p-4 rounded-xl text-center bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed select-none"
                    title="ارزیابی برای این ماه هنوز ثبت نشده است"
                  >
                    <span className="font-bold">{month}</span>
                    <span className="block text-xs mt-1">ثبت نشده</span>
                  </div>
                );
              }

              return (
                <button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(month);
                    setSupervisorMessage(assessment.supervisorMessage || '');
                    setManagerMessage(assessment.managerMessage || '');
                    setCurrentScreen('skill_details');
                  }}
                  className="p-4 rounded-xl text-center font-bold text-base transition-all transform hover:-translate-y-1 focus:outline-none shadow-sm bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-2 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-100"
                >
                  <span>{month}</span>
                  <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ نمرات ثبت شده
                  </span>
                </button>
              );
            })}
          </div>

          {registeredMonths.length === 0 && userRole === UserRole.Staff && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl shadow mt-6 p-6">
              <p className="text-slate-500 dark:text-slate-400">
                هنوز نمره‌ای برای ماه‌های سال {activeYear} ثبت نگردیده است. به محض تکمیل ارزیابی توسط مسئول بخش، در این قسمت قابل مشاهده خواهد بود.
              </p>
            </div>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 3: EXAM AND SCORES HUB (2 BUTTONS)
  const renderExamScoresHub = () => {
    return (
      <PageWrapper
        title="آزمون و نمرات"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="max-w-3xl mx-auto py-8">
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm">
            بخش مورد نظر خود را برای شرکت در آزمون‌های علمی یا مشاهده کارنامه و نتایج ارزیابی‌ها انتخاب کنید:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Button 1: Exams */}
            <button
              onClick={() => setCurrentScreen('exam_list')}
              className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-purple-950/40 rounded-3xl border-2 border-purple-200 dark:border-purple-800/60 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all text-center group"
            >
              <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-md mb-4 group-hover:scale-110 transition-transform">
                <ClipboardDocumentCheckIcon className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">آزمون</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                مشاهده آخرین آزمون‌های ثبت‌شده با عنوان و تاریخ ثبت، و امکان شرکت در آزمون‌های مهارتی
              </p>
              <span className="mt-4 px-4 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 rounded-full">
                ورود به بخش آزمون‌ها ←
              </span>
            </button>

            {/* Button 2: Evaluation Results */}
            <button
              onClick={() => setCurrentScreen('evaluation_results')}
              className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-teal-950/40 rounded-3xl border-2 border-teal-200 dark:border-teal-800/60 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all text-center group"
            >
              <div className="p-4 bg-teal-600 text-white rounded-2xl shadow-md mb-4 group-hover:scale-110 transition-transform">
                <ChartBarIcon className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">نتایج ارزیابی‌ها</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                کارنامه آزمون‌های گذرانده‌شده و نتایج ارزیابی‌های انجام‌شده با چک‌لیست‌های بالینی
              </p>
              <span className="mt-4 px-4 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 rounded-full">
                مشاهده نتایج و کارنامه‌ها ←
              </span>
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  };

  // RENDER 4: EXAM LIST (TAKE EXAMS)
  const renderExamList = () => {
    // Show all exams sorted by date/id
    const sortedExams = [...examTemplates].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (!isNaN(Number(a.id)) && a.id.length > 8 ? Number(a.id) : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (!isNaN(Number(b.id)) && b.id.length > 8 ? Number(b.id) : 0);
      return timeB - timeA;
    });

    return (
      <PageWrapper
        title="لیست آزمون‌ها"
        backButtonText="بازگشت به آزمون و نمرات"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-w-4xl mx-auto border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                آخرین آزمون‌های ثبت شده ({sortedExams.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نمایش عنوان آزمون و تاریخ ثبت به همراه وضعیت شرکت در آزمون
              </p>
            </div>
          </div>

          {sortedExams.length === 0 ? (
            <p className="text-center text-slate-500 py-12">هیچ آزمونی در سامانه ثبت نشده است.</p>
          ) : (
            <div className="space-y-4">
              {sortedExams.map(exam => {
                const isCompleted = submittedExamIds.has(exam.id);
                const regDate = formatJalaliDate(exam.createdAt || exam.id);

                return (
                  <div
                    key={exam.id}
                    className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{exam.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {exam.month || 'عمومی'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>تاریخ ثبت: <strong className="text-slate-700 dark:text-slate-300">{regDate}</strong></span>
                        {exam.questionCountToDisplay && exam.questionCountToDisplay < exam.questions.length ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                            🎲 {exam.questionCountToDisplay} سوال تصادفی (از میان {exam.questions.length} سوال بانک)
                          </span>
                        ) : (
                          <span>تعداد سوالات: <strong className="text-slate-700 dark:text-slate-300">{exam.questions.length} سوال</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-950 rounded-lg">
                            ✓ شرکت در آزمون تکمیل شده
                          </span>
                          <button
                            onClick={() => setCurrentScreen('evaluation_results')}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            مشاهده نتیجه
                          </button>
                        </div>
                      ) : exam.isActive === false ? (
                        <span className="px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded-xl">
                          آزمون غیرفعال است
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="px-5 py-2 font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        >
                          <span>شرکت در آزمون</span>
                          <span>←</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 5: EVALUATION RESULTS (EXAMS + CHECKLISTS)
  const renderEvaluationResults = () => {
    const checklistEvals = staffMember.checklistEvaluations || [];

    return (
      <PageWrapper
        title="نتایج ارزیابی‌ها"
        backButtonText="بازگشت به آزمون و نمرات"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Section 1: Checklist Evaluation Results */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="p-2 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded-xl">
                <ChecklistIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  نتایج ارزیابی‌های انجام‌شده با چک‌لیست ({checklistEvals.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ارزیابی‌های مهارتی ثبت‌شده توسط مسئول بخش و سوپروایزر آموزشی
                </p>
              </div>
            </div>

            {checklistEvals.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                هنوز هیچ ارزیابی چک‌لیستی برای شما ثبت نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-750 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">عنوان چک‌لیست</th>
                      <th scope="col" className="px-4 py-3 text-center">ارزیاب</th>
                      <th scope="col" className="px-4 py-3 text-center">تاریخ</th>
                      <th scope="col" className="px-4 py-3 text-center">نمره کل</th>
                      <th scope="col" className="px-4 py-3 text-center">درصد</th>
                      <th scope="col" className="px-4 py-3 text-center">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistEvals.map(ev => (
                      <tr
                        key={ev.id}
                        className="border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-850"
                      >
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {ev.templateName}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400">
                          {ev.evaluatorName}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {ev.date}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {ev.overallScore} از {ev.maxScore}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              ev.percentage >= 85
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : ev.percentage >= 70
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            %{ev.percentage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedChecklistDetail(ev)}
                            className="px-3 py-1 text-xs font-bold text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            مشاهده نمرات
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Exam Results */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-xl">
                <ClipboardDocumentCheckIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  نتایج و کارنامه آزمون‌های کتبی ({allStaffExamSubmissions.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سوابق آزمون‌های شرکت‌کرده با محاسبه دقیق پاسخ‌های صحیح
                </p>
              </div>
            </div>

            {allStaffExamSubmissions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                هنوز در هیچ آزمونی شرکت نکرده‌اید.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-750 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">نام آزمون</th>
                      <th scope="col" className="px-4 py-3 text-center">تاریخ آزمون</th>
                      <th scope="col" className="px-4 py-3 text-center">پاسخ‌های صحیح</th>
                      <th scope="col" className="px-4 py-3 text-center">درصد نمره</th>
                      <th scope="col" className="px-4 py-3 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStaffExamSubmissions.map(sub => {
                      const pct =
                        sub.totalCorrectableQuestions > 0
                          ? Math.round((sub.score / sub.totalCorrectableQuestions) * 100)
                          : 100;

                      return (
                        <tr
                          key={sub.id}
                          className="border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-850"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {sub.examName}
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            {formatJalaliDate(sub.submissionDate)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            {sub.score} از {sub.totalCorrectableQuestions}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                pct >= 80
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : pct >= 60
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              %{pct}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold">
                            {pct >= 60 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">قبول</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">نیاز به بازآموزی</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    );
  };

  // RENDER 6: PROGRESS CHART VIEW WITH DETAILED OVERALL ANALYSIS
  const renderSummaryChartView = () => {
    return (
      <PageWrapper
        title="نمودار روند پیشرفت"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-w-5xl mx-auto border border-slate-200 dark:border-slate-700">
          {progressChartInfo.data.length > 0 ? (
            <div>
              <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={progressChartInfo.data} margin={{ top: 5, right: 20, left: -20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="5 5" stroke="rgba(100, 116, 139, 0.3)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-slate-500 dark:text-slate-400"
                      angle={-45}
                      textAnchor="end"
                      height={40}
                      interval={0}
                    />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
                    <Tooltip
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '0.75rem' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value: number | null, name: string) => (value === null ? ['ثبت نشده', name] : [`${value}%`, name])}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    {progressChartInfo.categoryNames.map((catName, index) => (
                      <Line
                        key={catName}
                        type="monotone"
                        dataKey={catName}
                        name={catName}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2.5}
                        activeDot={{ r: 8 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Overall Analysis Underneath Chart */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-750 dark:to-indigo-950/20 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📊</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    تحلیل کلی وضعیت پیشرفت مهارت‌ها
                  </h3>
                </div>

                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-4">
                  {progressTrendAnalysis.overallSummary}
                </p>

                <div className="space-y-3">
                  {progressTrendAnalysis.trends.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      <span className="text-base shrink-0">
                        {t.status === 'up' ? '📈' : t.status === 'down' ? '📉' : '⚖️'}
                      </span>
                      <div>
                        <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">{t.name}:</strong>
                        <span>{t.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-12">داده‌ای برای نمایش نمودار در این سال وجود ندارد.</p>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 7: EDUCATIONAL MATERIALS (DATE PRIORITY)
  const renderTrainingMaterials = () => {
    return (
      <PageWrapper
        title="آموزش پرسنل"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-w-5xl mx-auto border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                آخرین مطالب آموزشی ثبت شده ({allTrainingMaterialsSorted.length})
              </h3>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                مرتب‌شده طبق اولویت تاریخ (جدیدترین مطالب در ابتدای لیست)
              </p>
            </div>
          </div>

          {allTrainingMaterialsSorted.length === 0 ? (
            <p className="text-center text-slate-500 py-12">هیچ محتوای آموزشی‌ای بارگذاری نشده است.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {allTrainingMaterialsSorted.map(({ material, month }) => {
                const { icon, color } = getIconForMimeType(material.type);
                const dateStr = formatJalaliDate(material.createdAt || material.id);

                return (
                  <button
                    key={material.id}
                    onClick={() => setPreviewMaterial(material)}
                    className="group flex flex-col text-right p-5 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex justify-between items-start mb-3 w-full">
                      <div className={`p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm ${color}`}>{icon}</div>
                      <div className="text-left flex flex-col items-end gap-1">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold block">
                          📅 {dateStr}
                        </span>
                        {material.type === 'article' || !!material.articleContent ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                            📝 مطلب متنی و فیلم
                          </span>
                        ) : material.type.startsWith('video/') || material.videoUrl ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                            🎥 فیلم آموزشی
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <h4 className="font-bold text-sm break-all w-full line-clamp-2" title={material.name}>
                      {material.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 flex-grow">
                      {material.description || 'برای مشاهده و مطالعه کلیک کنید'}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-between w-full">
                      <span>مشاهده محتوا</span>
                      <span>←</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 8: ACCREDITATION MATERIALS (TIME PRIORITY)
  const renderAccreditationMaterials = () => {
    return (
      <PageWrapper
        title="مطالب اعتباربخشی"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-w-5xl mx-auto border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                مطالب و سنجه‌های اعتباربخشی ({allAccreditationMaterialsSorted.length})
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                مرتب‌شده طبق اولویت زمان (جدیدترین بخشنامه‌ها و دستورالعمل‌های اعتباربخشی)
              </p>
            </div>
          </div>

          {allAccreditationMaterialsSorted.length === 0 ? (
            <p className="text-center text-slate-500 py-12">هیچ مطلبی در بخش اعتباربخشی بارگذاری نشده است.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {allAccreditationMaterialsSorted.map(material => {
                const { icon, color } = getIconForMimeType(material.type);
                const dateStr = formatJalaliDate(material.createdAt || material.id);

                return (
                  <button
                    key={material.id}
                    onClick={() => setPreviewMaterial(material)}
                    className="group flex flex-col text-right p-5 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex justify-between items-start mb-3 w-full">
                      <div className={`p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm ${color}`}>{icon}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                        {dateStr}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm break-all w-full line-clamp-2" title={material.name}>
                      {material.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 flex-grow">
                      {material.description || 'برای مشاهده کلیک کنید'}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between w-full">
                      <span>مطالعه سند</span>
                      <span>←</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 9: NEEDS ASSESSMENT (DATE & TOPIC)
  const renderNeedsAssessment = () => {
    return (
      <PageWrapper
        title="نیازسنجی و نظرسنجی"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-w-4xl mx-auto border border-slate-200 dark:border-slate-700">
          <div className="mb-6 pb-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              نیازسنجی‌های ثبت‌شده بر اساس تاریخ و موضوع ({allNeedsAssessmentTopics.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              دیدگاه‌ها و نیازهای آموزشی خود را در موضوعات تعریف‌شده مطرح نمایید.
            </p>
          </div>

          {allNeedsAssessmentTopics.length === 0 ? (
            <p className="text-center text-slate-500 py-12">هیچ موضوعی برای نیازسنجی تعریف نشده است.</p>
          ) : (
            <div className="space-y-6">
              {allNeedsAssessmentTopics.map(({ topic, month, year }) => {
                const currentResp = needsAssessmentResponses.get(topic.id) || '';

                return (
                  <div
                    key={topic.id}
                    className="bg-slate-50 dark:bg-slate-750 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {topic.title}
                      </h4>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                        ماه {month} سال {year}
                      </span>
                    </div>

                    {topic.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                        {topic.description}
                      </p>
                    )}

                    <textarea
                      id={`response-${topic.id}`}
                      value={currentResp}
                      onChange={e => handleNeedsAssessmentResponseChange(topic.id, e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="نظر، پیشنهاد یا نیاز آموزشی خود را در این بخش بنویسید..."
                    />

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleSubmitNeedsAssessmentClick(month, year)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 shadow"
                      >
                        <SaveIcon className="w-4 h-4" />
                        <span>ثبت نظر برای این موضوع</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 10: WORK LOG (MONTHLY TABLE)
  const renderWorkLogView = () => {
    const recordedWorkLogs = (staffMember.workLogs || [])
      .filter(log => log.year === activeYear)
      .sort((a, b) => PERSIAN_MONTHS.indexOf(a.month) - PERSIAN_MONTHS.indexOf(b.month));

    const totalRequired = recordedWorkLogs.reduce((acc, curr) => acc + (curr.requiredHours || 0), 0);
    const totalOvertime = recordedWorkLogs.reduce((acc, curr) => acc + (curr.overtimeHours || 0), 0);
    const totalLeave = recordedWorkLogs.reduce((acc, curr) => acc + (curr.leaveTakenInMonth || 0), 0);

    return (
      <PageWrapper
        title="وضعیت کارکرد ماهانه"
        backButtonText="بازگشت به صفحه اصلی"
        staffMember={staffMember}
        selectedMonth={null}
        currentScreen={currentScreen}
        userRole={userRole}
        handleInternalBack={handleInternalBack}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-w-4xl mx-auto border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                جدول کارکرد ماهانه پرسنل در سال {activeYear}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ساعات موظفی، اضافه کار، مرخصی‌های استفاده‌شده و مانده مرخصی طبق ماه‌های ثبت‌شده
              </p>
            </div>
          </div>

          {recordedWorkLogs.length === 0 ? (
            <p className="text-center text-slate-500 py-12">
              اطلاعات کارکرد برای ماه‌های سال {activeYear} ثبت نشده است.
            </p>
          ) : (
            <div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-750 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">ماه</th>
                      <th scope="col" className="px-4 py-3 text-center">ساعات موظفی</th>
                      <th scope="col" className="px-4 py-3 text-center">ساعات اضافه کار</th>
                      <th scope="col" className="px-4 py-3 text-center">مرخصی در ماه (روز)</th>
                      <th scope="col" className="px-4 py-3 text-center">مانده مرخصی سالانه (روز)</th>
                      <th scope="col" className="px-4 py-3 text-center">سابقه کار (سال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordedWorkLogs.map(log => (
                      <tr
                        key={log.month}
                        className="border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-850"
                      >
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {log.month}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {log.requiredHours}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-teal-600 dark:text-teal-400">
                          {log.overtimeHours}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                          {log.leaveTakenInMonth}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                          {log.annualLeaveRemaining}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                          {log.workExperienceInYears || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">مجموع ساعات موظفی سال</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalRequired} ساعت</span>
                </div>
                <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-center">
                  <span className="text-xs text-teal-600 dark:text-teal-400 block mb-1">مجموع اضافه کار سال</span>
                  <span className="text-xl font-bold text-teal-700 dark:text-teal-300">{totalOvertime} ساعت</span>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                  <span className="text-xs text-amber-600 dark:text-amber-400 block mb-1">کل مرخصی استفاده‌شده</span>
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{totalLeave} روز</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    );
  };

  // RENDER 11: SKILL DETAILS (SCORES OF A SPECIFIC MONTH)
  const renderSkillDetails = () => {
    const assessment = selectedMonth ? assessmentsByMonth.get(selectedMonth) : latestAssessment;

    return (
      <PageWrapper
        title={`نمرات مهارت‌ها`}
        backButtonText="بازگشت به انتخاب ماه"
        staffMember={staffMember}
        selectedMonth={selectedMonth || latestAssessment?.month || null}
        currentScreen={currentScreen}
        userRole={userRole}
        assessment={assessment}
        handleInternalBack={handleInternalBack}
        handleEditAssessment={handleEditAssessment}
      >
        {!assessment ? (
          <p className="text-center text-slate-500 py-10">ارزیابی برای این ماه ثبت نشده است.</p>
        ) : (
          <div>
            {/* Banner for AI Improvement (Mobile Optimized) */}
            <div className="mb-6 bg-gradient-to-br from-indigo-900 via-blue-900 to-teal-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 sm:p-3 bg-white/15 backdrop-blur-md text-amber-300 rounded-xl sm:rounded-2xl shadow-inner shrink-0 mt-0.5 sm:mt-0">
                  <AiIcon className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                      هوش مصنوعی بالینی
                    </span>
                    <span className="text-[10px] text-blue-200">
                      تحلیل ۵ رفرنس بالینی
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug">
                    برنامه بهبود عملکردی و شرح وضعیت بالینی پرسنل
                  </h3>
                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    تحلیل مهارتی طبق کتاب‌های پاتر-پری، برونر-سودارث، بوکلت مادری و سنجه‌های اعتباربخشی وزارت بهداشت
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenStaffPeriodicPlan}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto"
              >
                <AiIcon className="w-4 h-4 text-indigo-950" />
                <span>مشاهده برنامه بهبود (خروجی Word)</span>
              </button>
            </div>

            {assessment.skillCategories.map(category => (
              <SkillCategoryDisplay
                key={category.name}
                category={category}
                maxPossibleScore={assessment.maxScore}
                onGenerateSkillTraining={handleGenerateSkillTraining}
              />
            ))}

            {userRole !== UserRole.Staff && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                  <label htmlFor="supervisor-message" className="block text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                    پیام سوپروایزر آموزشی
                  </label>
                  <textarea
                    id="supervisor-message"
                    rows={4}
                    value={supervisorMessage}
                    onChange={e => setSupervisorMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="پیام خود را اینجا وارد کنید..."
                  />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                  <label htmlFor="manager-message" className="block text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                    پیام مسئول بخش
                  </label>
                  <textarea
                    id="manager-message"
                    rows={4}
                    value={managerMessage}
                    onChange={e => setManagerMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="پیام خود را اینجا وارد کنید..."
                  />
                </div>
                <div className="md:col-span-2 text-center">
                  <button onClick={handleSaveMessages} className="inline-flex items-center gap-2 px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                    <SaveIcon className="w-5 h-5" /> ذخیره پیام‌ها
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageWrapper>
    );
  };

  // Route screens
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'assessment_menu':
        return renderAssessmentMenu();
      case 'registered_months_scores':
        return renderRegisteredMonthsScores();
      case 'skill_details':
        return renderSkillDetails();
      case 'summary_chart':
        return renderSummaryChartView();
      case 'exam_scores_hub':
        return renderExamScoresHub();
      case 'exam_list':
        return renderExamList();
      case 'evaluation_results':
        return renderEvaluationResults();
      case 'training_materials':
        return renderTrainingMaterials();
      case 'accreditation_materials':
        return renderAccreditationMaterials();
      case 'needs_assessment':
        return renderNeedsAssessment();
      case 'work_log':
        return renderWorkLogView();
      case 'exam_taking':
        if (!currentExam) return null;
        const totalQuestions = currentExam.questions.length;
        const answeredCount = examAnswers.size;
        const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-7 max-w-3xl mx-auto border border-slate-200 dark:border-slate-700">
            {/* Exam Header */}
            <div className="pb-5 mb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {currentExam.name}
                </h3>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {answeredCount} از {totalQuestions} سوال پاسخ داده شده
                </span>
              </div>

              {/* Anti-cheating & Random Sampling Notice */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 flex items-center gap-2 mb-3">
                <span className="text-base">🎲</span>
                <span className="leading-relaxed">
                  <strong>چیدمان و گزینش تصادفی سوالات:</strong> این آزمون به صورت هوشمند از بانک سوالات گزینش شده و ترتیب سوالات و گزینه‌ها برای هر پرسنل متفاوت است تا از یکنواختی سوالات و امکان تقلب پیشگیری شود.
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-7">
              {currentExam.questions.map((q, index) => {
                const selectedVal = examAnswers.get(q.id);
                const isAnswered = selectedVal !== undefined && selectedVal !== '';

                return (
                  <div
                    key={q.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isAnswered
                        ? 'border-purple-200 dark:border-purple-800/80 bg-purple-50/20 dark:bg-purple-950/10'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 shrink-0 rounded-xl bg-purple-600 text-white font-mono font-bold flex items-center justify-center text-xs shadow-xs mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                          {q.text}
                        </p>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          {q.type === QuestionType.MultipleChoice ? 'سوال چهارگزینه‌ای' : 'سوال تشریحی'}
                        </span>
                      </div>
                    </div>

                    {q.type === QuestionType.MultipleChoice ? (
                      <div className="space-y-2.5 pr-0 sm:pr-9">
                        {q.options?.map((opt, optIndex) => {
                          const isSelected = selectedVal === opt;
                          return (
                            <label
                              key={optIndex}
                              onClick={() => handleExamAnswerChange(q.id, opt)}
                              className={`flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-md font-bold'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                                  isSelected
                                    ? 'border-white bg-white text-purple-600'
                                    : 'border-slate-300 dark:border-slate-600 bg-transparent'
                                }`}
                              >
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="pr-0 sm:pr-9">
                        <textarea
                          value={selectedVal || ''}
                          onChange={e => handleExamAnswerChange(q.id, e.target.value)}
                          rows={4}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                          placeholder="پاسخ تشریحی خود را اینجا بنویسید..."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-slate-500 order-2 sm:order-1">
                تعداد سوالات باقیمانده: <strong>{totalQuestions - answeredCount} سوال</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                <button
                  onClick={() => {
                    if (window.confirm('آیا از خروج از صفحه آزمون اطمینان دارید؟ تغییرات ذخیره نخواهد شد.')) {
                      setCurrentScreen('exam_list');
                    }
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 text-xs sm:text-sm transition text-center"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSubmitExamClick}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-2.5 font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-lg text-xs sm:text-sm transition-all"
                >
                  <span>✓ ثبت نهایی پاسخ‌ها</span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'exam_result':
        if (!currentSubmissionResult) return null;
        const { score, totalCorrectableQuestions, examName } = currentSubmissionResult;
        const percentage = totalCorrectableQuestions > 0 ? (score / totalCorrectableQuestions) * 100 : 100;
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center max-w-xl mx-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold mb-3">نتیجه آزمون: {examName}</h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
              تعداد پاسخ‌های صحیح شما: <span className="font-bold text-purple-600">{score}</span> از{' '}
              <span className="font-bold">{totalCorrectableQuestions}</span> سوال قابل تصحیح.
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 mb-4">
              <div
                className="h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold"
                style={{ width: `${percentage}%` }}
              >
                %{percentage.toFixed(1)}
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setCurrentScreen('exam_list')}
                className="px-5 py-2 font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700"
              >
                لیست آزمون‌ها
              </button>
              <button
                onClick={() => setCurrentScreen('evaluation_results')}
                className="px-5 py-2 font-semibold text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-xl"
              >
                کارنامه ارزیابی‌ها
              </button>
            </div>
          </div>
        );
      case 'assessment_form':
        if (!selectedMonth || !activeAssessmentTemplate) return renderAssessmentMenu();
        return (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <div>
                <h2 className="text-3xl font-bold">فرم ارزیابی عملکرد - {selectedMonth}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  پرسنل: {staffMember.name} | قالب: {activeAssessmentTemplate.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInternalBack}
                  className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                  <BackIcon className="w-5 h-5" /> انصراف
                </button>
                <button
                  onClick={handleSaveAssessment}
                  className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <SaveIcon className="w-5 h-5" /> ذخیره ارزیابی
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                برای هر مهارت، نمره‌ای بین <span className="font-bold">{activeAssessmentTemplate.minScore}</span> تا{' '}
                <span className="font-bold">{activeAssessmentTemplate.maxScore}</span> وارد کنید.
              </p>
              {assessmentFormData.map((category, catIndex) => (
                <div key={catIndex} className="mb-8 last:mb-0">
                  <h3 className="text-xl font-bold mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">{category.name}</h3>
                  <div className="space-y-4">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <label htmlFor={`score-${catIndex}-${itemIndex}`} className="md:col-span-2 text-slate-700 dark:text-slate-300">
                          {item.description}
                        </label>
                        <input
                          id={`score-${catIndex}-${itemIndex}`}
                          type="number"
                          value={item.score}
                          onChange={e => handleScoreChange(catIndex, itemIndex, parseFloat(e.target.value))}
                          min={activeAssessmentTemplate.minScore}
                          max={activeAssessmentTemplate.maxScore}
                          step="0.1"
                          className="w-full md:w-32 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return renderAssessmentMenu();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* News Carousel */}
      {currentScreen === 'assessment_menu' && newsBanners && newsBanners.length > 0 && (
        <div className="mb-8 max-w-5xl mx-auto">
          <NewsCarousel banners={newsBanners} />
        </div>
      )}

      {renderCurrentScreen()}

      {/* Media Preview Modal */}
      {previewMaterial && (
        <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial} />
      )}

      {/* AI Periodic Plan Modal (1, 3, 6, 12 months) with Word Export */}
      <PeriodicPlanModal
        isOpen={isPeriodicPlanModalOpen}
        onClose={() => setIsPeriodicPlanModalOpen(false)}
        title="برنامه بهبود و توانمندسازی بالینی (هوش مصنوعی)"
        targetName={staffMember.name}
        departmentName={department.name}
        roleDescription={`پرسنل: ${staffMember.name} (${staffMember.title || 'کارشناس پرستاری'})`}
        content={periodicPlanContent}
        isLoading={isPeriodicPlanLoading}
        onRegenerate={handleOpenStaffPeriodicPlan}
        activeYear={activeYear}
      />

      {/* AI Skill-Specific Training Modal */}
      <SkillAiTrainingModal
        isOpen={skillTrainingModalState.isOpen}
        onClose={() => setSkillTrainingModalState(prev => ({ ...prev, isOpen: false }))}
        skillName={skillTrainingModalState.skillName}
        categoryName={skillTrainingModalState.categoryName}
        departmentName={department.name}
        staffName={staffMember.name}
        currentScore={skillTrainingModalState.currentScore}
        maxScore={skillTrainingModalState.maxScore ?? 4}
        userRole={userRole}
      />

      {/* Modal for viewing details of a Checklist Evaluation */}
      {selectedChecklistDetail && (
        <Modal
          isOpen={!!selectedChecklistDetail}
          onClose={() => setSelectedChecklistDetail(null)}
          title={`کارنامه ارزیابی با چک‌لیست: ${selectedChecklistDetail.templateName}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div className="flex flex-wrap justify-between items-center p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-xs gap-2 border border-teal-200 dark:border-teal-800">
              <div>
                ارزیاب: <strong>{selectedChecklistDetail.evaluatorName}</strong>
              </div>
              <div>
                تاریخ: <strong>{selectedChecklistDetail.date}</strong>
              </div>
              <div>
                نمره: <strong>{selectedChecklistDetail.overallScore} از {selectedChecklistDetail.maxScore}</strong>
              </div>
              <div className="text-teal-700 dark:text-teal-300 font-bold">
                درصد موفقیت: %{selectedChecklistDetail.percentage}
              </div>
            </div>

            {selectedChecklistDetail.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <strong>یادداشت ارزیاب:</strong> {selectedChecklistDetail.notes}
              </div>
            )}

            <div className="space-y-3">
              {selectedChecklistDetail.categories.map((cat, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                  <div className="flex justify-between items-center font-bold text-sm text-slate-800 dark:text-slate-200 mb-2 pb-1 border-b border-slate-100 dark:border-slate-750">
                    <span>{cat.name}</span>
                    <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">
                      {cat.categoryScore} / {cat.categoryMaxScore}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {cat.items.map((it, iIdx) => (
                      <div
                        key={iIdx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold">{iIdx + 1}.</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {it.description}
                            </span>
                            {it.responseType && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {it.responseType === 'qualitative' ? '⭐ کیفی' : it.responseType === 'multiple_choice' ? '🔘 تستی' : '📝 تشریحی'}
                              </span>
                            )}
                          </div>
                          {it.selectedOption && (
                            <p className="text-xs text-teal-700 dark:text-teal-300 pr-5">
                              پاسخ ارزیابی: <strong className="font-bold">{it.selectedOption}</strong>
                            </p>
                          )}
                          {it.comment && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 pr-5">
                              توضیحات و بازخورد: {it.comment}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-xs bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300 shrink-0 self-end sm:self-center">
                          {it.score} از {it.maxScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal for adding assessment if manager enters a month without assessment */}
      <Modal isOpen={isChecklistModalOpen} onClose={() => setIsChecklistModalOpen(false)} title={`ثبت ارزیابی برای ${selectedMonth}`}>
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">یک روش برای ثبت ارزیابی انتخاب کنید:</p>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <h3 className="font-bold mb-2">۱. استفاده از قالب‌های آماده</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              یکی از قالب‌های تعریف‌شده در سیستم را انتخاب کنید تا فرم ارزیابی بر اساس آن ساخته شود.
            </p>
            <div className="space-y-2">
              {checklistTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    const newCategoriesFromTemplate: SkillCategory[] = template.categories.map(catTemplate => ({
                      name: catTemplate.name,
                      items: catTemplate.items.map(itemTemplate => ({
                        description: itemTemplate.description,
                        score: template.minScore ?? 0,
                      })),
                    }));
                    setAssessmentFormData(newCategoriesFromTemplate);
                    setActiveAssessmentTemplate(template);
                    setIsChecklistModalOpen(false);
                    setCurrentScreen('assessment_form');
                  }}
                  className="w-full text-right p-3 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-600"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <h3 className="font-bold mb-2">۲. بارگذاری فایل اکسل تکمیل‌شده</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              یک فایل اکسل که بر اساس یکی از قالب‌ها تکمیل و نمره‌دهی شده است را بارگذاری کنید.
            </p>
            {isUploading && <p className="text-center text-indigo-500">در حال پردازش فایل...</p>}
            {uploadError && <p className="text-center text-red-500 my-2">{uploadError}</p>}
            <FileUploader onFileUpload={handleChecklistUpload} accept=".xlsx" title="آپلود چک‌لیست تکمیل‌شده" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffMemberView;
