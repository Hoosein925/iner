import React, { useMemo } from 'react';
import { SkillCategory, SkillItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { AiIcon } from './icons/AiIcon';

interface SkillCategoryDisplayProps {
  category: SkillCategory;
  isEditing?: boolean;
  onCategoryChange?: (updatedCategory: SkillCategory) => void;
  onDeleteCategory?: () => void;
  maxPossibleScore?: number;
  onGenerateSkillTraining?: (item: SkillItem, categoryName: string) => void;
}

const MIN_SCORE_PERCENTAGE = 60;

const SkillCategoryDisplay: React.FC<SkillCategoryDisplayProps> = ({ 
  category, 
  isEditing = false, 
  onCategoryChange, 
  onDeleteCategory, 
  maxPossibleScore = 4,
  onGenerateSkillTraining
}) => {

  const { totalScore, maxScore, percentage } = useMemo(() => {
    if (!category || !category.items) return { totalScore: 0, maxScore: 0, percentage: 0 };
    // Filter items to ensure valid score values (0 to 5) are used in calculation
    const validItems = category.items.filter(item => typeof item.score === 'number' && item.score >= 0 && item.score <= (maxPossibleScore || 5));
    const total = validItems.reduce((sum, item) => sum + item.score, 0);
    const max = validItems.length * (maxPossibleScore || 4);
    const perc = max > 0 ? Math.min(100, (total / max) * 100) : 0;
    return { totalScore: total, maxScore: max, percentage: perc };
  }, [category, maxPossibleScore]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCategoryChange) {
      onCategoryChange({ ...category, name: e.target.value });
    }
  };

  const handleItemChange = (index: number, field: keyof SkillItem, value: string | number) => {
    if (onCategoryChange) {
      const newItems = [...category.items];
      const currentItem = { ...newItems[index] };
      
      if (field === 'score') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          currentItem[field] = isNaN(numValue) ? 0 : Math.max(0, Math.min(maxPossibleScore, numValue));
      } else {
          currentItem[field] = value as string;
      }

      newItems[index] = currentItem;
      onCategoryChange({ ...category, items: newItems });
    }
  };

  const handleAddItem = () => {
      if (onCategoryChange) {
          const newItems = [...category.items, { description: 'مهارت جدید', score: 0 }];
          onCategoryChange({ ...category, items: newItems });
      }
  }

  const handleDeleteItem = (index: number) => {
      if (onCategoryChange) {
          const newItems = category.items.filter((_, i) => i !== index);
          onCategoryChange({ ...category, items: newItems });
      }
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border-2 border-dashed border-slate-400 dark:border-slate-600">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <input
            type="text"
            value={category.name}
            onChange={handleNameChange}
            placeholder="نام دسته"
            className="text-2xl font-bold bg-transparent focus:outline-none focus:ring-0 border-none p-0 text-slate-800 dark:text-slate-100 w-full"
          />
          <button 
            onClick={onDeleteCategory}
            className="p-2 text-slate-400 hover:text-red-500 rounded-full"
            aria-label="Delete Category"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                      <th className="px-4 py-2">شرح مهارت</th>
                      <th className="px-4 py-2 w-32 text-center">نمره (از {maxPossibleScore})</th>
                      <th className="px-4 py-2 w-16"></th>
                  </tr>
              </thead>
              <tbody>
                  {category.items.map((item, index) => (
                      <tr key={index} className="border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-700/50">
                          <td className="p-2">
                              <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                              />
                          </td>
                          <td className="p-2">
                              <input
                                  type="number"
                                  value={item.score}
                                  onChange={(e) => handleItemChange(index, 'score', e.target.value)}
                                  min="0"
                                  max={maxPossibleScore}
                                  step="0.1"
                                  className="w-full px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 text-center"
                              />
                          </td>
                          <td className="p-2 text-center">
                              <button 
                                onClick={() => handleDeleteItem(index)}
                                className="p-2 text-slate-400 hover:text-red-500 rounded-full"
                                aria-label={`Delete skill ${item.description}`}
                              >
                                  <TrashIcon className="w-5 h-5" />
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>

        <div className="mt-4">
            <button
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <PlusIcon className="w-4 h-4" />
              افزودن مهارت
            </button>
        </div>
      </div>
    );
  }

  // --- Display View ---
  const isQualified = percentage >= MIN_SCORE_PERCENTAGE;
  const scoreColor = isQualified ? (percentage >= 80 ? 'bg-teal-500' : 'bg-amber-400') : 'bg-rose-500';
  const scoreTextColor = isQualified ? (percentage >= 80 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400') : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{category.name}</h3>
          {category?.items?.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
              {category.items.length} مهارت
            </span>
          )}
        </div>
        {category?.items?.length > 0 && (
             <span className={`px-3 py-1 text-sm font-semibold rounded-full shrink-0 ${isQualified ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'}`}>
                {isQualified ? 'احراز صلاحیت' : 'عدم احراز صلاحیت'}
            </span>
        )}
      </div>
      
      {category?.items?.length > 0 ? (
        <>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">امتیاز کل: {totalScore.toFixed(1)} / {maxScore}</span>
                    <span className={`text-lg font-bold ${scoreTextColor}`}>{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                    className={`h-4 rounded-full transition-all duration-500 ${scoreColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                ></div>
                </div>
            </div>
      
            <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0">
                    <tr>
                    <th scope="col" className="px-6 py-3">شرح مهارت</th>
                    <th scope="col" className="px-6 py-3 w-28 text-center">نمره (از {maxPossibleScore})</th>
                    <th scope="col" className="px-4 py-3 w-48 text-center">برنامه و آموزش هوشمند</th>
                    </tr>
                </thead>
                <tbody>
                    {category.items.map((item, index) => (
                    <tr key={index} className="border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-700/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white leading-relaxed">{item.description}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200">{item.score}</td>
                        <td className="px-4 py-3 text-center">
                            <button
                                onClick={() => onGenerateSkillTraining?.(item, category.name)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all whitespace-nowrap transform hover:-translate-y-0.5"
                                title="ایجاد برنامه آموزشی و آموزش کامل طبق گایدلاین‌ها با هوش مصنوعی"
                            >
                                <AiIcon className="w-3.5 h-3.5 text-amber-300" />
                                <span>برنامه و آموزش AI</span>
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </>
      ) : (
        <p className="text-center py-8 text-slate-400">هیچ موردی برای نمایش در این دسته وجود ندارد.</p>
      )}
    </div>
  );
};

export default SkillCategoryDisplay;
