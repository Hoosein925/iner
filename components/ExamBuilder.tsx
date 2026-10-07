import React, { useState } from 'react';
import { ExamTemplate, Question, QuestionType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SaveIcon } from './icons/SaveIcon';

interface ExamBuilderProps {
  template: ExamTemplate;
  onSave: (newTemplate: ExamTemplate) => void;
  onCancel: () => void;
}

const ExamBuilder: React.FC<ExamBuilderProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template.name || '');
  const [isActive, setIsActive] = useState<boolean>(template.isActive !== false);
  const [questionCountToDisplay, setQuestionCountToDisplay] = useState<number | ''>(
    template.questionCountToDisplay || ''
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(
    template.randomizeQuestions !== false
  );
  const [questions, setQuestions] = useState<Question[]>(
    () => JSON.parse(JSON.stringify(template.questions || [])) // Deep copy
  );

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: type,
      correctAnswer: '',
      ...(type === QuestionType.MultipleChoice && { options: ['', '', '', ''] }),
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionChange = (qId: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => (q.id === qId ? { ...q, [field]: value } : q)));
  };

  const handleOptionChange = (qId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id === qId && q.options) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          if (q.correctAnswer === q.options[optionIndex]) {
            return { ...q, options: newOptions, correctAnswer: value };
          }
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleDeleteQuestion = (qId: string) => {
    if (window.confirm('آیا از حذف این سوال مطمئن هستید؟')) {
      setQuestions(questions.filter(q => q.id !== qId));
    }
  };

  const handleSaveChanges = () => {
    if (!name.trim()) {
      alert('نام آزمون نمی‌تواند خالی باشد.');
      return;
    }
    if (questions.length === 0) {
      alert('آزمون باید حداقل یک سوال داشته باشد.');
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        alert('متن سوال نمی‌تواند خالی باشد.');
        return;
      }
      if (q.type === QuestionType.MultipleChoice) {
        if (q.options?.some(opt => !opt.trim())) {
          alert('متن گزینه‌ها نمی‌تواند خالی باشد.');
          return;
        }
        if (!q.correctAnswer.trim()) {
          alert('باید یک گزینه صحیح برای سوالات چهارگزینه‌ای انتخاب کنید.');
          return;
        }
      } else {
        if (!q.correctAnswer.trim()) {
          alert('پاسخ نمونه برای سوال تشریحی نمی‌تواند خالی باشد.');
          return;
        }
      }
    }
    const parsedDisplayCount =
      typeof questionCountToDisplay === 'number' && questionCountToDisplay > 0
        ? Math.min(questionCountToDisplay, questions.length)
        : undefined;

    onSave({
      ...template,
      name: name.trim(),
      isActive,
      questions,
      questionCountToDisplay: parsedDisplayCount,
      randomizeQuestions,
      createdAt: template.createdAt || new Date().toISOString(),
    });
  };

  const renderQuestionForm = (q: Question, index: number) => {
    return (
      <div
        key={q.id}
        className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-5 bg-slate-50/50 dark:bg-slate-750/30 space-y-3"
      >
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              سوال {index + 1}
            </span>
            <select
              value={q.type}
              onChange={e => handleQuestionChange(q.id, 'type', e.target.value)}
              className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={QuestionType.MultipleChoice}>چهار گزینه‌ای (تستی)</option>
              <option value={QuestionType.Descriptive}>تشریحی</option>
            </select>
          </div>
          <button
            onClick={() => handleDeleteQuestion(q.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title="حذف سوال"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            متن سوال:
          </label>
          <textarea
            value={q.text}
            onChange={e => handleQuestionChange(q.id, 'text', e.target.value)}
            placeholder="متن سوال را اینجا بنویسید..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {q.type === QuestionType.MultipleChoice ? (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              گزینه‌ها را بنویسید و گزینه صحیح را با کلیک روی دایره مشخص کنید:
            </p>
            <div className="space-y-2">
              {q.options?.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`correct-${q.id}-${optIndex}`}
                    name={`correct-answer-${q.id}`}
                    checked={q.correctAnswer === opt && opt !== ''}
                    onChange={() => handleQuestionChange(q.id, 'correctAnswer', opt)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => handleOptionChange(q.id, optIndex, e.target.value)}
                    placeholder={`گزینه ${optIndex + 1}`}
                    className={`flex-grow px-3 py-1.5 text-xs sm:text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      q.correctAnswer === opt && opt !== ''
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold'
                        : 'border-slate-300'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              پاسخ نمونه یا کلید تصحیح سوال تشریحی:
            </p>
            <textarea
              value={q.correctAnswer}
              onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value)}
              placeholder="پاسخ نمونه را بنویسید..."
              rows={3}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-3 sm:p-6 border border-slate-200 dark:border-slate-700 max-w-4xl mx-auto w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            ساخت و ویرایش آزمون
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            طراحی سوالات تستی و تشریحی جهت سنجش دانشی پرسنل
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
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md text-xs sm:text-sm transition-all"
          >
            <SaveIcon className="w-4 h-4" />
            ذخیره آزمون
          </button>
        </div>
      </div>

      {/* Name and Active Status */}
      <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 space-y-4">
        <div>
          <label htmlFor="exam-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            عنوان آزمون: <span className="text-rose-500">*</span>
          </label>
          <input
            id="exam-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="مثال: آزمون جامع ایمنی بیمار و خطاهای دارویی"
            className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              وضعیت فعال‌بودن آزمون برای پرسنل:
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              در صورت غیرفعال بودن، آزمون در لیست آزمون‌های در دسترس پرسنل برای شرکت کردن قرار نمی‌گیرد.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-400'}`}></span>
            {isActive ? 'فعال (آماده برگزاری)' : 'غیرفعال'}
          </button>
        </div>
      </div>

      {/* Random Question Sampling & Anti-Cheating Settings */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-sky-950/40 p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-800 mb-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-purple-950 dark:text-purple-200 flex items-center gap-2">
              <span className="p-1.5 bg-purple-600 text-white rounded-lg text-xs">🎲</span>
              <span>تنظیم انتخاب و نمایش تصادفی سوالات (جلوگیری از تقلب و تنوع آزمون)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              می‌توانید یک بانک بزرگ سوال (مثلاً ۳۰ سوال) تعریف کنید و تعیین نمایید که به هر پرسنل تنها تعداد مشخصی سوال تصادفی (مثلاً ۱۰ سوال) نمایش داده شود. ترتیب سوالات و گزینه‌ها برای هر پرسنل متفاوت خواهد بود.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer shrink-0 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-purple-300 dark:border-purple-700 shadow-xs hover:border-purple-500 transition">
            <input
              type="checkbox"
              checked={randomizeQuestions}
              onChange={e => setRandomizeQuestions(e.target.checked)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
              فعال‌سازی تصادفی‌سازی
            </span>
          </label>
        </div>

        {randomizeQuestions && (
          <div className="pt-3 border-t border-purple-200/80 dark:border-purple-800/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-800/70 p-3 rounded-xl border border-purple-100 dark:border-purple-900">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  تعداد سوالات تصادفی برای نمایش به هر پرسنل:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  (بانک فعلی: <strong className="text-purple-700 dark:text-purple-300">{questions.length} سوال</strong> | در صورت خالی گذاشتن، همه سوالات با ترتیب تصادفی ارائه می‌شوند)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={questions.length > 0 ? questions.length : 100}
                  value={questionCountToDisplay}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    setQuestionCountToDisplay(val);
                  }}
                  placeholder={`کل (${questions.length})`}
                  className="w-28 px-3 py-1.5 text-center font-bold text-sm border border-purple-300 dark:border-purple-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">سوال</span>
              </div>
            </div>

            {/* Visual Indicator of Config */}
            <div className="text-xs p-2.5 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <span>💡</span>
              <span>
                {questionCountToDisplay && typeof questionCountToDisplay === 'number' && questionCountToDisplay < questions.length ? (
                  <>
                    سیستم از بین <strong>{questions.length} سوال</strong> بانک، به صورت تصادفی <strong>{questionCountToDisplay} سوال</strong> را برای هر پرسنل سوا کرده و نمایش می‌دهد.
                  </>
                ) : (
                  <>
                    تمام <strong>{questions.length} سوال</strong> به صورت تصادفی با جابجایی خودکار گزینه‌ها به پرسنل نمایش داده خواهد شد.
                  </>
                )}
              </span>
            </div>

            {/* Quick buttons */}
            {questions.length > 3 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                <span className="text-slate-500 text-[11px]">انتخاب‌های سریع:</span>
                <button
                  type="button"
                  onClick={() => setQuestionCountToDisplay('')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                    questionCountToDisplay === ''
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                  }`}
                >
                  همه سوالات ({questions.length})
                </button>
                {[5, 10, 15, 20, 25, 30]
                  .filter(n => n < questions.length)
                  .map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuestionCountToDisplay(n)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                        questionCountToDisplay === n
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                      }`}
                    >
                      {n} سوال تصادفی
                    </button>
                  ))}
              </div>
            )}

            <div className="p-2.5 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
              💡 <strong>نحوه عملکرد:</strong> هنگام شرکت هر پرسنل در آزمون، سیستم به طور خودکار {questionCountToDisplay ? `${questionCountToDisplay} سوال` : 'تمام سوالات'} را به صورت تصادفی انتخاب نموده و ترتیب گزینه‌های چهارگزینه‌ای را نیز جابجا می‌کند. نمره نهایی داوطلب دقیقا بر مبنای همان تعداد سوال نمایش‌داده‌شده محاسبه خواهد شد.
            </div>
          </div>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          سوالات آزمون ({questions.length} سوال)
        </h3>
        {questions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            هنوز سوالی برای این آزمون ثبت نشده است. از دکمه‌های زیر برای افزودن سوال استفاده کنید.
          </div>
        ) : (
          questions.map((q, idx) => renderQuestionForm(q, idx))
        )}
      </div>

      {/* Add questions buttons */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            افزودن سوال جدید:
          </span>
          <button
            onClick={() => handleAddQuestion(QuestionType.MultipleChoice)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            چهار گزینه‌ای
          </button>
          <button
            onClick={() => handleAddQuestion(QuestionType.Descriptive)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            تشریحی
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 text-xs sm:text-sm"
          >
            انصراف
          </button>
          <button
            onClick={handleSaveChanges}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md text-xs sm:text-sm"
          >
            <SaveIcon className="w-4 h-4" />
            ذخیره آزمون
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamBuilder;
