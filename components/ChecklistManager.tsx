import React, { useState } from 'react';
import { NamedChecklistTemplate } from '../types';
import ChecklistBuilder from './ChecklistBuilder';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import * as XLSX from 'xlsx';

interface ChecklistManagerProps {
  templates: NamedChecklistTemplate[];
  onAddOrUpdate: (template: NamedChecklistTemplate) => void;
  onDelete: (templateId: string) => void;
  onBack: () => void;
}

const ChecklistManager: React.FC<ChecklistManagerProps> = ({ templates, onAddOrUpdate, onDelete, onBack }) => {
    const [editingTemplate, setEditingTemplate] = useState<NamedChecklistTemplate | null>(null);

    const handleAddNew = () => {
        setEditingTemplate({
            id: Date.now().toString(),
            name: '',
            categories: []
        });
    };

    const handleSave = (template: NamedChecklistTemplate) => {
        onAddOrUpdate(template);
        setEditingTemplate(null);
    };

    const handleDelete = (templateId: string, templateName: string) => {
        if(window.confirm(`آیا از حذف قالب چک لیست "${templateName}" مطمئن هستید؟ این عمل قابل بازگشت نیست.`)){
            onDelete(templateId);
        }
    }

    const handleDownloadTemplate = (template: NamedChecklistTemplate) => {
        const header = [
            ["نام قالب چک لیست:", template.name],
            ["بازه نمره:", `${template.minScore ?? 0} to ${template.maxScore ?? 4}`],
            ["شناسه قالب:", template.id]
        ];

        const data: (string | number)[][] = [];
        template.categories.forEach(cat => {
            cat.items.forEach(item => {
                data.push([cat.name, item.description, '']); // Empty score column
            });
        });

        const ws = XLSX.utils.aoa_to_sheet([
            ...header,
            [], // Empty row for spacing
            ['دسته', 'شرح مهارت', 'نمره']
        ]);
        XLSX.utils.sheet_add_aoa(ws, data, { origin: 'A6' });

        ws['!cols'] = [ { wch: 25 }, { wch: 50 }, { wch: 10 } ];
        
        // Add RTL property to the sheet
        if(!ws['!props']) ws['!props'] = {};
        ws['!props'].RTL = true;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
        
        const filename = `قالب_${template.name.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    if (editingTemplate) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <ChecklistBuilder 
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
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مدیریت قالب‌های چک‌لیست</h1>
                <button
                    onClick={handleAddNew}
                    className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <PlusIcon className="w-5 h-5" />
                    افزودن قالب جدید
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow">
                    <h2 className="text-xl font-medium text-slate-500">هیچ قالبی یافت نشد.</h2>
                    <p className="text-slate-400 mt-2">برای شروع، یک قالب چک‌لیست جدید اضافه کنید.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                    <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">نام قالب</th>
                            <th scope="col" className="px-6 py-3">جزئیات</th>
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
                                <td className="px-6 py-4">
                                    {template.categories.length} دسته, {template.categories.reduce((acc, cat) => acc + cat.items.length, 0)} مورد
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDownloadTemplate(template)}
                                        className="p-2 text-slate-400 hover:text-green-500 rounded-full"
                                        aria-label="Download Template"
                                        title="دانلود قالب اکسل"
                                    >
                                        <DocumentIcon className="w-5 h-5" />
                                    </button>
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

export default ChecklistManager;