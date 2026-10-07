import React, { useState } from 'react';
import {
  ChecklistCategoryTemplate,
  ChecklistItemTemplate,
  NamedChecklistTemplate,
  ChecklistResponseType,
  ChecklistOption,
  ChecklistQualitativeLevel,
} from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SaveIcon } from './icons/SaveIcon';

interface ChecklistBuilderProps {
  template: NamedChecklistTemplate;
  onSave: (newTemplate: NamedChecklistTemplate) => void;
  onCancel: () => void;
}

const DEFAULT_5_SCALE_LEVELS: ChecklistQualitativeLevel[] = [
  { label: 'عالی', score: 4, color: 'bg-emerald-600' },
  { label: 'خیلی خوب', score: 3, color: 'bg-teal-600' },
  { label: 'متوسط', score: 2, color: 'bg-blue-600' },
  { label: 'ضعیف', score: 1, color: 'bg-amber-600' },
  { label: 'نیاز به آموزش', score: 0, color: 'bg-rose-600' },
];

const DEFAULT_3_SCALE_LEVELS: ChecklistQualitativeLevel[] = [
  { label: 'بلی (انطباق کامل)', score: 4, color: 'bg-emerald-600' },
  { label: 'تا حدودی (نیاز به اصلاح)', score: 2, color: 'bg-amber-600' },
  { label: 'خیر (عدم انطباق)', score: 0, color: 'bg-rose-600' },
];

const DEFAULT_MC_OPTIONS: ChecklistOption[] = [
  { text: 'انجام کامل و مستقل بدون نقص', score: 4 },
  { text: 'انجام با نظارت و راهنمایی جزئی', score: 2 },
  { text: 'انجام نادرست یا عدم توانایی در اجرا', score: 0 },
];

const ChecklistBuilder: React.FC<ChecklistBuilderProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template.name || '');
  const [minScore, setMinScore] = useState<number>(template.minScore ?? 0);
  const [maxScore, setMaxScore] = useState<number>(template.maxScore ?? 4);

  // Initialize categories, ensuring at least one category exists
  const [categories, setCategories] = useState<ChecklistCategoryTemplate[]>(() => {
    if (template.categories && template.categories.length > 0) {
      return JSON.parse(JSON.stringify(template.categories));
    }
    return [
      {
        id: Date.now().toString(),
        name: 'سنجه‌ها و سوالات ارزیابی',
        items: [
          {
            id: (Date.now() + 1).toString(),
            description: '',
            responseType: 'qualitative',
            maxScore: template.maxScore ?? 4,
            qualitativeScale: '5_scale',
            qualitativeLevels: JSON.parse(JSON.stringify(DEFAULT_5_SCALE_LEVELS)),
          },
        ],
      },
    ];
  });

  const handleAddCategory = () => {
    const newCategory: ChecklistCategoryTemplate = {
      id: Date.now().toString(),
      name: `دسته‌بندی جدید ${categories.length + 1}`,
      items: [
        {
          id: (Date.now() + 1).toString(),
          description: '',
          responseType: 'qualitative',
          maxScore: maxScore,
          qualitativeScale: '5_scale',
          qualitativeLevels: JSON.parse(JSON.stringify(DEFAULT_5_SCALE_LEVELS)),
        },
      ],
    };
    setCategories([...categories, newCategory]);
  };

  const handleCategoryNameChange = (categoryId: string, value: string) => {
    setCategories(categories.map(cat => (cat.id === categoryId ? { ...cat, name: value } : cat)));
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (categories.length === 1) {
      alert('حداقل یک دسته‌بندی برای سوالات باید وجود داشته باشد.');
      return;
    }
    if (window.confirm('آیا از حذف این دسته و تمام سوالات آن مطمئن هستید؟')) {
      setCategories(categories.filter(cat => cat.id !== categoryId));
    }
  };

  const handleAddQuestion = (categoryId: string) => {
    const newQuestion: ChecklistItemTemplate = {
      id: Date.now().toString(),
      description: '',
      responseType: 'qualitative',
      maxScore: maxScore,
      qualitativeScale: '5_scale',
      qualitativeLevels: JSON.parse(JSON.stringify(DEFAULT_5_SCALE_LEVELS)),
    };

    setCategories(
      categories.map(cat => (cat.id === categoryId ? { ...cat, items: [...cat.items, newQuestion] } : cat))
    );
  };

  const handleUpdateQuestion = (
    categoryId: string,
    questionId: string,
    updater: (q: ChecklistItemTemplate) => ChecklistItemTemplate
  ) => {
    setCategories(
      categories.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          items: cat.items.map(item => (item.id === questionId ? updater(item) : item)),
        };
      })
    );
  };

  const handleDeleteQuestion = (categoryId: string, questionId: string) => {
    setCategories(
      categories.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== questionId),
        };
      })
    );
  };

  // Change Question Response Type (Descriptive, Multiple Choice, Qualitative)
  const handleChangeResponseType = (categoryId: string, questionId: string, newType: ChecklistResponseType) => {
    handleUpdateQuestion(categoryId, questionId, q => {
      let updated: ChecklistItemTemplate = { ...q, responseType: newType };

      if (newType === 'qualitative') {
        if (!updated.qualitativeLevels || updated.qualitativeLevels.length === 0) {
          updated.qualitativeScale = '5_scale';
          updated.qualitativeLevels = JSON.parse(JSON.stringify(DEFAULT_5_SCALE_LEVELS));
        }
      } else if (newType === 'multiple_choice') {
        if (!updated.options || updated.options.length === 0) {
          updated.options = JSON.parse(JSON.stringify(DEFAULT_MC_OPTIONS));
        }
      } else if (newType === 'descriptive') {
        updated.maxScore = updated.maxScore || maxScore;
      }

      return updated;
    });
  };

  // Toggle Qualitative scale presets
  const handleSelectQualitativePreset = (
    categoryId: string,
    questionId: string,
    preset: '5_scale' | '3_scale'
  ) => {
    handleUpdateQuestion(categoryId, questionId, q => ({
      ...q,
      qualitativeScale: preset,
      qualitativeLevels: JSON.parse(
        JSON.stringify(preset === '5_scale' ? DEFAULT_5_SCALE_LEVELS : DEFAULT_3_SCALE_LEVELS)
      ),
    }));
  };

  // Multiple Choice Option actions
  const handleAddOption = (categoryId: string, questionId: string) => {
    handleUpdateQuestion(categoryId, questionId, q => {
      const currentOpts = q.options || [];
      return {
        ...q,
        options: [...currentOpts, { text: `گزینه ${currentOpts.length + 1}`, score: 0 }],
      };
    });
  };

  const handleUpdateOption = (
    categoryId: string,
    questionId: string,
    optIdx: number,
    field: 'text' | 'score',
    val: any
  ) => {
    handleUpdateQuestion(categoryId, questionId, q => {
      const currentOpts = [...(q.options || [])];
      if (!currentOpts[optIdx]) return q;
      currentOpts[optIdx] = {
        ...currentOpts[optIdx],
        [field]: field === 'score' ? Math.max(0, isNaN(val) ? 0 : Number(val)) : val,
      };
      return { ...q, options: currentOpts };
    });
  };

  const handleDeleteOption = (categoryId: string, questionId: string, optIdx: number) => {
    handleUpdateQuestion(categoryId, questionId, q => {
      const currentOpts = (q.options || []).filter((_, idx) => idx !== optIdx);
      return { ...q, options: currentOpts };
    });
  };

  // Qualitative Level Score Update
  const handleUpdateQualitativeScore = (
    categoryId: string,
    questionId: string,
    levelIdx: number,
    score: number
  ) => {
    handleUpdateQuestion(categoryId, questionId, q => {
      const levels = [...(q.qualitativeLevels || [])];
      if (!levels[levelIdx]) return q;
      levels[levelIdx] = { ...levels[levelIdx], score: Math.max(0, isNaN(score) ? 0 : score) };
      return { ...q, qualitativeLevels: levels };
    });
  };

  // Save changes
  const handleSaveChanges = () => {
    if (!name.trim()) {
      alert('لطفاً عنوان چک‌لیست را وارد کنید.');
      return;
    }

    const totalQuestions = categories.reduce((sum, c) => sum + c.items.length, 0);
    if (totalQuestions === 0) {
      alert('چک‌لیست باید حداقل دارای یک سوال باشد.');
      return;
    }

    // Check if questions have empty description
    for (const cat of categories) {
      for (const item of cat.items) {
        if (!item.description.trim()) {
          alert('متن سوالات نمی‌تواند خالی باشد. لطفاً سوالات خالی را پر یا حذف کنید.');
          return;
        }
      }
    }

    const numMin = Number(minScore) || 0;
    const numMax = Number(maxScore) || 4;

    onSave({
      ...template,
      name: name.trim(),
      minScore: numMin,
      maxScore: numMax,
      categories,
      createdAt: template.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-3 sm:p-6 lg:p-8 border border-slate-200 dark:border-slate-700 max-w-5xl mx-auto w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>طراحی و ساخت چک‌لیست ارزیابی پرسنل</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تعیین عنوان، نگارش سوالات و تنظیم نوع پاسخ (تشریحی، تستی، کیفی) همراه با سیستم نمره‌دهی
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 text-xs sm:text-sm transition-colors text-center"
          >
            انصراف
          </button>
          <button
            onClick={handleSaveChanges}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-md text-xs sm:text-sm transition-all"
          >
            <SaveIcon className="w-4 h-4" />
            ذخیره و بایگانی چک‌لیست
          </button>
        </div>
      </div>

      {/* 1. SECTION: TITLE AND GLOBAL SETTINGS */}
      <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-indigo-50 dark:from-slate-750 dark:via-slate-800 dark:to-teal-950/30 p-6 rounded-2xl border-2 border-teal-200 dark:border-teal-800 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label
              htmlFor="template-name"
              className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2"
            >
              عنوان چک‌لیست ارزیابی: <span className="text-rose-500">*</span>
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: چک‌لیست ارزیابی مهارت‌های بالینی، پانسمان و تزریقات ایمن"
              className="w-full px-4 py-3 text-base font-bold border-2 border-teal-300 dark:border-teal-700 rounded-xl dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              این عنوان در بایگانی قالب‌ها، فرم ارزیابی مسئول بخش و کارنامه پرسنل نمایش داده خواهد شد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="max-score"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2"
              >
                حداکثر نمره پیش‌فرض:
              </label>
              <input
                id="max-score"
                type="number"
                min={1}
                value={maxScore}
                onChange={e => setMaxScore(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-center font-bold text-base border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="min-score"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2"
              >
                حداقل نمره:
              </label>
              <input
                id="min-score"
                type="number"
                min={0}
                value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-center font-bold text-base border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION: QUESTIONS BUILDER */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              سوالات و سنجه‌های ارزیابی
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              برای هر سوال متن آن را نوشته و نوع پاسخ (تشریحی، تستی، کیفی) و سیستم نمره‌دهی آن را تنظیم کنید.
            </p>
          </div>
          <button
            onClick={handleAddCategory}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-300 dark:border-slate-600"
          >
            <PlusIcon className="w-4 h-4" />
            افزودن دسته‌بندی جدید
          </button>
        </div>

        {categories.map((cat, catIdx) => (
          <div
            key={cat.id}
            className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-850/40 shadow-sm"
          >
            {/* Category Header */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 flex-grow">
                <span className="w-7 h-7 flex items-center justify-center bg-teal-600 text-white rounded-lg text-xs font-bold shrink-0">
                  {catIdx + 1}
                </span>
                <input
                  type="text"
                  value={cat.name}
                  onChange={e => handleCategoryNameChange(cat.id, e.target.value)}
                  placeholder="نام دسته‌بندی سوالات (مثال: مهارت‌های تخصصی، ارتباط با بیمار، استانداردهای ایمنی)"
                  className="font-bold text-base sm:text-lg bg-white dark:bg-slate-700 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 flex-grow max-w-xl"
                />
              </div>

              {categories.length > 1 && (
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="حذف این دسته"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Questions inside Category */}
            <div className="space-y-6">
              {cat.items.map((item, qIdx) => {
                const responseType: ChecklistResponseType = item.responseType || 'qualitative';

                return (
                  <div
                    key={item.id}
                    className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    {/* Question Top Row: Index, Question Text, Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-grow">
                        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-1 shrink-0">
                          سوال {qIdx + 1}
                        </span>
                        <div className="flex-grow">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            متن سوال یا سنجه ارزیابی:
                          </label>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={e =>
                              handleUpdateQuestion(cat.id, item.id, q => ({
                                ...q,
                                description: e.target.value,
                              }))
                            }
                            placeholder="متن سوال یا سنجه را بنویسید (مثال: نحوه استفاده صحیح از تجهیزات محافظت فردی هنگام مواجهه با بیمار عفونی)"
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteQuestion(cat.id, item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                        title="حذف این سوال"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Question Response Type Tabs (Descriptive, Multiple Choice, Qualitative) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="w-full sm:w-auto">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1 sm:inline sm:ml-2">
                            نوع پاسخ سوال:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 text-xs font-bold w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleChangeResponseType(cat.id, item.id, 'qualitative')}
                              className={`px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                responseType === 'qualitative'
                                  ? 'bg-teal-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span>⭐ کیفی (سطوح استاندارد)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeResponseType(cat.id, item.id, 'multiple_choice')}
                              className={`px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                responseType === 'multiple_choice'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span>🔘 تستی (چندگزینه‌ای)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeResponseType(cat.id, item.id, 'descriptive')}
                              className={`px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                responseType === 'descriptive'
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span>📝 تشریحی (بارم نمره)</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                          <span className="text-slate-500 font-semibold">حداکثر نمره این سوال:</span>
                          <input
                            type="number"
                            min={1}
                            value={item.maxScore ?? maxScore}
                            onChange={e =>
                              handleUpdateQuestion(cat.id, item.id, q => ({
                                ...q,
                                maxScore: Number(e.target.value) || maxScore,
                              }))
                            }
                            className="w-16 px-2 py-1 text-center font-bold border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {/* 1. QUALITATIVE CONFIGURATION */}
                      {responseType === 'qualitative' && (
                        <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-xl border border-teal-200 dark:border-teal-900/60">
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                              الگوی سطوح کیفی و نمره‌دهی خودکار:
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => handleSelectQualitativePreset(cat.id, item.id, '5_scale')}
                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                  item.qualitativeScale === '5_scale' || !item.qualitativeScale
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                مقیاس ۵ سطحی (عالی تا نیاز به آموزش)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectQualitativePreset(cat.id, item.id, '3_scale')}
                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                  item.qualitativeScale === '3_scale'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                مقیاس ۳ سطحی (بلی / تا حدودی / خیر)
                              </button>
                            </div>
                          </div>

                          {/* Levels Display and Score Inputs */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {(item.qualitativeLevels || DEFAULT_5_SCALE_LEVELS).map((lvl, lIdx) => (
                              <div
                                key={lIdx}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-xs flex flex-col justify-between"
                              >
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                                  {lvl.label}
                                </span>
                                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                                  <span>نمره:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={lvl.score}
                                    onChange={e =>
                                      handleUpdateQualitativeScore(
                                        cat.id,
                                        item.id,
                                        lIdx,
                                        parseFloat(e.target.value)
                                      )
                                    }
                                    className="w-12 px-1.5 py-0.5 text-center font-bold text-xs border border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. MULTIPLE CHOICE CONFIGURATION */}
                      {responseType === 'multiple_choice' && (
                        <div className="bg-purple-50/50 dark:bg-slate-750 p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 space-y-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                              گزینه‌های تستی و نمره اختصاصی هر گزینه:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddOption(cat.id, item.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 rounded-lg transition-colors"
                            >
                              <PlusIcon className="w-3.5 h-3.5" />
                              افزودن گزینه جدید
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(item.options || DEFAULT_MC_OPTIONS).map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                              >
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-bold shrink-0">
                                  {oIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={e =>
                                    handleUpdateOption(cat.id, item.id, oIdx, 'text', e.target.value)
                                  }
                                  placeholder={`عنوان گزینه ${oIdx + 1}`}
                                  className="flex-grow px-2.5 py-1 text-xs border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <div className="flex items-center gap-1.5 shrink-0 text-xs">
                                  <span className="text-slate-500 font-semibold">نمره:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={opt.score}
                                    onChange={e =>
                                      handleUpdateOption(
                                        cat.id,
                                        item.id,
                                        oIdx,
                                        'score',
                                        parseFloat(e.target.value)
                                      )
                                    }
                                    className="w-14 px-2 py-1 text-center font-bold border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-1 focus:ring-purple-500"
                                  />
                                </div>
                                {(item.options || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOption(cat.id, item.id, oIdx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="حذف گزینه"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. DESCRIPTIVE CONFIGURATION */}
                      {responseType === 'descriptive' && (
                        <div className="bg-blue-50/50 dark:bg-slate-750 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60">
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block mb-2">
                            تنظیمات پاسخ تشریحی:
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            در زمان ارزیابی پرسنل، ارزیاب می‌تواند توضیحات، شرح عملکرد و بازخورد کیفی را ثبت کرده و نمره متناسب با پاسخ پرسنل (بین ۰ تا حداکثر نمره {item.maxScore ?? maxScore}) را وارد کند.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Question Button inside Category */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => handleAddQuestion(cat.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 rounded-xl transition-all border border-teal-200 dark:border-teal-800 shadow-xs"
              >
                <PlusIcon className="w-4 h-4" />
                افزودن سوال جدید به این دسته‌بندی
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <button
          onClick={handleAddCategory}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs sm:text-sm order-2 sm:order-1"
        >
          <PlusIcon className="w-4 h-4" />
          افزودن دسته‌بندی جدید
        </button>

        <div className="flex items-center gap-2 order-1 sm:order-2">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 text-xs sm:text-sm transition-colors text-center"
          >
            انصراف
          </button>
          <button
            onClick={handleSaveChanges}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-md text-xs sm:text-sm transition-all"
          >
            <SaveIcon className="w-4 h-4" />
            ذخیره و بایگانی چک‌لیست
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistBuilder;
