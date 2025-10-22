
import React, { useState } from 'react';
import { ExamTemplate } from '../types';
import ExamBuilder from './ExamBuilder';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ExamManagerProps {
  templates: ExamTemplate[];
  onAddOrUpdate: (template: ExamTemplate) => void;
  onDelete: (templateId: string) => void;
  onBack: () => void;
}

const ExamManager: React.FC<ExamManagerProps> = ({ templates, onAddOrUpdate, onDelete, onBack }) => {
    const [editingTemplate, setEditingTemplate] = useState<ExamTemplate | null>(null);

    const handleAddNew = () => {
        setEditingTemplate({
            id: Date.now().toString(),
            name: '',
            questions: [],
            month: 'عمومی',
        });
    };

    const handleSave = (template: ExamTemplate) => {
        onAddOrUpdate(template);
        setEditingTemplate(null);
    };

    const handleDelete = (templateId: string, templateName: string) => {
        if(window.confirm(`آیا از حذف آزمون "${templateName}" مطمئن هستید؟ این عمل قابل بازگشت نیست.`)){
            onDelete(templateId);
        }
    }

    if (editingTemplate) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <ExamBuilder 
                    template={editingTemplate} 
                    onSave={handleSave} 
                    onCancel={() => setEditingTemplate(null)}
                />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مدیریت آزمون‌ها</h1>
                <button
                    onClick={handleAddNew}
                    className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                    <PlusIcon className="w-5 h-5" />
                    افزودن آزمون جدید
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <h2 className="text-xl font-medium text-slate-500">هیچ آزمونی یافت نشد.</h2>
                    <p className="text-slate-400 mt-2">برای شروع، یک آزمون جدید اضافه کنید.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">نام آزمون</th>
                            <th scope="col" className="px-6 py-3 text-center">ماه</th>
                            <th scope="col" className="px-6 py-3 text-center">تعداد سوالات</th>
                            <th scope="col" className="px-6 py-3 text-center">
                            <span className="sr-only">اقدامات</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {templates.map((template) => (
                            <tr key={template.id} className="group border-b dark:border-slate-700 odd:bg-white odd:dark:bg-slate-800 even:bg-slate-50 even:dark:bg-slate-700/50">
                            <td scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                {template.name}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {template.month || 'عمومی'}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {template.questions.length}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setEditingTemplate(template)}
                                    className="p-2 text-slate-400 hover:text-indigo-500 rounded-full"
                                    aria-label="Edit Template"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id, template.name)}
                                    className="p-2 text-slate-400 hover:text-red-500 rounded-full"
                                    aria-label="Delete Template"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                                </div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ExamManager;