import React, { useState } from 'react';
import { ChecklistCategoryTemplate, ChecklistItemTemplate, NamedChecklistTemplate } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SaveIcon } from './icons/SaveIcon';

interface ChecklistBuilderProps {
  template: NamedChecklistTemplate;
  onSave: (newTemplate: NamedChecklistTemplate) => void;
  onCancel: () => void;
}

const ChecklistBuilder: React.FC<ChecklistBuilderProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template.name || '');
  const [minScore, setMinScore] = useState<number>(template.minScore ?? 0);
  const [maxScore, setMaxScore] = useState<number>(template.maxScore ?? 4);
  const [categories, setCategories] = useState<ChecklistCategoryTemplate[]>(
    () => JSON.parse(JSON.stringify(template.categories || [])) // Deep copy
  );

  const handleAddCategory = () => {
    const newCategory: ChecklistCategoryTemplate = {
      id: Date.now().toString(),
      name: 'دسته بندی جدید',
      items: [],
    };
    setCategories([...categories, newCategory]);
  };

  const handleCategoryChange = (categoryId: string, field: 'name', value: string) => {
    setCategories(
      categories.map(cat => (cat.id === categoryId ? { ...cat, [field]: value } : cat))
    );
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('آیا از حذف این دسته و تمام موارد آن مطمئن هستید؟')) {
      setCategories(categories.filter(cat => cat.id !== categoryId));
    }
  };

  const handleAddItem = (categoryId: string) => {
    const newItem: ChecklistItemTemplate = {
      id: Date.now().toString(),
      description: 'مورد مهارت جدید',
    };
    setCategories(
      categories.map(cat =>
        cat.id === categoryId ? { ...cat, items: [...cat.items, newItem] } : cat
      )
    );
  };
  
  const handleItemChange = (categoryId: string, itemId: string, value: string) => {
      setCategories(categories.map(cat => 
        cat.id === categoryId ? {
            ...cat,
            items: cat.items.map(item => 
                item.id === itemId ? {...item, description: value} : item
            )
        } : cat
      ))
  }

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    setCategories(
      categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.filter(item => item.id !== itemId) }
          : cat
      )
    );
  };
  
  const handleSaveChanges = () => {
    if (!name.trim()) {
        alert('نام چک لیست نمی‌تواند خالی باشد.');
        return;
    }
    const numMin = Number(minScore);
    const numMax = Number(maxScore);
    if (isNaN(numMin) || isNaN(numMax)) {
        alert('مقادیر حداقل و حداکثر نمره باید عدد باشند.');
        return;
    }
    if (numMin >= numMax) {
        alert('حداقل نمره باید کمتر از حداکثر نمره باشد.');
        return;
    }

    onSave({ ...template, name: name.trim(), minScore: numMin, maxScore: numMax, categories });
    alert('قالب با موفقیت ذخیره شد.');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
            <h2 className="text-2xl font-bold">ساخت / ویرایش قالب چک‌لیست</h2>
            <p className="text-slate-500 dark:text-slate-400">یک قالب برای ارزیابی عملکردی پرسنل ایجاد کنید.</p>
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
                ذخیره قالب
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1">
              <label htmlFor="template-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  نام قالب
              </label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: چک لیست عمومی پرستاری"
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
          </div>
          <div>
              <label htmlFor="min-score" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  حداقل نمره
              </label>
              <input
                id="min-score"
                type="number"
                value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
          </div>
          <div>
              <label htmlFor="max-score" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  حداکثر نمره
              </label>
              <input
                id="max-score"
                type="number"
                value={maxScore}
                onChange={e => setMaxScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
          </div>
      </div>

      <div className="space-y-6">
        {categories.map(cat => (
          <div key={cat.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                value={cat.name}
                onChange={e => handleCategoryChange(cat.id, 'name', e.target.value)}
                placeholder="نام دسته"
                className="text-lg font-bold bg-transparent focus:outline-none focus:ring-0 border-none p-0 text-slate-800 dark:text-slate-100 w-full"
              />
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="p-2 text-slate-400 hover:text-red-500 rounded-full"
                aria-label="Delete Category"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 pl-4">
                {cat.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(cat.id, item.id, e.target.value)}
                            className="flex-grow px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="شرح مهارت"
                        />
                         <button
                            onClick={() => handleDeleteItem(cat.id, item.id)}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-full"
                            aria-label={`Delete skill ${item.description}`}
                          >
                              <TrashIcon className="w-4 h-4" />
                          </button>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <button
                  onClick={() => handleAddItem(cat.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900"
                >
                  <PlusIcon className="w-4 h-4" />
                  افزودن مورد
                </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
        <button
          onClick={handleAddCategory}
          className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700"
        >
          <PlusIcon className="w-5 h-5" />
          افزودن دسته بندی جدید
        </button>
      </div>
    </div>
  );
};

export default ChecklistBuilder;
