import React, { useState } from 'react';
import { BackIcon } from './icons/BackIcon';
import { Hospital, ArchivedArticleTemplate, NamedChecklistTemplate, ExamTemplate } from '../types';

interface ContentInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  archivedArticles: ArchivedArticleTemplate[];
  archivedChecklists?: NamedChecklistTemplate[];
  archivedExams?: ExamTemplate[];
  onInjectArticle: (hospitalId: string, departmentId: string | 'all', article: ArchivedArticleTemplate) => void;
  onInjectChecklist: (hospitalId: string, departmentId: string | 'all', checklist: NamedChecklistTemplate) => void;
  onInjectExam: (hospitalId: string, departmentId: string | 'all', exam: ExamTemplate) => void;
}

export const ContentInjectionModal: React.FC<ContentInjectionModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  archivedArticles,
  archivedChecklists = [],
  archivedExams = [],
  onInjectArticle,
  onInjectChecklist,
  onInjectExam,
}) => {
  const [contentType, setContentType] = useState<'article' | 'checklist' | 'exam'>('article');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitals[0]?.id || '');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  if (!isOpen) return null;

  const targetHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  const handleInject = () => {
    if (!targetHospital) {
      alert('لطفاً بیمارستان مقصد را انتخاب کنید.');
      return;
    }

    if (contentType === 'article') {
      const article = archivedArticles.find(a => a.id === selectedItemId);
      if (!article) {
        alert('لطفاً یک مطلب آموزشی چندرسانه‌ای را از لیست انتخاب کنید.');
        return;
      }
      onInjectArticle(targetHospital.id, selectedDepartmentId, article);
      alert(`مطلب آموزشی "${article.title}" با موفقیت به بخش(های) انتخاب‌شده در بیمارستان ${targetHospital.name} تزریق شد.`);
      onClose();
    } else if (contentType === 'checklist') {
      const checklist = archivedChecklists.find(c => c.id === selectedItemId);
      if (!checklist) {
        alert('لطفاً یک چک‌لیست الگو را انتخاب کنید.');
        return;
      }
      onInjectChecklist(targetHospital.id, selectedDepartmentId, checklist);
      alert(`چک‌لیست ارزیابی "${checklist.name}" با موفقیت تزریق شد.`);
      onClose();
    } else if (contentType === 'exam') {
      const exam = archivedExams.find(e => e.id === selectedItemId);
      if (!exam) {
        alert('لطفاً یک آزمون بالینی را انتخاب کنید.');
        return;
      }
      onInjectExam(targetHospital.id, selectedDepartmentId, exam);
      alert(`آزمون "${exam.name}" با موفقیت تزریق شد.`);
      onClose();
    }
  };

  // This used to be a popup Modal. It's now rendered as a full, standalone page (fixed,
  // full-viewport, its own scroll area and a sticky header with a real back button) so it
  // opens the same way the app's other full pages do, instead of a small dialog on top of
  // the dashboard.
  return (
    <div className="fixed inset-0 z-40 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gradient-to-l from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/30 hover:bg-white/50 rounded-xl text-xs sm:text-sm font-black transition active:scale-95"
          >
            <BackIcon className="w-4 h-4" />
            <span>بازگشت</span>
          </button>
          <h2 className="text-xs sm:text-base font-black text-left sm:text-right">
            تزریق مستقیم مطالب آموزشی، چک‌لیست یا آزمون
          </h2>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 text-right font-sans">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          با این قابلیت مدیریتی، می‌توانید مطالب آموزشی چندرسانه‌ای ذخیره‌شده، چک‌لیست‌های الگو یا آزمون‌های طراحی‌شده را مستقیماً به یک بخش خاص یا تمام بخش‌های یک بیمارستان تزریق و منتشر نمایید.
        </p>

        {/* Step 1: Content Type Switcher */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            ۱. انتخاب نوع محتوای تزریقی:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => {
                setContentType('article');
                setSelectedItemId('');
              }}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                contentType === 'article'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-xl">📝</span>
              <span className="text-xs font-bold">مطلب آموزشی چندرسانه‌ای</span>
              <span className="text-[10px] text-slate-400">({archivedArticles.length} مورد ذخیره‌شده)</span>
            </button>

            <button
              onClick={() => {
                setContentType('checklist');
                setSelectedItemId('');
              }}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                contentType === 'checklist'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-xl">📋</span>
              <span className="text-xs font-bold">چک‌لیست ارزیابی الگو</span>
              <span className="text-[10px] text-slate-400">({archivedChecklists.length} مورد ذخیره‌شده)</span>
            </button>

            <button
              onClick={() => {
                setContentType('exam');
                setSelectedItemId('');
              }}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                contentType === 'exam'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-xl">📑</span>
              <span className="text-xs font-bold">آزمون بالینی آنلاین</span>
              <span className="text-[10px] text-slate-400">({archivedExams.length} مورد ذخیره‌شده)</span>
            </button>
          </div>
        </div>

        {/* Step 2: Select Item from Archived Repository */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            ۲. انتخاب فایل/الگو از مخزن ذخیره‌شده‌ها:
          </label>

          {contentType === 'article' && (
            archivedArticles.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                هنوز هیچ مطلب چندرسانه‌ای در مخزن ذخیره نشده است. (در صفحه آموزش بخش‌ها، دکمه ذخیره در مخزن را لمس کنید).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {archivedArticles.map(art => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedItemId(art.id)}
                    className={`p-3 text-right rounded-xl border transition ${
                      selectedItemId === art.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {art.title}
                    </h5>
                    <p className="text-[10px] text-slate-500 truncate mt-1">
                      {art.description || 'بدون توضیح'}
                    </p>
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 font-mono mt-1 block">
                      تاریخ ثبت: {new Date(art.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}

          {contentType === 'checklist' && (
            archivedChecklists.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                هیچ چک‌لیست الگویی در مخزن یافت نشد.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {archivedChecklists.map(chk => (
                  <button
                    key={chk.id}
                    onClick={() => setSelectedItemId(chk.id)}
                    className={`p-3 text-right rounded-xl border transition ${
                      selectedItemId === chk.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {chk.name}
                    </h5>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
                      {chk.categories?.length || 0} محور مهارتی
                    </span>
                  </button>
                ))}
              </div>
            )
          )}

          {contentType === 'exam' && (
            archivedExams.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                هیچ آزمون بالینی ذخیره‌شده‌ای یافت نشد.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {archivedExams.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedItemId(ex.id)}
                    className={`p-3 text-right rounded-xl border transition ${
                      selectedItemId === ex.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {ex.name}
                    </h5>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block mt-1">
                      {ex.questions?.length || 0} سوال در بانک
                    </span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Step 3: Target Hospital & Department */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            ۳. انتخاب مقصد تزریق (بیمارستان و بخش):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                بیمارستان مقصد:
              </label>
              <select
                value={selectedHospitalId}
                onChange={e => {
                  setSelectedHospitalId(e.target.value);
                  setSelectedDepartmentId('all');
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.province})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                بخش مقصد:
              </label>
              <select
                value={selectedDepartmentId}
                onChange={e => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">🌟 تمامی بخش‌های این بیمارستان</option>
                {targetHospital?.departments.map(d => (
                  <option key={d.id} value={d.id}>
                    بخش {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            انصراف
          </button>

          <button
            onClick={handleInject}
            disabled={!selectedItemId}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>💉 انجام تزریق مستقیم محتوا</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentInjectionModal;
