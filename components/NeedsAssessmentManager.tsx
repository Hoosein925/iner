

import React, { useState, useMemo } from 'react';
import { Hospital, NeedsAssessmentTopic } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DocumentIcon } from './icons/DocumentIcon';

interface NeedsAssessmentManagerProps {
  hospital: Hospital;
  onUpdateTopics: (month: string, topics: NeedsAssessmentTopic[]) => void;
  onBack: () => void;
  activeYear: number;
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

const NeedsAssessmentManager: React.FC<NeedsAssessmentManagerProps> = ({ hospital, onUpdateTopics, onBack, activeYear }) => {
    const [selectedMonth, setSelectedMonth] = useState<string>(PERSIAN_MONTHS[0]);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicDescription, setNewTopicDescription] = useState('');

    const topicsForSelectedMonth = useMemo(() => {
        return hospital.needsAssessments?.find(na => na.month === selectedMonth && na.year === activeYear)?.topics || [];
    }, [hospital.needsAssessments, selectedMonth, activeYear]);

    const handleAddTopic = () => {
        if (!newTopicTitle.trim()) {
            alert('عنوان موضوع نمی‌تواند خالی باشد.');
            return;
        }
        const newTopic: NeedsAssessmentTopic = {
            id: Date.now().toString(),
            title: newTopicTitle.trim(),
            description: newTopicDescription.trim() || undefined,
            responses: [],
        };
        const updatedTopics = [...topicsForSelectedMonth, newTopic];
        onUpdateTopics(selectedMonth, updatedTopics);
        setNewTopicTitle('');
        setNewTopicDescription('');
    };

    const handleDeleteTopic = (topicId: string) => {
        if (window.confirm('آیا از حذف این موضوع و تمام نظرات ثبت‌شده برای آن مطمئن هستید؟')) {
            const updatedTopics = topicsForSelectedMonth.filter(t => t.id !== topicId);
            onUpdateTopics(selectedMonth, updatedTopics);
        }
    };
    
    const handleDownloadWord = () => {
        if (topicsForSelectedMonth.length === 0 || topicsForSelectedMonth.every(t => t.responses.length === 0)) {
            alert(`هیچ نظری برای دانلود در ماه ${selectedMonth} سال ${activeYear} ثبت نشده است.`);
            return;
        }

        let content = `<div dir="rtl"><h1>نتایج نیازسنجی و نظرسنجی برای ماه ${selectedMonth} سال ${activeYear}</h1>`;
        
        topicsForSelectedMonth.forEach(topic => {
            if (topic.responses.length > 0) {
                 content += `<br /><hr size="1" /><br />`;
                content += `<h2>موضوع: ${topic.title}</h2>`;
                if (topic.description) {
                    content += `<p style="color: #555;"><i>توضیحات: ${topic.description}</i></p>`;
                }
                content += '<h3>پاسخ‌ها:</h3>';
                content += '<ul style="list-style-type: disc; margin-right: 20px;">';
                topic.responses.forEach(res => {
                    content += `<li style="margin-bottom: 10px;"><b>${res.staffName}:</b><p style="margin: 5px 0 0 0; padding-right: 15px;">${res.response.replace(/\n/g, '<br>')}</p></li>`;
                });
                content += '</ul>';
            }
        });
        
        content += '</div>'

        const sourceHTML = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                xmlns:w='urn:schemas-microsoft-com:office:word' 
                xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <title>نتایج نظرسنجی</title>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>90</w:Zoom>
                <w:RightToLeft/>
                <w:DoNotOptimizeForBrowser/>
              </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
              body { font-family: 'Vazirmatn', 'Times New Roman', serif; direction: rtl; }
              h1 { font-size: 22pt; }
              h2 { font-size: 18pt; color: #333; }
              h3 { font-size: 14pt; color: #444; }
              p, li { font-size: 12pt; }
            </style>
          </head>
          <body>
            ${content}
          </body>
          </html>`;
        
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `نتایج_نظرسنجی_${hospital.name}_${selectedMonth}_${activeYear}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مدیریت نیازسنجی و نظرسنجی - سال {activeYear}</h1>
                <button
                    onClick={handleDownloadWord}
                    className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <DocumentIcon className="w-5 h-5" />
                    دانلود کلیه نتایج (Word)
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <div className="mb-6">
                    <label htmlFor="month-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        انتخاب ماه برای تعریف موضوعات:
                    </label>
                    <select
                        id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {PERSIAN_MONTHS.map(month => (<option key={month} value={month}>{month}</option>))}
                    </select>
                </div>
                
                <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold mb-4">افزودن موضوع جدید برای ماه <span className="text-amber-500">{selectedMonth}</span></h2>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={newTopicTitle}
                            onChange={(e) => setNewTopicTitle(e.target.value)}
                            placeholder="عنوان (مثال: دوره آموزشی احیای قلبی ریوی)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                         <textarea
                            value={newTopicDescription}
                            onChange={(e) => setNewTopicDescription(e.target.value)}
                            placeholder="توضیحات (اختیاری - برای راهنمایی بیشتر پرسنل)"
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="text-left">
                            <button
                                onClick={handleAddTopic}
                                className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                            >
                                <PlusIcon className="w-5 h-5" />
                                افزودن موضوع
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4">موضوعات و نظرات ثبت‌شده برای <span className="text-amber-500">{selectedMonth}</span></h3>
                    {topicsForSelectedMonth.length === 0 ? (
                         <p className="text-center py-8 text-slate-400">هیچ موضوعی برای این ماه تعریف نشده است.</p>
                    ) : (
                         <div className="space-y-6">
                          {topicsForSelectedMonth.map(topic => (
                              <div key={topic.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-start rounded-t-lg gap-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{topic.title}</h4>
                                        {topic.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{topic.description}</p>}
                                    </div>
                                    <button onClick={() => handleDeleteTopic(topic.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full flex-shrink-0">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    {topic.responses.length === 0 ? (
                                        <p className="text-sm text-slate-400">هنوز نظری برای این موضوع ثبت نشده است.</p>
                                    ) : (
                                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-4">
                                            {topic.responses.map((res, index) => (
                                                <li key={index} className="text-sm border-r-2 border-slate-200 dark:border-slate-600 pr-3">
                                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{res.staffName}:</p>
                                                    <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{res.response}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NeedsAssessmentManager;