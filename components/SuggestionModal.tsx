import React, { useRef, useState } from 'react';
import { AiIcon } from './icons/AiIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { askCustomQuestionWithAI } from '../services/geminiService';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string | null;
  isLoading: boolean;
  contextName?: string;
  evaluatedStaffCount?: number;
  overallAvg?: number;
  genAvg?: number;
  specAvg?: number;
  commAvg?: number;
  skillsData?: any;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  isLoading,
  contextName,
  evaluatedStaffCount = 1,
  overallAvg = 80,
  genAvg = 80,
  specAvg = 80,
  commAvg = 80,
  skillsData,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const [userQuery, setUserQuery] = useState<string>('');
  const [qnaHistory, setQnaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isAsking) return;

    setIsAsking(true);
    const q = userQuery;
    try {
      const ans = await askCustomQuestionWithAI({
        contextName: contextName || title,
        evaluatedStaffCount,
        overallAvg,
        genAvg,
        specAvg,
        commAvg,
        userQuery: q,
        skillsData,
      });
      setQnaHistory((prev) => [...prev, { question: q, answer: ans }]);
      setUserQuery('');
    } catch (err) {
      console.error(err);
      alert('خطا در پاسخ‌گویی هوش مصنوعی');
    } finally {
      setIsAsking(false);
    }
  };

  const handleDownloadWord = () => {
    if (!contentRef.current) return;

    const staffName = title.replace('برنامه پیشنهادی برای ', '').replace('برنامه بهبود برای ', '');
    const filename = `برنامه-بهبود-${staffName.replace(/ /g, '_')}.doc`;
    
    // Get the innerHTML of the formatted content and Q&A history
    const contentHtml = contentRef.current.innerHTML || '';

    // Create the full HTML structure for the Word document
    const sourceHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Improvement Plan</title>
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
          body { font-family: 'Vazirmatn', 'Times New Roman', serif; direction: rtl; text-align: right; }
          @page WordSection1 {
            size: 8.5in 11.0in;
            margin: 1.0in 1.0in 1.0in 1.0in;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          h1 { color: #1e1b4b; font-size: 20pt; }
          h2 { color: #0f766e; font-size: 16pt; margin-top: 15pt; }
          strong { font-weight: bold; }
          blockquote { border-right: 4px solid #0284c7; padding-right: 10px; margin-right: 0; font-style: italic; color: #334155; }
          hr { border-top: 1px solid #cbd5e1; margin: 15pt 0; }
          .q-box { background-color: #f1f5f9; padding: 10pt; border-radius: 6pt; margin-top: 10pt; font-weight: bold; }
          .a-box { background-color: #f8fafc; padding: 10pt; border-right: 3pt solid #10b981; margin-bottom: 15pt; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <h1>${title}</h1>
          <p style="font-size:10pt; color:#64748b;"><strong>📚 مراجع تحلیل و پاسخ‌دهی:</strong> گایدلاین‌های جهانی بالینی، اصول پرستاری پاتر و پری، پرستاری برونر و سودارث، بوکلت مادری و سلامت کودک، سنجه‌های اعتباربخشی وزارت بهداشت ایران</p>
          <hr />
          ${contentHtml}
        </div>
      </body>
      </html>`;

    // Create a Blob and trigger download
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = filename;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const formatContent = (text: string | null): string => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/---/g, '<hr class="my-4 border-slate-300 dark:border-slate-600" />')
      .replace(/<QUOTE>(.*?)<\/QUOTE>/gs, (match, p1) => `<blockquote class="border-r-4 border-slate-300 dark:border-slate-600 pr-4 italic text-slate-500 dark:text-slate-400 my-4">${p1.trim().replace(/\n/g, '<br />')}</blockquote>`)
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/90">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AiIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تحلیل و پاسخ‌دهی هوشمند بر اساس ۵ مرجع رسمی بالینی و اعتباربخشی
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* References Banner */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 px-5 py-2.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2 flex-wrap">
          <span className="font-bold bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 px-2 py-0.5 rounded-md">
            📚 مراجع پاسخ‌دهی:
          </span>
          <span>گایدلاین‌های جهانی بالینی</span>
          <span>•</span>
          <span>پاتر و پری</span>
          <span>•</span>
          <span>برونر و سودارث</span>
          <span>•</span>
          <span>بوکلت مادری و سلامت کودک</span>
          <span>•</span>
          <span>اعتباربخشی وزارت بهداشت</span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-grow bg-white dark:bg-slate-800 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">در حال تولید برنامه بهبود و تحلیل هوشمند متکی بر مراجع بالینی...</p>
            </div>
          ) : (
            <div ref={contentRef} className="bg-white dark:bg-slate-800 space-y-6">
              {/* Primary AI Content */}
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatContent(content) }}></div>

              {/* Custom Q&A History inside downloadable area */}
              {qnaHistory.length > 0 && (
                <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
                  <h4 className="font-bold text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                    <AiIcon className="w-5 h-5" />
                    پرسش‌ها و پاسخ‌های اختصاصی کاربر
                  </h4>
                  {qnaHistory.map((item, idx) => (
                    <div key={idx} className="space-y-2 bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ❓ سوال کاربر: {item.question}
                      </p>
                      <div
                        className="prose prose-slate dark:prose-invert text-xs leading-relaxed text-slate-700 dark:text-slate-300 border-r-2 border-emerald-500 pr-3 pt-1"
                        dangerouslySetInnerHTML={{ __html: formatContent(item.answer) }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Question Form Box */}
          {!isLoading && content && (
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <AiIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                پرسش سوال اختصاصی از هوش مصنوعی بر اساس نمرات و ۵ مرجع بالینی:
              </label>
              <form onSubmit={handleAskQuestion} className="space-y-3">
                <textarea
                  rows={2}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="مثال: بر اساس نمرات مهارت تزریقات، دقیقاً چه کارگاهی در کتاب پاتر و پری و سنجه‌های اعتباربخشی توصیه شده است؟"
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAsking || !userQuery.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-2"
                  >
                    {isAsking ? (
                      <>
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        در حال دریافت پاسخ...
                      </>
                    ) : (
                      <>
                        <AiIcon className="w-4 h-4" />
                        ارسال سوال به هوش مصنوعی
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!isLoading && content && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center gap-3 bg-slate-50 dark:bg-slate-800/90">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              شامل تحلیل کل + سوالات پاسخ‌داده‌شده در فایل ورد
            </span>
            <button 
              onClick={handleDownloadWord} 
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <DocumentIcon className="w-4 h-4" />
              دانلود فایل Word (شامل تحلیل و سوالات)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionModal;