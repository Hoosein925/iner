
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

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const ExamBuilder: React.FC<ExamBuilderProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template.name || '');
  const [month, setMonth] = useState(template.month || 'عمومی');
  const [questions, setQuestions] = useState<Question[]>(
    () => JSON.parse(JSON.stringify(template.questions || [])) // Deep copy
  );

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: type,
      correctAnswer: '',
      ...(type === QuestionType.MultipleChoice && { options: ['', '', '', ''] })
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionChange = (qId: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map(q => (q.id === qId ? { ...q, [field]: value } : q))
    );
  };
  
  const handleOptionChange = (qId: string, optionIndex: number, value: string) => {
      setQuestions(questions.map(q => {
          if (q.id === qId && q.options) {
              const newOptions = [...q.options];
              newOptions[optionIndex] = value;
              // If this option was the correct answer, update the correct answer value as well
              if (q.correctAnswer === q.options[optionIndex]) {
                  return { ...q, options: newOptions, correctAnswer: value };
              }
              return { ...q, options: newOptions };
          }
          return q;
      }));
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
    onSave({ ...template, name, month, questions });
    alert('آزمون با موفقیت ذخیره شد.');
  }

  const renderQuestionForm = (q: Question) => {
    return (
      <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <select 
            value={q.type}
            onChange={(e) => handleQuestionChange(q.id, 'type', e.target.value)}
            className="p-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={QuestionType.MultipleChoice}>چهار گزینه‌ای</option>
            <option value={QuestionType.Descriptive}>تشریحی</option>
          </select>
          <button
            onClick={() => handleDeleteQuestion(q.id)}
            className="p-2 text-slate-400 hover:text-red-500 rounded-full"
            aria-label="Delete Question"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
        
        <textarea
          value={q.text}
          onChange={e => handleQuestionChange(q.id, 'text', e.target.value)}
          placeholder="متن سوال را اینجا بنویسید..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-3"
        />

        {q.type === QuestionType.MultipleChoice ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">گزینه‌ها را وارد کرده و پاسخ صحیح را انتخاب کنید:</p>
            {q.options?.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-answer-${q.id}`}
                  checked={q.correctAnswer === opt}
                  onChange={() => handleQuestionChange(q.id, 'correctAnswer', opt)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={e => handleOptionChange(q.id, index, e.target.value)}
                  placeholder={`گزینه ${index + 1}`}
                  className="flex-grow px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
             <p className="text-sm text-slate-500 mb-1">پاسخ نمونه یا کلید تصحیح را وارد کنید:</p>
             <textarea
                value={q.correctAnswer}
                onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value)}
                placeholder="پاسخ تشریحی..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
            <h2 className="text-2xl font-bold">ساخت / ویرایش آزمون</h2>
            <p className="text-slate-500 dark:text-slate-400">یک آزمون برای ارزیابی دانش تئوری پرسنل ایجاد کنید.</p>
        </div>
        <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
            >
              انصراف
            </button>
            <button 
                onClick={handleSaveChanges}
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
                <SaveIcon className="w-5 h-5"/>
                ذخیره آزمون
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
              <label htmlFor="exam-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  نام آزمون
              </label>
              <input
                id="exam-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: آزمون ایمنی بیمار"
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
          </div>
          <div>
             <label htmlFor="exam-month" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ماه برگزاری
              </label>
              <select
                id="exam-month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                  <option value="عمومی">عمومی (همه ماه‌ها)</option>
                  {PERSIAN_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
          </div>
      </div>


      <div className="space-y-6">
        {questions.map(q => renderQuestionForm(q))}
      </div>

      <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6 flex items-center gap-4">
        <p className="font-semibold">افزودن سوال جدید:</p>
        <button
          onClick={() => handleAddQuestion(QuestionType.MultipleChoice)}
          className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="w-5 h-5" />
          چهار گزینه‌ای
        </button>
        <button
          onClick={() => handleAddQuestion(QuestionType.Descriptive)}
          className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
        >
          <PlusIcon className="w-5 h-5" />
          تشریحی
        </button>
      </div>
    </div>
  );
};

export default ExamBuilder;