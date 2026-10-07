import React, { useState, useMemo, useRef } from 'react';
import {
  ExamTemplate,
  NamedChecklistTemplate,
  Department,
  StaffMember,
  StaffChecklistEvaluation,
  ExamSubmission,
} from '../types';
import ExamBuilder from './ExamBuilder';
import ChecklistBuilder from './ChecklistBuilder';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BackIcon } from './icons/BackIcon';
import { ChecklistIcon } from './icons/ChecklistIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { SaveIcon } from './icons/SaveIcon';
import { UploadIcon } from './icons/UploadIcon';
import Modal from './Modal';
import * as XLSX from 'xlsx';

interface ExamManagerProps {
  templates: ExamTemplate[];
  checklistTemplates?: NamedChecklistTemplate[];
  department?: Department | null;
  staffList?: StaffMember[];
  onAddOrUpdateExam: (template: ExamTemplate) => void;
  onDeleteExam: (templateId: string) => void;
  onAddOrUpdateChecklistTemplate?: (template: NamedChecklistTemplate) => void;
  onDeleteChecklistTemplate?: (templateId: string) => void;
  onSaveStaffChecklistEvaluation?: (staffId: string, evaluation: StaffChecklistEvaluation) => void;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 15;

const formatDateTime = (val?: string | number): { date: string; time: string; full: string; timestamp: number } => {
  if (!val) return { date: '-', time: '-', full: '-', timestamp: 0 };
  try {
    const d =
      typeof val === 'number' || (!isNaN(Number(val)) && String(val).length > 8)
        ? new Date(Number(val))
        : new Date(val);
    if (isNaN(d.getTime())) {
      return { date: String(val), time: '-', full: String(val), timestamp: 0 };
    }
    const date = d.toLocaleDateString('fa-IR');
    const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return {
      date,
      time,
      full: `${date} - ${time}`,
      timestamp: d.getTime(),
    };
  } catch {
    return { date: String(val), time: '-', full: String(val), timestamp: 0 };
  }
};

const downloadJsonFile = (data: any, filename: string) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ExamManager: React.FC<ExamManagerProps> = ({
  templates,
  checklistTemplates = [],
  department,
  staffList = [],
  onAddOrUpdateExam,
  onDeleteExam,
  onAddOrUpdateChecklistTemplate,
  onDeleteChecklistTemplate,
  onSaveStaffChecklistEvaluation,
  onBack,
}) => {
  // 3 Main Tabs: 'exams' | 'checklists' | 'results'
  const [activeTab, setActiveTab] = useState<'exams' | 'checklists' | 'results'>('exams');

  // Sub-tab in 'checklists': 'archive' | 'evaluate'
  const [checklistSubTab, setChecklistSubTab] = useState<'archive' | 'evaluate'>('archive');

  // Pagination states
  const [examsPage, setExamsPage] = useState(1);
  const [checklistsPage, setChecklistsPage] = useState(1);
  const [staffExamsPage, setStaffExamsPage] = useState(1);
  const [staffChecklistsPage, setStaffChecklistsPage] = useState(1);

  // Hidden File Inputs for Import
  const examFileInputRef = useRef<HTMLInputElement>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);

  // Exam Builder Modal state
  const [editingExam, setEditingExam] = useState<ExamTemplate | null>(null);

  // Checklist Builder Modal state
  const [editingChecklistTemplate, setEditingChecklistTemplate] = useState<NamedChecklistTemplate | null>(null);

  // Staff evaluation form state (under 'checklists' -> 'evaluate')
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(checklistTemplates[0]?.id || '');
  const [evaluatorName, setEvaluatorName] = useState<string>(department?.managerName || 'مسئول بخش');
  const [evaluationDate, setEvaluationDate] = useState<string>(new Date().toLocaleDateString('fa-IR'));
  const [evaluationNotes, setEvaluationNotes] = useState<string>('');
  const [scoresMap, setScoresMap] = useState<{ [itemId: string]: number }>({});
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<{ [itemId: string]: string }>({});
  const [commentsMap, setCommentsMap] = useState<{ [itemId: string]: string }>({});
  const [isEvaluationSaved, setIsEvaluationSaved] = useState(false);

  // Results Tab state
  const [resultsStaffSearch, setResultsStaffSearch] = useState<string>('');
  const [selectedResultsStaffId, setSelectedResultsStaffId] = useState<string | null>(null);
  const [resultsSubTab, setResultsSubTab] = useState<'exams' | 'checklists'>('exams');

  // Detail Modals
  const [selectedDetailEvaluation, setSelectedDetailEvaluation] = useState<StaffChecklistEvaluation | null>(null);
  const [selectedDetailExamSubmission, setSelectedDetailExamSubmission] = useState<ExamSubmission | null>(null);

  const activeChecklist = useMemo(() => {
    return checklistTemplates.find(t => t.id === selectedChecklistId) || checklistTemplates[0] || null;
  }, [checklistTemplates, selectedChecklistId]);

  // Live evaluation progress
  const currentLiveStats = useMemo(() => {
    if (!activeChecklist) return { score: 0, max: 0, percentage: 0 };
    let totalS = 0;
    let totalM = 0;
    activeChecklist.categories.forEach(cat => {
      cat.items.forEach(it => {
        const itemMax = it.maxScore ?? activeChecklist.maxScore ?? 4;
        const itemScore = scoresMap[it.id] !== undefined ? scoresMap[it.id] : 0;
        totalS += itemScore;
        totalM += itemMax;
      });
    });
    const percentage = totalM > 0 ? Math.round((totalS / totalM) * 100) : 0;
    return { score: totalS, max: totalM, percentage };
  }, [activeChecklist, scoresMap]);

  // --- EXAM HANDLERS ---
  const handleAddNewExam = () => {
    setEditingExam({
      id: Date.now().toString(),
      name: '',
      questions: [],
      isActive: true,
      randomizeQuestions: true,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSaveExam = (tpl: ExamTemplate) => {
    onAddOrUpdateExam({
      ...tpl,
      isActive: tpl.isActive !== false,
      createdAt: tpl.createdAt || new Date().toISOString(),
    });
    setEditingExam(null);
  };

  const handleToggleExamActive = (exam: ExamTemplate) => {
    const updatedStatus = exam.isActive === false ? true : false;
    onAddOrUpdateExam({
      ...exam,
      isActive: updatedStatus,
    });
  };

  const handleDeleteExam = (examId: string, examName: string) => {
    if (window.confirm(`آیا از حذف آزمون "${examName}" مطمئن هستید؟ این عمل قابل بازگشت نیست.`)) {
      onDeleteExam(examId);
    }
  };

  // Export Exams to JSON
  const handleExportExams = () => {
    if (templates.length === 0) {
      alert('آزمونی برای ذخیره وجود ندارد.');
      return;
    }
    const cleanDept = (department?.name || 'بخش').replace(/\s+/g, '_');
    downloadJsonFile(templates, `آزمون_های_${cleanDept}_${Date.now()}.json`);
  };

  // Import Exams from JSON
  const handleImportExamsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const items: ExamTemplate[] = Array.isArray(parsed) ? parsed : [parsed];
        if (items.length === 0 || !items[0].name || !Array.isArray(items[0].questions)) {
          alert('فایل انتخاب شده ساختار معتبر آزمون ندارد.');
          return;
        }
        if (window.confirm(`آیا از بارگذاری و افزودن ${items.length} آزمون از این فایل اطمینان دارید؟`)) {
          items.forEach((item, idx) => {
            onAddOrUpdateExam({
              ...item,
              id: (Date.now() + idx).toString(),
              isActive: item.isActive !== false,
              createdAt: item.createdAt || new Date().toISOString(),
            });
          });
          alert(`${items.length} آزمون با موفقیت بارگذاری و افزوده شدند.`);
        }
      } catch (err) {
        alert('خطا در بارگذاری فایل: ' + (err instanceof Error ? err.message : 'فرمت نامعتبر'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download Exam Excel
  const handleDownloadExamExcel = (exam: ExamTemplate) => {
    const header = [
      ['نام آزمون:', exam.name],
      ['تعداد سوالات:', exam.questions.length],
      ['شناسه آزمون:', exam.id],
    ];
    const data: (string | number)[][] = [];
    exam.questions.forEach((q, idx) => {
      const qType = q.type === 'multiple-choice' ? 'چهار گزینه‌ای' : 'تشریحی';
      const optionsStr = q.options ? q.options.join(' | ') : '-';
      data.push([idx + 1, q.text, qType, optionsStr, q.correctAnswer]);
    });
    const ws = XLSX.utils.aoa_to_sheet([
      ...header,
      [],
      ['ردیف', 'متن سوال', 'نوع سوال', 'گزینه‌ها', 'پاسخ صحیح'],
    ]);
    XLSX.utils.sheet_add_aoa(ws, data, { origin: 'A5' });
    ws['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 15 }, { wch: 40 }, { wch: 25 }];
    if (!ws['!props']) ws['!props'] = {};
    ws['!props'].RTL = true;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exam');
    const filename = `آزمون_${exam.name.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // --- CHECKLIST TEMPLATE HANDLERS ---
  const handleAddNewChecklistTemplate = () => {
    setEditingChecklistTemplate({
      id: Date.now().toString(),
      name: '',
      categories: [],
      minScore: 0,
      maxScore: 4,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSaveChecklistTemplate = (tpl: NamedChecklistTemplate) => {
    if (onAddOrUpdateChecklistTemplate) {
      onAddOrUpdateChecklistTemplate({
        ...tpl,
        createdAt: tpl.createdAt || new Date().toISOString(),
      });
    }
    setEditingChecklistTemplate(null);
  };

  const handleDeleteChecklistTemplate = (tplId: string, tplName: string) => {
    if (window.confirm(`آیا از حذف چک‌لیست بایگانی شده "${tplName}" مطمئن هستید؟`)) {
      if (onDeleteChecklistTemplate) {
        onDeleteChecklistTemplate(tplId);
      }
    }
  };

  // Export Checklists to JSON
  const handleExportChecklists = () => {
    if (checklistTemplates.length === 0) {
      alert('چک‌لیستی برای ذخیره وجود ندارد.');
      return;
    }
    const cleanDept = (department?.name || 'بخش').replace(/\s+/g, '_');
    downloadJsonFile(checklistTemplates, `چک_لیست_های_${cleanDept}_${Date.now()}.json`);
  };

  // Import Checklists from JSON
  const handleImportChecklistsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const items: NamedChecklistTemplate[] = Array.isArray(parsed) ? parsed : [parsed];
        if (items.length === 0 || !items[0].name || !Array.isArray(items[0].categories)) {
          alert('فایل انتخاب شده ساختار معتبر چک‌لیست ندارد.');
          return;
        }
        if (window.confirm(`آیا از بارگذاری و افزودن ${items.length} چک‌لیست از این فایل اطمینان دارید؟`)) {
          if (onAddOrUpdateChecklistTemplate) {
            items.forEach((item, idx) => {
              onAddOrUpdateChecklistTemplate({
                ...item,
                id: (Date.now() + idx).toString(),
                createdAt: item.createdAt || new Date().toISOString(),
              });
            });
          }
          alert(`${items.length} چک‌لیست با موفقیت بارگذاری و افزوده شدند.`);
        }
      } catch (err) {
        alert('خطا در بارگذاری فایل: ' + (err instanceof Error ? err.message : 'فرمت نامعتبر'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download Checklist Excel
  const handleDownloadChecklistTemplateExcel = (template: NamedChecklistTemplate) => {
    const header = [
      ['نام قالب چک لیست:', template.name],
      ['بازه نمره:', `${template.minScore ?? 0} تا ${template.maxScore ?? 4}`],
      ['شناسه قالب:', template.id],
    ];
    const data: (string | number)[][] = [];
    template.categories.forEach(cat => {
      cat.items.forEach(item => {
        const typeLabel =
          item.responseType === 'qualitative'
            ? 'کیفی'
            : item.responseType === 'multiple_choice'
            ? 'تستی'
            : item.responseType === 'descriptive'
            ? 'تشریحی'
            : 'کیفی';
        data.push([cat.name, item.description, typeLabel, '']);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet([
      ...header,
      [],
      ['دسته', 'شرح مهارت / سوال', 'نوع پاسخ', 'نمره'],
    ]);
    XLSX.utils.sheet_add_aoa(ws, data, { origin: 'A6' });
    ws['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 15 }, { wch: 10 }];
    if (!ws['!props']) ws['!props'] = {};
    ws['!props'].RTL = true;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
    const filename = `چک_لیست_${template.name.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Staff checklist score change
  const handleItemScoreChange = (itemId: string, val: number, min: number, max: number) => {
    const clamped = Math.max(min, Math.min(max, isNaN(val) ? min : val));
    setScoresMap(prev => ({ ...prev, [itemId]: clamped }));
  };

  // Submit staff checklist evaluation
  const handleSaveStaffEvaluation = () => {
    if (!selectedStaffId) {
      alert('لطفاً یک پرسنل را انتخاب کنید.');
      return;
    }
    if (!activeChecklist) {
      alert('لطفاً یک چک‌لیست انتخاب کنید.');
      return;
    }

    const min = activeChecklist.minScore ?? 0;
    const max = activeChecklist.maxScore ?? 4;
    let totalScore = 0;
    let totalMaxScore = 0;

    const evaluatedCategories = activeChecklist.categories.map(cat => {
      let catScore = 0;
      let catMax = 0;

      const items = cat.items.map(item => {
        const itemMax = item.maxScore ?? max;
        const responseType = item.responseType || 'qualitative';
        const itemScore = scoresMap[item.id] !== undefined ? scoresMap[item.id] : min;
        const selectedOpt = selectedOptionsMap[item.id];
        const comment = commentsMap[item.id];

        catScore += itemScore;
        catMax += itemMax;

        return {
          description: item.description,
          score: itemScore,
          maxScore: itemMax,
          responseType,
          selectedOption: selectedOpt,
          comment: comment,
        };
      });

      totalScore += catScore;
      totalMaxScore += catMax;

      return {
        name: cat.name,
        items,
        categoryScore: catScore,
        categoryMaxScore: catMax,
      };
    });

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 100;

    const newEvaluation: StaffChecklistEvaluation = {
      id: Date.now().toString(),
      templateId: activeChecklist.id,
      templateName: activeChecklist.name,
      evaluatorName: evaluatorName.trim() || (department?.managerName || 'مسئول بخش'),
      date: evaluationDate,
      year: parseInt(evaluationDate.split('/')[0], 10) || 1403,
      overallScore: totalScore,
      maxScore: totalMaxScore,
      percentage,
      notes: evaluationNotes.trim() || undefined,
      categories: evaluatedCategories,
    };

    if (onSaveStaffChecklistEvaluation) {
      onSaveStaffChecklistEvaluation(selectedStaffId, newEvaluation);
    }

    setIsEvaluationSaved(true);
    setScoresMap({});
    setSelectedOptionsMap({});
    setCommentsMap({});
    setEvaluationNotes('');
    setTimeout(() => {
      setIsEvaluationSaved(false);
      setActiveTab('results');
      setSelectedResultsStaffId(selectedStaffId);
      setResultsSubTab('checklists');
    }, 1200);
  };

  // --- RESULTS TAB DATA ---
  const filteredStaffList = useMemo(() => {
    if (!resultsStaffSearch.trim()) return staffList;
    const q = resultsStaffSearch.toLowerCase().trim();
    return staffList.filter(
      s => s.name.toLowerCase().includes(q) || (s.title && s.title.toLowerCase().includes(q))
    );
  }, [staffList, resultsStaffSearch]);

  const selectedStaffMember = useMemo(() => {
    if (!selectedResultsStaffId) return null;
    return staffList.find(s => s.id === selectedResultsStaffId) || null;
  }, [selectedResultsStaffId, staffList]);

  // Selected staff exam submissions sorted by date/time (newest first)
  const staffExamSubmissions = useMemo(() => {
    if (!selectedStaffMember) return [];
    const list: ExamSubmission[] = [];
    (selectedStaffMember.assessments || []).forEach(a => {
      (a.examSubmissions || []).forEach(sub => {
        list.push(sub);
      });
    });
    return list.sort((a, b) => {
      const timeA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
      const timeB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
      return timeB - timeA;
    });
  }, [selectedStaffMember]);

  // Selected staff checklist evaluations sorted by date/time (newest first)
  const staffChecklistEvaluations = useMemo(() => {
    if (!selectedStaffMember) return [];
    const list = [...(selectedStaffMember.checklistEvaluations || [])];
    return list.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : !isNaN(Number(a.id)) ? Number(a.id) : 0;
      const timeB = b.date ? new Date(b.date).getTime() : !isNaN(Number(b.id)) ? Number(b.id) : 0;
      return timeB - timeA;
    });
  }, [selectedStaffMember]);

  // Pagination helper
  const renderPagination = (
    currentPage: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (p: number) => void
  ) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          نمایش {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} تا{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} از {totalItems} مورد
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-colors"
          >
            قبلی
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all ${
                p === currentPage
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-colors"
          >
            بعدی
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-hidden p-2 sm:p-4 lg:p-6 space-y-6">
      {/* Hidden File Inputs for Import */}
      <input
        type="file"
        ref={examFileInputRef}
        onChange={handleImportExamsFile}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={checklistFileInputRef}
        onChange={handleImportChecklistsFile}
        accept=".json"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>مدیریت آزمون و ارزیابی پرسنل</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            بخش {department?.name || ''} - طراحی آزمون، سنجش مهارتی با چک‌لیست و بررسی کارنامه پرسنل
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors self-end sm:self-center"
        >
          <BackIcon className="w-4 h-4" />
          <span>بازگشت به بخش</span>
        </button>
      </div>

      {/* 3 MAIN TABS NAVIGATION */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('exams')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeTab === 'exams'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <DocumentIcon className="w-4 h-4 shrink-0 hidden sm:inline" />
          <span>مدیریت آزمون</span>
        </button>

        <button
          onClick={() => setActiveTab('checklists')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeTab === 'checklists'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-md font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ChecklistIcon className="w-4 h-4 shrink-0 hidden sm:inline" />
          <span>ارزیابی با چک‌لیست</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeTab === 'results'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-md font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ClipboardDocumentCheckIcon className="w-4 h-4 shrink-0 hidden sm:inline" />
          <span>نتایج ارزیابی‌ها</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: EXAMS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Header Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                بانک آزمون‌های ثبت‌شده ({templates.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                آزمون‌های دانشی تستی و تشریحی پرسنل با قابلیت فعال و غیرفعال‌سازی
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleAddNewExam}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md text-xs sm:text-sm transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                <span>طراحی آزمون جدید</span>
              </button>

              <button
                onClick={handleExportExams}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-colors"
                title="دانلود فایل JSON جهت اشتراک‌گذاری با سایر بخش‌ها و بیمارستان‌ها"
              >
                <SaveIcon className="w-4 h-4 text-emerald-600" />
                <span>ذخیره آزمون‌ها</span>
              </button>

              <button
                onClick={() => examFileInputRef.current?.click()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-colors"
                title="بارگذاری فایل آزمون‌های اشتراک‌گذاری شده از بخش دیگر"
              >
                <UploadIcon className="w-4 h-4 text-indigo-600" />
                <span>بارگذاری آزمون</span>
              </button>
            </div>
          </div>

          {/* Exams List / Cards */}
          {templates.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <DocumentIcon className="w-16 h-16 mx-auto text-indigo-400 dark:text-indigo-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                هیچ آزمونی برای این بخش ثبت نشده است.
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                برای سنجش دانشی و ارتقای علمی پرسنل، اولین آزمون را طراحی و فعال کنید.
              </p>
              <button
                onClick={handleAddNewExam}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md text-xs"
              >
                <PlusIcon className="w-4 h-4" />
                طراحی اولین آزمون
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates
                  .slice((examsPage - 1) * ITEMS_PER_PAGE, examsPage * ITEMS_PER_PAGE)
                  .map(exam => {
                    const isActive = exam.isActive !== false;
                    const dateInfo = formatDateTime(exam.createdAt || exam.id);

                    return (
                      <div
                        key={exam.id}
                        className={`bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                          isActive
                            ? 'border-slate-200 dark:border-slate-700'
                            : 'border-slate-300 dark:border-slate-700/60 opacity-80 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          {/* Title and Active Status Badge */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              {exam.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleToggleExamActive(exam)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 transition-all flex items-center gap-1 ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                              }`}
                              title="کلیک کنید تا وضعیت فعال/غیرفعال تغییر کند"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              ></span>
                              <span>{isActive ? 'فعال' : 'غیرفعال'}</span>
                            </button>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                            <p className="flex items-center justify-between">
                              <span>کل سوالات بانک:</span>
                              <strong className="text-slate-800 dark:text-slate-200">
                                {exam.questions.length} سوال
                              </strong>
                            </p>
                            {exam.questionCountToDisplay && exam.questionCountToDisplay < exam.questions.length ? (
                              <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800/80 text-[11px] text-purple-900 dark:text-purple-200 font-bold flex items-center justify-between">
                                <span>🎲 نمایش تصادفی به پرسنل:</span>
                                <span>{exam.questionCountToDisplay} از {exam.questions.length} سوال</span>
                              </div>
                            ) : exam.randomizeQuestions !== false ? (
                              <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                                🎲 چیدمان تصادفی سوالات و گزینه‌ها فعال است
                              </div>
                            ) : null}
                            <p className="flex items-center justify-between">
                              <span>تاریخ ثبت:</span>
                              <strong className="text-slate-800 dark:text-slate-200">
                                {dateInfo.date}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleToggleExamActive(exam)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              isActive
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                          >
                            {isActive ? 'غیرفعال‌سازی آزمون' : 'فعال‌سازی آزمون'}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownloadExamExcel(exam)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors"
                              title="دانلود اکسل سوالات"
                            >
                              <DocumentIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingExam(exam)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                              title="ویرایش آزمون"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExam(exam.id, exam.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                              title="حذف آزمون"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {renderPagination(examsPage, templates.length, ITEMS_PER_PAGE, setExamsPage)}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: STAFF CHECKLIST EVALUATION */}
      {/* ========================================================================= */}
      {activeTab === 'checklists' && (
        <div className="space-y-6">
          {/* Sub-tabs: Archive vs Evaluate Form */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 text-xs font-bold w-full sm:w-auto">
              <button
                onClick={() => setChecklistSubTab('archive')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all ${
                  checklistSubTab === 'archive'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                بایگانی قالب‌های چک‌لیست ({checklistTemplates.length})
              </button>
              <button
                onClick={() => setChecklistSubTab('evaluate')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all ${
                  checklistSubTab === 'evaluate'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                انجام ارزیابی پرسنل با چک‌لیست
              </button>
            </div>

            {checklistSubTab === 'archive' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleAddNewChecklistTemplate}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-md text-xs sm:text-sm transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>طراحی و بایگانی چک‌لیست جدید</span>
                </button>

                <button
                  onClick={handleExportChecklists}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-colors"
                  title="دانلود فایل JSON چک‌لیست‌ها جهت اشتراک‌گذاری"
                >
                  <SaveIcon className="w-4 h-4 text-emerald-600" />
                  <span>ذخیره چک‌لیست‌ها</span>
                </button>

                <button
                  onClick={() => checklistFileInputRef.current?.click()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-colors"
                  title="بارگذاری چک‌لیست‌ها از فایل"
                >
                  <UploadIcon className="w-4 h-4 text-teal-600" />
                  <span>بارگذاری چک‌لیست</span>
                </button>
              </div>
            )}
          </div>

          {/* SUB-TAB 1: ARCHIVE / TEMPLATES LIST */}
          {checklistSubTab === 'archive' && (
            <div>
              {checklistTemplates.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <ChecklistIcon className="w-16 h-16 mx-auto text-teal-400 dark:text-teal-600 mb-3" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    هیچ چک‌لیست بایگانی شده‌ای وجود ندارد.
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    برای ارزیابی عملکردی پرسنل، ابتدا یک چک‌لیست استاندارد طراحی و بایگانی کنید.
                  </p>
                  <button
                    onClick={handleAddNewChecklistTemplate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-md text-xs"
                  >
                    <PlusIcon className="w-4 h-4" />
                    طراحی اولین چک‌لیست
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {checklistTemplates
                      .slice((checklistsPage - 1) * ITEMS_PER_PAGE, checklistsPage * ITEMS_PER_PAGE)
                      .map(tpl => {
                        const totalItems = tpl.categories.reduce(
                          (acc, cat) => acc + (cat.items?.length || 0),
                          0
                        );
                        const dateInfo = formatDateTime(tpl.createdAt || tpl.id);

                        return (
                          <div
                            key={tpl.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                  {tpl.name}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                                  بازه: {tpl.minScore ?? 0} تا {tpl.maxScore ?? 4}
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                <p>
                                  دسته‌ها:{' '}
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    {tpl.categories.length} دسته
                                  </strong>
                                </p>
                                <p>
                                  سنجه‌ها / سوالات:{' '}
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    {totalItems} سنجه
                                  </strong>
                                </p>
                                <p>
                                  تاریخ ثبت:{' '}
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    {dateInfo.date}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  setSelectedChecklistId(tpl.id);
                                  setChecklistSubTab('evaluate');
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                              >
                                ارزیابی با این چک‌لیست
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDownloadChecklistTemplateExcel(tpl)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors"
                                  title="دانلود اکسل"
                                >
                                  <DocumentIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingChecklistTemplate(tpl)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                  title="ویرایش چک‌لیست"
                                >
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteChecklistTemplate(tpl.id, tpl.name)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                                  title="حذف چک‌لیست"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {renderPagination(
                    checklistsPage,
                    checklistTemplates.length,
                    ITEMS_PER_PAGE,
                    setChecklistsPage
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: EVALUATE STAFF FORM */}
          {checklistSubTab === 'evaluate' && (
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                ارزیابی پرسنل با چک‌لیست بایگانی شده
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                پرسنل و چک‌لیست را انتخاب نموده و نمرات هر سنجه (کیفی، تستی، تشریحی) را ثبت کنید.
              </p>

              {isEvaluationSaved && (
                <div className="mb-6 p-4 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 rounded-xl text-center font-bold animate-bounce text-sm">
                  ✓ ارزیابی پرسنل با موفقیت ذخیره شد و در سربرگ نتایج ارزیابی‌ها قرار گرفت.
                </div>
              )}

              {/* Selection Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    انتخاب پرسنل:
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 font-semibold"
                  >
                    {staffList.length === 0 ? (
                      <option value="">پرسنلی در این بخش وجود ندارد</option>
                    ) : (
                      staffList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.title || 'پرسنل'})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    انتخاب چک‌لیست:
                  </label>
                  <select
                    value={selectedChecklistId}
                    onChange={e => {
                      setSelectedChecklistId(e.target.value);
                      setScoresMap({});
                      setSelectedOptionsMap({});
                      setCommentsMap({});
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 font-semibold"
                  >
                    {checklistTemplates.length === 0 ? (
                      <option value="">ابتدا یک چک‌لیست بایگانی کنید</option>
                    ) : (
                      checklistTemplates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام ارزیاب:
                  </label>
                  <input
                    type="text"
                    value={evaluatorName}
                    onChange={e => setEvaluatorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    placeholder="سرپرستار / مسئول بخش"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاریخ ارزیابی:
                  </label>
                  <input
                    type="text"
                    value={evaluationDate}
                    onChange={e => setEvaluationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 text-center font-bold"
                  />
                </div>
              </div>

              {/* Assessment Sheet */}
              {!activeChecklist ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  لطفاً از سربرگ «بایگانی قالب‌های چک‌لیست» ابتدا یک چک‌لیست طراحی کنید.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Live Evaluation Summary Banner */}
                  <div className="p-4 bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/40 dark:to-indigo-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex flex-wrap justify-between items-center gap-3 shadow-xs">
                    <div>
                      <span className="font-bold text-sm block text-slate-800 dark:text-slate-100 mb-0.5">
                        {activeChecklist.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ارزیابی عملکردی پرسنل با سنجه‌های کیفی، تستی و تشریحی
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-teal-200 dark:border-teal-700 shadow-xs">
                        <span className="text-[10px] text-slate-400 block">نمره کل:</span>
                        <span className="font-mono font-bold text-sm sm:text-base text-teal-700 dark:text-teal-300">
                          {currentLiveStats.score} از {currentLiveStats.max}
                        </span>
                      </div>
                      <div className="text-center px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-teal-200 dark:border-teal-700 shadow-xs">
                        <span className="text-[10px] text-slate-400 block">درصد:</span>
                        <span
                          className={`font-mono font-bold text-sm sm:text-base ${
                            currentLiveStats.percentage >= 80
                              ? 'text-emerald-600'
                              : currentLiveStats.percentage >= 60
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          %{currentLiveStats.percentage}
                        </span>
                      </div>
                    </div>
                  </div>

                  {activeChecklist.categories.map((cat, cIdx) => (
                    <div
                      key={cat.id || cIdx}
                      className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-800"
                    >
                      <div className="bg-slate-100 dark:bg-slate-750 px-4 py-3 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs sm:text-sm">{cat.name}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          {cat.items.length} سوال / سنجه
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-750 p-3 sm:p-4 space-y-4">
                        {cat.items.map((item, iIdx) => {
                          const itemMax = item.maxScore ?? activeChecklist.maxScore ?? 4;
                          const min = activeChecklist.minScore ?? 0;
                          const responseType: 'descriptive' | 'multiple_choice' | 'qualitative' =
                            item.responseType || 'qualitative';
                          const currentVal = scoresMap[item.id] !== undefined ? scoresMap[item.id] : min;
                          const currentSelectedOpt = selectedOptionsMap[item.id] || '';
                          const currentComment = commentsMap[item.id] || '';

                          const qualitativeLevels = item.qualitativeLevels || [
                            { label: 'عالی', score: 4 },
                            { label: 'خیلی خوب', score: 3 },
                            { label: 'متوسط', score: 2 },
                            { label: 'ضعیف', score: 1 },
                            { label: 'نیاز به آموزش', score: 0 },
                          ];

                          return (
                            <div key={item.id || iIdx} className="pt-4 first:pt-0 space-y-2.5">
                              {/* Question Description and Type Badge */}
                              <div className="flex flex-wrap justify-between items-start gap-2">
                                <div className="flex items-start gap-2 max-w-2xl">
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                                    {iIdx + 1}
                                  </span>
                                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      responseType === 'qualitative'
                                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                        : responseType === 'multiple_choice'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    }`}
                                  >
                                    {responseType === 'qualitative' && '⭐ کیفی'}
                                    {responseType === 'multiple_choice' && '🔘 تستی'}
                                    {responseType === 'descriptive' && '📝 تشریحی'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                                    نمره: <strong className="text-teal-600 dark:text-teal-400">{currentVal}</strong> / {itemMax}
                                  </span>
                                </div>
                              </div>

                              {/* 1. Qualitative Evaluation: Clickable levels */}
                              {responseType === 'qualitative' && (
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                                  {qualitativeLevels.map((lvl, lIdx) => {
                                    const isSelected =
                                      currentSelectedOpt === lvl.label ||
                                      (scoresMap[item.id] !== undefined && scoresMap[item.id] === lvl.score);

                                    return (
                                      <button
                                        key={lIdx}
                                        type="button"
                                        onClick={() => {
                                          handleItemScoreChange(item.id, lvl.score, min, itemMax);
                                          setSelectedOptionsMap(prev => ({ ...prev, [item.id]: lvl.label }));
                                        }}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                          isSelected
                                            ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                        }`}
                                      >
                                        <span>{lvl.label}</span>
                                        <span
                                          className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                                            isSelected
                                              ? 'bg-white/20 text-white'
                                              : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                                          }`}
                                        >
                                          {lvl.score}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 2. Multiple Choice Evaluation: Clickable options */}
                              {responseType === 'multiple_choice' && (
                                <div className="space-y-1.5 pt-1">
                                  {(
                                    item.options || [
                                      { text: 'انجام کامل و مستقل بدون نقص', score: itemMax },
                                      { text: 'انجام با نظارت و راهنمایی جزئی', score: Math.round(itemMax / 2) },
                                      { text: 'انجام نادرست یا عدم توانایی', score: 0 },
                                    ]
                                  ).map((opt, oIdx) => {
                                    const isSelected =
                                      currentSelectedOpt === opt.text ||
                                      (scoresMap[item.id] !== undefined && scoresMap[item.id] === opt.score);

                                    return (
                                      <label
                                        key={oIdx}
                                        onClick={() => {
                                          handleItemScoreChange(item.id, opt.score, min, itemMax);
                                          setSelectedOptionsMap(prev => ({ ...prev, [item.id]: opt.text }));
                                        }}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                                          isSelected
                                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-bold shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-750/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="radio"
                                            name={`mc-${item.id}`}
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="text-purple-600 focus:ring-purple-500"
                                          />
                                          <span>{opt.text}</span>
                                        </div>
                                        <span className="font-mono px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                                          {opt.score} نمره
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 3. Descriptive Evaluation: Comment Textarea & Custom Score */}
                              {responseType === 'descriptive' && (
                                <div className="space-y-2 pt-1 bg-blue-50/40 dark:bg-slate-750/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900/60">
                                  <textarea
                                    rows={2}
                                    value={currentComment}
                                    onChange={e =>
                                      setCommentsMap(prev => ({ ...prev, [item.id]: e.target.value }))
                                    }
                                    placeholder="شرح عملکرد، بازخورد و ارزیابی تشریحی ناظر برای این سنجه..."
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                      بارم نمره: ۰ تا {itemMax}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        نمره:
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={itemMax}
                                        step="0.5"
                                        value={currentVal}
                                        onChange={e =>
                                          handleItemScoreChange(
                                            item.id,
                                            parseFloat(e.target.value),
                                            0,
                                            itemMax
                                          )
                                        }
                                        className="w-16 px-2 py-1 text-center font-bold text-xs border border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      یادداشت‌ها و توصیه‌های تکمیلی ارزیاب (اختیاری):
                    </label>
                    <textarea
                      rows={3}
                      value={evaluationNotes}
                      onChange={e => setEvaluationNotes(e.target.value)}
                      placeholder="نقاط قوت مشاهده شده، توصیه‌های مهارتی و موارد نیازمند تمرین..."
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveStaffEvaluation}
                      className="w-full sm:w-auto px-6 py-3 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                    >
                      <span>ثبت نهایی و ذخیره در پرونده پرسنل</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: EVALUATION RESULTS DEDICATED TAB */}
      {/* ========================================================================= */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* View 3-A: Staff Directory List (When no staff is selected) */}
          {!selectedResultsStaffId && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    نتایج و کارنامه ارزیابی‌های پرسنل
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    برای مشاهده نتایج آزمون‌ها و چک‌لیست‌های ارزیابی، روی نام پرسنل مورد نظر کلیک کنید:
                  </p>
                </div>
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={resultsStaffSearch}
                    onChange={e => setResultsStaffSearch(e.target.value)}
                    placeholder="جستجوی پرسنل بر اساس نام یا سمت..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-750 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {filteredStaffList.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                  پرسنلی با این مشخصات یافت نشد.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredStaffList.map(staff => {
                    // Count total evaluations for this staff
                    const totalChecklists = (staff.checklistEvaluations || []).length;
                    let totalExams = 0;
                    (staff.assessments || []).forEach(a => {
                      totalExams += (a.examSubmissions || []).length;
                    });

                    return (
                      <div
                        key={staff.id}
                        onClick={() => {
                          setSelectedResultsStaffId(staff.id);
                          setStaffExamsPage(1);
                          setStaffChecklistsPage(1);
                        }}
                        className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600 cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-xs">
                            {staff.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                              {staff.name}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              {staff.title || 'پرسنل بخش'} {staff.nationalId ? `• کد ملی: ${staff.nationalId}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
                              {totalExams} آزمون
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-bold">
                              {totalChecklists} چک‌لیست
                            </span>
                          </div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-0.5">
                            <span>مشاهده</span>
                            <span>←</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* View 3-B: Single Staff Detailed Evaluation Profile */}
          {selectedResultsStaffId && selectedStaffMember && (
            <div className="space-y-6">
              {/* Back to Staff List & Header Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <button
                  onClick={() => setSelectedResultsStaffId(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 transition-colors"
                >
                  <BackIcon className="w-4 h-4" />
                  <span>بازگشت به لیست پرسنل</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    کارنامه ارزیابی: <strong className="text-slate-800 dark:text-slate-100">{selectedStaffMember.name}</strong>
                  </span>
                </div>
              </div>

              {/* Staff Profile Summary Card */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-teal-950/40 p-4 sm:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-lg shrink-0 shadow-sm">
                    {selectedStaffMember.name.slice(0, 1)}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {selectedStaffMember.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      سمت: <strong>{selectedStaffMember.title || 'پرسنل'}</strong>
                      {selectedStaffMember.nationalId ? ` | کد ملی: ${selectedStaffMember.nationalId}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-stretch sm:self-auto justify-around sm:justify-end">
                  <div className="text-center px-4 py-2 bg-white dark:bg-slate-750 rounded-xl border border-teal-200 dark:border-teal-700 shadow-xs">
                    <span className="text-[10px] text-slate-400 block">تعداد آزمون‌ها</span>
                    <span className="font-mono font-bold text-sm sm:text-base text-indigo-700 dark:text-indigo-300">
                      {staffExamSubmissions.length}
                    </span>
                  </div>
                  <div className="text-center px-4 py-2 bg-white dark:bg-slate-750 rounded-xl border border-teal-200 dark:border-teal-700 shadow-xs">
                    <span className="text-[10px] text-slate-400 block">ارزیابی‌های چک‌لیست</span>
                    <span className="font-mono font-bold text-sm sm:text-base text-teal-700 dark:text-teal-300">
                      {staffChecklistEvaluations.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-tabs: Exam vs Checklist */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 text-xs font-bold">
                <button
                  onClick={() => setResultsSubTab('exams')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    resultsSubTab === 'exams'
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <DocumentIcon className="w-4 h-4" />
                  <span>نتایج آزمون‌های کتبی ({staffExamSubmissions.length})</span>
                </button>

                <button
                  onClick={() => setResultsSubTab('checklists')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    resultsSubTab === 'checklists'
                      ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <ChecklistIcon className="w-4 h-4" />
                  <span>نتایج ارزیابی با چک‌لیست ({staffChecklistEvaluations.length})</span>
                </button>
              </div>

              {/* 3-B-1: Staff EXAMS SUB-TAB */}
              {resultsSubTab === 'exams' && (
                <div className="space-y-4">
                  {staffExamSubmissions.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                      هیچ سابقه آزمونی برای این پرسنل ثبت نشده است.
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-4 py-3">ردیف</th>
                              <th className="px-4 py-3">عنوان آزمون</th>
                              <th className="px-4 py-3 text-center">تاریخ و ساعت</th>
                              <th className="px-4 py-3 text-center">نمره کسب‌شده</th>
                              <th className="px-4 py-3 text-center">درصد</th>
                              <th className="px-4 py-3 text-center">وضعیت</th>
                              <th className="px-4 py-3 text-center">جزئیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {staffExamSubmissions
                              .slice((staffExamsPage - 1) * ITEMS_PER_PAGE, staffExamsPage * ITEMS_PER_PAGE)
                              .map((sub, idx) => {
                                const dt = formatDateTime(sub.submissionDate);
                                const rowIndex = (staffExamsPage - 1) * ITEMS_PER_PAGE + idx + 1;

                                return (
                                  <tr
                                    key={idx}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors"
                                  >
                                    <td className="px-4 py-3 font-mono text-slate-400 font-bold">
                                      {rowIndex}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                      {sub.examName || 'آزمون تئوری'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 font-mono" dir="ltr">
                                      {dt.full}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {sub.score} از {sub.maxScore}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                                          sub.percentage >= 80
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : sub.percentage >= 60
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}
                                      >
                                        %{sub.percentage}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                          sub.passed
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                        }`}
                                      >
                                        {sub.passed ? 'قبول' : 'نیاز به ارتقا'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => setSelectedDetailExamSubmission(sub)}
                                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                      >
                                        مشاهده کارنامه
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-3">
                        {renderPagination(
                          staffExamsPage,
                          staffExamSubmissions.length,
                          ITEMS_PER_PAGE,
                          setStaffExamsPage
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3-B-2: Staff CHECKLISTS SUB-TAB */}
              {resultsSubTab === 'checklists' && (
                <div className="space-y-4">
                  {staffChecklistEvaluations.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                      هیچ ارزیابی با چک‌لیست برای این پرسنل ثبت نشده است.
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-4 py-3">ردیف</th>
                              <th className="px-4 py-3">عنوان چک‌لیست</th>
                              <th className="px-4 py-3 text-center">ارزیاب</th>
                              <th className="px-4 py-3 text-center">تاریخ و ساعت</th>
                              <th className="px-4 py-3 text-center">نمره کل</th>
                              <th className="px-4 py-3 text-center">درصد عملکرد</th>
                              <th className="px-4 py-3 text-center">مشاهده سنجه‌ها</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {staffChecklistEvaluations
                              .slice(
                                (staffChecklistsPage - 1) * ITEMS_PER_PAGE,
                                staffChecklistsPage * ITEMS_PER_PAGE
                              )
                              .map((evalItem, idx) => {
                                const dt = formatDateTime(evalItem.date || evalItem.id);
                                const rowIndex =
                                  (staffChecklistsPage - 1) * ITEMS_PER_PAGE + idx + 1;

                                return (
                                  <tr
                                    key={idx}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors"
                                  >
                                    <td className="px-4 py-3 font-mono text-slate-400 font-bold">
                                      {rowIndex}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                      {evalItem.templateName}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                                      {evalItem.evaluatorName}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 font-mono" dir="ltr">
                                      {dt.full}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {evalItem.overallScore} از {evalItem.maxScore}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                                          evalItem.percentage >= 85
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : evalItem.percentage >= 70
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}
                                      >
                                        %{evalItem.percentage}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => setSelectedDetailEvaluation(evalItem)}
                                        className="px-2.5 py-1 text-xs font-bold text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                      >
                                        مشاهده جزئیات
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-3">
                        {renderPagination(
                          staffChecklistsPage,
                          staffChecklistEvaluations.length,
                          ITEMS_PER_PAGE,
                          setStaffChecklistsPage
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Exam Builder Modal */}
      {editingExam && (
        <Modal
          isOpen={!!editingExam}
          onClose={() => setEditingExam(null)}
          title={editingExam.name ? `ویرایش آزمون: ${editingExam.name}` : 'طراحی آزمون جدید'}
        >
          <ExamBuilder
            template={editingExam}
            onSave={handleSaveExam}
            onCancel={() => setEditingExam(null)}
          />
        </Modal>
      )}

      {/* Checklist Template Builder Modal */}
      {editingChecklistTemplate && (
        <Modal
          isOpen={!!editingChecklistTemplate}
          onClose={() => setEditingChecklistTemplate(null)}
          title={
            editingChecklistTemplate.name
              ? `ویرایش چک‌لیست: ${editingChecklistTemplate.name}`
              : 'طراحی چک‌لیست ارزیابی جدید'
          }
        >
          <ChecklistBuilder
            template={editingChecklistTemplate}
            onSave={handleSaveChecklistTemplate}
            onCancel={() => setEditingChecklistTemplate(null)}
          />
        </Modal>
      )}

      {/* Modal for Viewing Full Checklist Evaluation Detail */}
      {selectedDetailEvaluation && (
        <Modal
          isOpen={!!selectedDetailEvaluation}
          onClose={() => setSelectedDetailEvaluation(null)}
          title={`کارنامه ارزیابی: ${selectedDetailEvaluation.templateName}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
            <div className="flex flex-wrap justify-between items-center p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-xs gap-2 border border-teal-200 dark:border-teal-800">
              <div>
                ارزیاب: <strong>{selectedDetailEvaluation.evaluatorName}</strong>
              </div>
              <div dir="ltr">
                تاریخ: <strong>{formatDateTime(selectedDetailEvaluation.date).full}</strong>
              </div>
              <div>
                نمره کل:{' '}
                <strong>
                  {selectedDetailEvaluation.overallScore} از {selectedDetailEvaluation.maxScore}
                </strong>
              </div>
              <div className="text-teal-700 dark:text-teal-300 font-bold font-mono">
                درصد عملکرد: %{selectedDetailEvaluation.percentage}
              </div>
            </div>

            {selectedDetailEvaluation.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <strong>یادداشت و توصیه ارزیاب:</strong> {selectedDetailEvaluation.notes}
              </div>
            )}

            <div className="space-y-3">
              {selectedDetailEvaluation.categories.map((cat, idx) => (
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
                                {it.responseType === 'qualitative'
                                  ? '⭐ کیفی'
                                  : it.responseType === 'multiple_choice'
                                  ? '🔘 تستی'
                                  : '📝 تشریحی'}
                              </span>
                            )}
                          </div>
                          {it.selectedOption && (
                            <p className="text-xs text-teal-700 dark:text-teal-300 pr-5">
                              پاسخ انتخابی: <strong className="font-bold">{it.selectedOption}</strong>
                            </p>
                          )}
                          {it.comment && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 pr-5">
                              توضیحات ناظر: {it.comment}
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

      {/* Modal for Viewing Full Exam Submission Detail */}
      {selectedDetailExamSubmission && (
        <Modal
          isOpen={!!selectedDetailExamSubmission}
          onClose={() => setSelectedDetailExamSubmission(null)}
          title={`کارنامه آزمون: ${selectedDetailExamSubmission.examName || 'آزمون دانشی'}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
            <div className="flex flex-wrap justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-xs gap-2 border border-indigo-200 dark:border-indigo-800">
              <div dir="ltr">
                تاریخ شرکت:{' '}
                <strong>{formatDateTime(selectedDetailExamSubmission.submissionDate).full}</strong>
              </div>
              <div>
                نمره کل:{' '}
                <strong>
                  {selectedDetailExamSubmission.score} از {selectedDetailExamSubmission.maxScore}
                </strong>
              </div>
              <div className="font-bold font-mono text-indigo-700 dark:text-indigo-300">
                درصد: %{selectedDetailExamSubmission.percentage}
              </div>
              <div>
                وضعیت:{' '}
                <strong
                  className={
                    selectedDetailExamSubmission.passed ? 'text-emerald-600' : 'text-rose-600'
                  }
                >
                  {selectedDetailExamSubmission.passed ? 'قبول' : 'نیاز به ارتقا'}
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                پاسخ‌های ثبت‌شده توسط پرسنل ({selectedDetailExamSubmission.answers.length} پاسخ):
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {selectedDetailExamSubmission.answers.map((ans, aIdx) => (
                  <div key={aIdx} className="py-2.5 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold">{aIdx + 1}.</span>
                      <span className="text-slate-500 font-mono text-[11px]">سوال {aIdx + 1}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-750 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[10px] mb-0.5">پاسخ پرسنل:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{ans.answer || '(بدون پاسخ)'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExamManager;
