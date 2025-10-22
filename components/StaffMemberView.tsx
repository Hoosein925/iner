import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Department, StaffMember, SkillCategory, Assessment, NamedChecklistTemplate, ExamTemplate, Question, QuestionType, ExamSubmission, ExamAnswer, UserRole, MonthlyTraining, TrainingMaterial, NewsBanner, MonthlyNeedsAssessment } from '../types';
import { generateImprovementPlan } from '../services/geminiService';
import SkillCategoryDisplay from './SkillCategoryDisplay';
import SuggestionModal from './SuggestionModal';
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
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import FileUploader from './FileUploader';
import { parseFilledChecklist } from '../services/excelParser';

interface StaffMemberViewProps {
  department: Department;
  staffMember: StaffMember;
  onBack: () => void;
  onAddOrUpdateAssessment: (departmentId: string, staffId: string, month: string, year: number, skills: SkillCategory[], template?: Partial<NamedChecklistTemplate>) => void;
  onUpdateAssessmentMessages: (departmentId: string, staffId: string, month: string, year: number, messages: { supervisorMessage: string; managerMessage: string; }) => void;
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

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const CHART_COLORS = ['#3b82f6', '#16a34a', '#f97316', '#dc2626', '#8b5cf6', '#db2777'];

type ViewMode = 'month_selection' | 'assessment_form' | 'assessment_result';
type AssessmentResultView = 'details' | 'summary' | 'exam_list' | 'exam_taking' | 'exam_result' | 'training_materials' | 'accreditation_materials' | 'needs_assessment';

const getIconForMimeType = (type: string): { icon: React.ReactNode, color: string } => {
    if (type.startsWith('image/')) return { icon: <ImageIcon className="w-10 h-10" />, color: 'text-blue-500' };
    if (type.startsWith('video/')) return { icon: <VideoIcon className="w-10 h-10" />, color: 'text-red-500' };
    if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-10 h-10" />, color: 'text-purple-500' };
    if (type === 'application/pdf') return { icon: <PdfIcon className="w-10 h-10" />, color: 'text-orange-500' };
    return { icon: <DocumentIcon className="w-10 h-10" />, color: 'text-slate-500' };
};

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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [suggestionContent, setSuggestionContent] = useState<string | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [supervisorMessage, setSupervisorMessage] = useState('');
  const [managerMessage, setManagerMessage] = useState('');
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('month_selection');
  const [assessmentSubView, setAssessmentSubView] = useState<AssessmentResultView>('details');
  const [assessmentFormData, setAssessmentFormData] = useState<SkillCategory[]>([]);
  const [activeAssessmentTemplate, setActiveAssessmentTemplate] = useState<Partial<NamedChecklistTemplate> | null>(null);

  // Exam state
  const [currentExam, setCurrentExam] = useState<ExamTemplate | null>(null);
  const [examAnswers, setExamAnswers] = useState<Map<string, string>>(new Map());
  const [currentSubmissionResult, setCurrentSubmissionResult] = useState<ExamSubmission | null>(null);
  
  // Preview State
  const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);

  // Needs Assessment State
  const [needsAssessmentResponses, setNeedsAssessmentResponses] = useState<Map<string, string>>(new Map());

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const assessmentsByMonth = useMemo(() => {
    const map = new Map<string, Assessment>();
    staffMember.assessments
      .filter(a => a.year === activeYear)
      .forEach(a => map.set(a.month, a));
    return map;
  }, [staffMember.assessments, activeYear]);

  const needsAssessmentTopicsForMonth = useMemo(() => {
    if (!selectedMonth) return [];
    return needsAssessments
      .filter(na => na.year === activeYear)
      .find(na => na.month === selectedMonth)?.topics || [];
  }, [needsAssessments, selectedMonth, activeYear]);

  useEffect(() => {
    if (assessmentSubView === 'needs_assessment' && needsAssessmentTopicsForMonth.length > 0) {
        const initialResponses = new Map<string, string>();
        needsAssessmentTopicsForMonth.forEach(topic => {
            const existingResponse = topic.responses.find(r => r.staffId === staffMember.id);
            if (existingResponse) {
                initialResponses.set(topic.id, existingResponse.response);
            }
        });
        setNeedsAssessmentResponses(initialResponses);
    }
  }, [assessmentSubView, needsAssessmentTopicsForMonth, staffMember.id]);

  const handleNeedsAssessmentResponseChange = (topicId: string, response: string) => {
    setNeedsAssessmentResponses(new Map(needsAssessmentResponses.set(topicId, response)));
  };

  const handleSubmitNeedsAssessmentClick = () => {
      if (!selectedMonth) return;
      onSubmitNeedsAssessmentResponse(department.id, staffMember.id, selectedMonth, activeYear, needsAssessmentResponses);
      alert('نظرات شما با موفقیت ثبت شد.');
      setAssessmentSubView('summary');
  };

  const handleGetComprehensiveSuggestions = () => {
    if (!selectedMonth) return;
    const assessment = assessmentsByMonth.get(selectedMonth);
    if (!assessment) return;
    const maxScore = assessment.maxScore ?? 4;

    const weakSkillsByCateogry = assessment.skillCategories
      .map(cat => ({
        categoryName: cat.name,
        skills: cat.items.filter(item => item.score < maxScore)
      }))
      .filter(cat => cat.skills.length > 0);
    
    if (weakSkillsByCateogry.length === 0) {
        alert("این پرسنل در تمام مهارت‌ها نمره کامل کسب کرده است.");
        return;
    }

    setIsSuggestionModalOpen(true);
    setIsSuggestionLoading(true);
    setSuggestionContent(null);

    setTimeout(() => {
        const result = generateImprovementPlan(
          staffMember, 
          weakSkillsByCateogry,
          assessment.supervisorMessage,
          assessment.managerMessage
        );
        setSuggestionContent(result);
        setIsSuggestionLoading(false);
    }, 50);
};

  const hasWeakSkillsInSelectedMonth = useMemo(() => {
    if (!selectedMonth) return false;
    const assessment = assessmentsByMonth.get(selectedMonth);
    if (!assessment) return false;
    const maxScore = assessment.maxScore ?? 4;
    return assessment.skillCategories.some(cat => cat.items.some(item => item.score < maxScore));
  }, [selectedMonth, assessmentsByMonth]);

  const progressChartInfo = useMemo(() => {
    const allCategoryNames = new Set<string>();
    staffMember.assessments.forEach(ass => ass.skillCategories.forEach(cat => allCategoryNames.add(cat.name)));
    const categoryNames = Array.from(allCategoryNames);

    const data = staffMember.assessments
      .filter(assessment => assessment.year === activeYear && PERSIAN_MONTHS.includes(assessment.month))
      .map(assessment => {
      const scores: { [key: string]: any } = { name: assessment.month };
      const maxPossibleScore = assessment.maxScore ?? 4;
      
      assessment.skillCategories.forEach(cat => {
          const totalScore = cat.items.reduce((sum, item) => sum + item.score, 0);
          const maxScore = cat.items.length * maxPossibleScore;
          scores[cat.name] = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(1)) : null;
      });

      // Ensure all categories are present for this month, even if with a null score
      categoryNames.forEach(name => {
          if (!(name in scores)) {
              scores[name] = null;
          }
      });

      return scores;
    }).sort((a, b) => PERSIAN_MONTHS.indexOf(a.name as string) - PERSIAN_MONTHS.indexOf(b.name as string));
    
    return { data, categoryNames };
  }, [staffMember.assessments, activeYear]);

  const handleSaveMessages = () => {
    if (!selectedMonth) return;
    onUpdateAssessmentMessages(department.id, staffMember.id, selectedMonth, activeYear, {
        supervisorMessage,
        managerMessage
    });
    alert('پیام ها با موفقیت ذخیره شدند.');
  };
  
  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    const assessment = assessmentsByMonth.get(month);

    // Allow staff to view the result page even without an assessment,
    // to access the training materials archive.
    if (userRole === UserRole.Staff) {
        setViewMode('assessment_result');
        setAssessmentSubView('summary');
        setSupervisorMessage(assessment?.supervisorMessage || '');
        setManagerMessage(assessment?.managerMessage || '');
        return;
    }

    // For other roles (Admin, Supervisor, Manager)
    if (assessment) {
        setViewMode('assessment_result');
        setAssessmentSubView('details');
        setSupervisorMessage(assessment.supervisorMessage || '');
        setManagerMessage(assessment.managerMessage || '');
    } else {
        // No assessment exists, prompt to create one.
        if (!checklistTemplates || checklistTemplates.length === 0) {
            alert("هیچ قالب چک لیستی برای این بیمارستان تعریف نشده است. لطفا ابتدا از صفحه بخش‌ها، یک قالب چک لیست بسازید.");
            setSelectedMonth(null);
            return;
        }
        setIsChecklistModalOpen(true);
    }
  };

  const handleStartAssessmentWithTemplate = (template: NamedChecklistTemplate) => {
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
    setViewMode('assessment_form');
  };

  const handleSaveAssessment = () => {
    if(!selectedMonth) return;
    onAddOrUpdateAssessment(department.id, staffMember.id, selectedMonth, activeYear, assessmentFormData, activeAssessmentTemplate || undefined);
    setViewMode('assessment_result');
    setAssessmentSubView('details');
  };

  const handleEditAssessment = () => {
    if (!selectedMonth) return;
    const assessment = assessmentsByMonth.get(selectedMonth);
    if (!assessment) return;

    // Reconstruct a temporary template to hold the scoring rules for the form
    const templateForEditing: Partial<NamedChecklistTemplate> = {
        id: assessment.templateId || 'imported-template',
        name: 'Editing Assessment',
        minScore: assessment.minScore ?? 0,
        maxScore: assessment.maxScore ?? 4,
    };
    setActiveAssessmentTemplate(templateForEditing);

    const categoriesToEdit = JSON.parse(JSON.stringify(assessment.skillCategories));
    
    setAssessmentFormData(categoriesToEdit);
    setViewMode('assessment_form');
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
  
  const handleStartExam = (exam: ExamTemplate) => {
    setCurrentExam(exam);
    setExamAnswers(new Map());
    setAssessmentSubView('exam_taking');
  };

  const handleExamAnswerChange = (questionId: string, answer: string) => {
    setExamAnswers(new Map(examAnswers.set(questionId, answer)));
  };

  const handleSubmitExamClick = () => {
    if (!currentExam) return;
    if (examAnswers.size !== currentExam.questions.length) {
      if(!window.confirm('شما به تمام سوالات پاسخ نداده‌اید. آیا مایل به ثبت آزمون هستید؟')) {
        return;
      }
    }

    const answers: ExamAnswer[] = Array.from(examAnswers.entries()).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    let score = 0;
    const correctableQuestions = currentExam.questions.filter(q => q.type === QuestionType.MultipleChoice);
    correctableQuestions.forEach(q => {
      const userAnswer = examAnswers.get(q.id);
      if (userAnswer === q.correctAnswer) {
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
      questions: currentExam.questions, // Snapshot
    };
    
    onSubmitExam(department.id, staffMember.id, selectedMonth!, activeYear, submission);
    
    setCurrentSubmissionResult(submission);
    setCurrentExam(null);
    setAssessmentSubView('exam_result');
  };

  const handleChecklistUpload = async (file: File) => {
    if (!selectedMonth) return;
    setIsUploading(true);
    setUploadError(null);
    try {
        const { skills, templateInfo } = await parseFilledChecklist(file);
        onAddOrUpdateAssessment(department.id, staffMember.id, selectedMonth, activeYear, skills, templateInfo);
        setIsChecklistModalOpen(false);
    } catch (err) {
        setUploadError(err instanceof Error ? err.message : "خطا در پردازش فایل.");
    } finally {
        setIsUploading(false);
    }
};


  const handleInternalBack = () => {
    if (viewMode === 'assessment_form') {
        setViewMode('month_selection');
        setSelectedMonth(null);
        setAssessmentFormData([]);
        setActiveAssessmentTemplate(null);
    } else if (viewMode === 'assessment_result') {
        if (['exam_taking', 'exam_result'].includes(assessmentSubView)) {
            setAssessmentSubView('exam_list');
            setCurrentExam(null);
            setCurrentSubmissionResult(null);
        } else {
            setViewMode('month_selection');
            setSelectedMonth(null);
        }
    }
  }

  const renderMonthSelection = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold">انتخاب ماه برای {userRole === UserRole.Staff ? 'مشاهده عملکرد' : 'ثبت یا مشاهده عملکرد'}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
            {userRole === UserRole.Staff ? 'ماه مورد نظر خود را برای مشاهده نتایج ارزیابی، آزمون‌ها و مطالب آموزشی انتخاب کنید.' : 'برای ثبت ارزیابی جدید یا مشاهده ارزیابی‌های قبلی، ماه مورد نظر را انتخاب کنید.'}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {PERSIAN_MONTHS.map(month => {
          const assessment = assessmentsByMonth.get(month);
          const hasAssessment = !!assessment && assessment.skillCategories.some(c => c.items.length > 0);
          return (
            <button
              key={month}
              onClick={() => handleMonthSelect(month)}
              className={`p-4 rounded-lg text-center font-semibold text-lg transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${hasAssessment
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800 focus:ring-emerald-500'
                  : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-indigo-500'}`}
            >
              {month}
              {hasAssessment && <span className="block text-xs font-normal mt-1">(ثبت شده)</span>}
            </button>
          )
        })}
      </div>
    </div>
  );

  const renderAssessmentForm = () => {
    if (!selectedMonth || !activeAssessmentTemplate) return null;
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
                        <BackIcon className="w-5 h-5" />
                        انصراف
                    </button>
                    <button
                        onClick={handleSaveAssessment}
                        className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                        <SaveIcon className="w-5 h-5"/>
                        ذخیره ارزیابی
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    برای هر مهارت، نمره‌ای بین <span className="font-bold">{activeAssessmentTemplate.minScore}</span> تا <span className="font-bold">{activeAssessmentTemplate.maxScore}</span> وارد کنید.
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
                                        className="w-full md:w-32 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };
  
  const renderAssessmentResult = () => {
    if (!selectedMonth) return null;
    const assessment = assessmentsByMonth.get(selectedMonth);

    const navButtonClass = (view: AssessmentResultView) => `flex-grow sm:flex-grow-0 inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 ${
        assessmentSubView === view
        ? 'bg-indigo-600 text-white shadow focus:ring-indigo-500'
        : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-slate-500'
    }`;
    
    // Training material logic
    const generalMaterials = trainingMaterials.find(t => t.month === 'عمومی')?.materials || [];
    const monthSpecificMaterials = trainingMaterials.find(t => t.month === selectedMonth)?.materials || [];
    const allTrainingMaterials = [...generalMaterials, ...monthSpecificMaterials];

    // Exam logic
    const generalExams = examTemplates.filter(t => t.month === 'عمومی' || !t.month);
    const monthSpecificExams = examTemplates.filter(t => t.month === selectedMonth);
    const allExamsForMonth = [...generalExams, ...monthSpecificExams];
    const examSubmissionsForMonth = assessment?.examSubmissions || [];
    const submittedExamIds = new Set(examSubmissionsForMonth.map(s => s.examTemplateId));
    
    const renderSubView = () => {
        switch (assessmentSubView) {
            case 'details':
                if (!assessment) return <p className="text-center text-slate-500 py-10">ارزیابی برای این ماه ثبت نشده است.</p>
                return (
                    <div>
                        {assessment.skillCategories.map((category) => (
                            <SkillCategoryDisplay key={category.name} category={category} maxPossibleScore={assessment.maxScore} />
                        ))}
                        {userRole !== UserRole.Staff && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                                    <label htmlFor="supervisor-message" className="block text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">پیام سوپروایزر آموزشی</label>
                                    <textarea
                                    id="supervisor-message"
                                    rows={4}
                                    value={supervisorMessage}
                                    onChange={(e) => setSupervisorMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="پیام خود را اینجا وارد کنید..."
                                    />
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                                    <label htmlFor="manager-message" className="block text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">پیام مسئول بخش</label>
                                    <textarea
                                    id="manager-message"
                                    rows={4}
                                    value={managerMessage}
                                    onChange={(e) => setManagerMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="پیام خود را اینجا وارد کنید..."
                                    />
                                </div>
                                <div className="md:col-span-2 text-center">
                                    <button
                                        onClick={handleSaveMessages}
                                        className="inline-flex items-center gap-2 px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                                    >
                                        <SaveIcon className="w-5 h-5"/>
                                        ذخیره پیام‌ها
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            
            case 'summary':
                 return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold mb-4">نمودار روند پیشرفت ماهانه</h3>
                        {progressChartInfo.data.length > 0 ? (
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={progressChartInfo.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                                            formatter={(value: number | null, name: string) => value === null ? ["ثبت نشده", name] : [`${value}%`, name]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                                        {progressChartInfo.categoryNames.map((catName, index) => (
                                            <Line key={catName} type="monotone" dataKey={catName} name={catName} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} activeDot={{ r: 8 }} connectNulls />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-10">داده‌ای برای نمایش نمودار در این سال وجود ندارد.</p>
                        )}
                    </div>
                );

            case 'exam_list':
                return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold mb-4">آزمون‌های ماه {selectedMonth}</h3>
                        {allExamsForMonth.length === 0 ? (
                             <p className="text-center text-slate-500 py-10">هیچ آزمونی برای این ماه تعریف نشده است.</p>
                        ) : (
                            <div className="space-y-4">
                                {allExamsForMonth.map(exam => (
                                    <div key={exam.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{exam.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{exam.questions.length} سوال</p>
                                        </div>
                                        {submittedExamIds.has(exam.id) ? (
                                            <span className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900 rounded-full">تکمیل شده</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleStartExam(exam)}
                                                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                            >
                                                شروع آزمون
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            
            case 'exam_taking':
                if (!currentExam) return null;
                return (
                     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold mb-1">{currentExam.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">به سوالات زیر پاسخ دهید.</p>
                        <div className="space-y-8">
                            {currentExam.questions.map((q, index) => (
                                <div key={q.id}>
                                    <p className="font-semibold mb-3">{index + 1}. {q.text}</p>
                                    {q.type === QuestionType.MultipleChoice ? (
                                        <div className="space-y-2 pr-4">
                                            {q.options?.map((opt, optIndex) => (
                                                <label key={optIndex} className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`question-${q.id}`}
                                                        value={opt}
                                                        checked={examAnswers.get(q.id) === opt}
                                                        onChange={(e) => handleExamAnswerChange(q.id, e.target.value)}
                                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={examAnswers.get(q.id) || ''}
                                            onChange={(e) => handleExamAnswerChange(q.id, e.target.value)}
                                            rows={5}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="پاسخ خود را اینجا بنویسید..."
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                         <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                             <button onClick={() => setAssessmentSubView('exam_list')} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">انصراف</button>
                             <button onClick={handleSubmitExamClick} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">ثبت نهایی آزمون</button>
                         </div>
                    </div>
                );
            case 'exam_result':
                if (!currentSubmissionResult) return null;
                const { score, totalCorrectableQuestions, examName } = currentSubmissionResult;
                const percentage = totalCorrectableQuestions > 0 ? (score / totalCorrectableQuestions) * 100 : 100;
                return (
                     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
                        <h3 className="text-3xl font-bold mb-4">نتیجه آزمون: {examName}</h3>
                        <p className="text-xl text-slate-600 dark:text-slate-300 mb-6">
                            تعداد پاسخ‌های صحیح شما: <span className="font-bold text-indigo-500">{score}</span> از <span className="font-bold">{totalCorrectableQuestions}</span> سوال قابل تصحیح.
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 mb-2">
                            <div
                                className="h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold"
                                style={{ width: `${percentage}%` }}
                            >
                                {percentage.toFixed(1)}%
                            </div>
                        </div>
                        <button onClick={() => setAssessmentSubView('exam_list')} className="mt-8 px-6 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">بازگشت به لیست آزمون‌ها</button>
                     </div>
                );
            
            case 'training_materials':
                return (
                     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold mb-4">آرشیو آموزش پرسنل - {selectedMonth}</h3>
                         {allTrainingMaterials.length === 0 ? (
                             <p className="text-center text-slate-500 py-10">هیچ محتوای آموزشی برای این ماه بارگذاری نشده است.</p>
                        ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {allTrainingMaterials.map(material => {
                                    const { icon, color } = getIconForMimeType(material.type);
                                    return (
                                        <button
                                            key={material.id}
                                            onClick={() => setPreviewMaterial(material)}
                                            className="group flex flex-col text-right p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200"
                                        >
                                            <div className={`mb-3 ${color}`}>{icon}</div>
                                            <h4 className="font-bold text-sm break-all w-full truncate" title={material.name}>{material.name}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex-grow">
                                                {material.description || 'برای مشاهده کلیک کنید'}
                                            </p>
                                        </button>
                                    );
                                })}
                             </div>
                        )}
                    </div>
                );
            
            case 'accreditation_materials':
                 return (
                     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold mb-4">مطالب اعتباربخشی</h3>
                         {accreditationMaterials.length === 0 ? (
                             <p className="text-center text-slate-500 py-10">هیچ مطلبی در این بخش بارگذاری نشده است.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {accreditationMaterials.map(material => {
                                    const { icon, color } = getIconForMimeType(material.type);
                                    return (
                                        <button
                                            key={material.id}
                                            onClick={() => setPreviewMaterial(material)}
                                            className="group flex flex-col text-right p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200"
                                        >
                                            <div className={`mb-3 ${color}`}>{icon}</div>
                                            <h4 className="font-bold text-sm break-all w-full truncate" title={material.name}>{material.name}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex-grow">
                                                {material.description || 'برای مشاهده کلیک کنید'}
                                            </p>
                                        </button>
                                    );
                                })}
                             </div>
                        )}
                    </div>
                );
            case 'needs_assessment':
                return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold mb-4">فرم نیازسنجی و نظرسنجی - {selectedMonth}</h3>
                        {needsAssessmentTopicsForMonth.length === 0 ? (
                            <p className="text-center text-slate-500 py-10">هیچ موضوعی برای نظرسنجی در این ماه تعریف نشده است.</p>
                        ) : (
                            <div className="space-y-6">
                                {needsAssessmentTopicsForMonth.map(topic => (
                                    <div key={topic.id} className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <label htmlFor={`response-${topic.id}`} className="block text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                            {topic.title}
                                        </label>
                                        {topic.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{topic.description}</p>
                                        )}
                                        <textarea
                                            id={`response-${topic.id}`}
                                            value={needsAssessmentResponses.get(topic.id) || ''}
                                            onChange={(e) => handleNeedsAssessmentResponseChange(topic.id, e.target.value)}
                                            rows={5}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="نظر یا پیشنهاد خود را اینجا بنویسید..."
                                        />
                                    </div>
                                ))}
                                <div className="text-center mt-8">
                                    <button
                                        onClick={handleSubmitNeedsAssessmentClick}
                                        className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                                    >
                                        <SaveIcon className="w-5 h-5"/>
                                        ثبت نهایی نظرات
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    }

    return (
      <div>
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{staffMember.name}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{staffMember.title} - بخش {department.name}</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleInternalBack}
                    className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                    <BackIcon className="w-5 h-5" />
                    انتخاب ماه
                </button>
                {userRole !== UserRole.Staff && assessment && (
                     <button
                        onClick={handleEditAssessment}
                        className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600"
                    >
                        <EditIcon className="w-5 h-5"/>
                        ویرایش ارزیابی
                    </button>
                )}
                {assessment && (
                    <button
                        onClick={handleGetComprehensiveSuggestions}
                        disabled={!hasWeakSkillsInSelectedMonth}
                        className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AiIcon className="w-5 h-5"/>
                        برنامه بهبود
                    </button>
                )}
            </div>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2 mb-8 flex-wrap">
            {assessment && userRole !== UserRole.Staff && <button onClick={() => setAssessmentSubView('details')} className={navButtonClass('details')}><DocumentIcon className="w-5 h-5" />جزئیات عملکرد</button>}
            <button onClick={() => setAssessmentSubView('summary')} className={navButtonClass('summary')}><ChartBarIcon className="w-5 h-5" />نمودار پیشرفت</button>
            <button onClick={() => setAssessmentSubView('exam_list')} className={navButtonClass('exam_list')}><ClipboardDocumentCheckIcon className="w-5 h-5" />آزمون‌ها</button>
            <button onClick={() => setAssessmentSubView('training_materials')} className={navButtonClass('training_materials')}><AcademicCapIcon className="w-5 h-5" />آموزش پرسنل</button>
            <button onClick={() => setAssessmentSubView('accreditation_materials')} className={navButtonClass('accreditation_materials')}><ShieldCheckIcon className="w-5 h-5" />اعتباربخشی</button>
            <button onClick={() => setAssessmentSubView('needs_assessment')} className={navButtonClass('needs_assessment')}><ClipboardDocumentListIcon className="w-5 h-5" />نیازسنجی و نظرسنجی</button>
        </div>
        
        {renderSubView()}

        <SuggestionModal
            isOpen={isSuggestionModalOpen}
            onClose={() => setIsSuggestionModalOpen(false)}
            title={`برنامه پیشنهادی برای ${staffMember.name}`}
            content={suggestionContent}
            isLoading={isSuggestionLoading}
        />
        {previewMaterial && <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial}/>}

      </div>
    );
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {(viewMode === 'month_selection') && userRole !== UserRole.Staff && newsBanners && newsBanners.length > 0 && (
            <div className="mb-8 max-w-5xl mx-auto">
                <NewsCarousel banners={newsBanners} />
            </div>
        )}

        {(viewMode !== 'assessment_form' && availableYears.length > 0) && (
            <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg shadow">
                <label htmlFor="year-select" className="font-semibold text-slate-700 dark:text-slate-300">
                مشاهده اطلاعات سال:
                </label>
                <select
                id="year-select"
                value={activeYear}
                onChange={e => onYearChange(parseInt(e.target.value, 10))}
                className="px-3 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                {availableYears.map(year => (
                    <option key={year} value={year}>
                    {year}
                    </option>
                ))}
                </select>
            </div>
            </div>
        )}
        
        {viewMode === 'month_selection' && renderMonthSelection()}
        {viewMode === 'assessment_form' && renderAssessmentForm()}
        {viewMode === 'assessment_result' && renderAssessmentResult()}

        <Modal isOpen={isChecklistModalOpen} onClose={() => setIsChecklistModalOpen(false)} title={`ثبت ارزیابی برای ${selectedMonth}`}>
            <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">یک روش برای ثبت ارزیابی انتخاب کنید:</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <h3 className="font-bold mb-2">۱. استفاده از قالب‌های آماده</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">یکی از قالب‌های تعریف‌شده در سیستم را انتخاب کنید تا فرم ارزیابی بر اساس آن ساخته شود.</p>
                     <div className="space-y-2">
                        {checklistTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleStartAssessmentWithTemplate(template)}
                                className="w-full text-right p-3 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-600"
                            >
                                {template.name}
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <h3 className="font-bold mb-2">۲. بارگذاری فایل اکسل تکمیل‌شده</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">یک فایل اکسل که بر اساس یکی از قالب‌ها تکمیل و نمره‌دهی شده است را بارگذاری کنید.</p>
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