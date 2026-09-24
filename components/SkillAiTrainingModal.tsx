import React, { useRef, useState, useEffect } from 'react';
import { AiIcon } from './icons/AiIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { generateSkillTrainingWithAI } from '../services/geminiService';

interface SkillAiTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string;
  categoryName: string;
  departmentName: string;
  staffName?: string;
  currentScore?: number;
  maxScore?: number;
  userRole?: string;
}

export const SkillAiTrainingModal: React.FC<SkillAiTrainingModalProps> = ({
  isOpen,
  onClose,
  skillName,
  categoryName,
  departmentName,
  staffName,
  currentScore,
  maxScore = 4,
  userRole,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>('کپی متن');
  const [activeTab, setActiveTab] = useState<'full' | 'plan' | 'explanation' | 'steps'>('full');
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  const fetchTrainingData = async () => {
    if (!skillName) return;
    setIsLoading(true);
    setContent(null);
    try {
      const result = await generateSkillTrainingWithAI({
        skillName,
        categoryName,
        departmentName,
        staffName,
        currentScore,
        maxPossibleScore: maxScore,
        userRole,
      });
      setContent(result);
    } catch (err) {
      console.error('Error generating skill training:', err);
      setContent('خطا در بارگذاری آموزش مهارت با هوش مصنوعی.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && skillName) {
      fetchTrainingData();
    }
  }, [isOpen, skillName]);

  if (!isOpen) return null;

  const handleDownloadWord = async () => {
    if (!content || isExportingWord) return;
    setIsExportingWord(true);
    try {
      const { exportSkillTrainingToDocx } = await import('../services/wordExportService');
      await exportSkillTrainingToDocx({
        skillName,
        categoryName,
        departmentName,
        staffName,
        currentScore,
        maxScore,
        content,
      });
    } catch (err) {
      console.error('Failed to export skill training docx:', err);
      alert('خطا در ایجاد فایل ورد مهارت.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopyStatus('کپی شد ✓');
      setTimeout(() => setCopyStatus('کپی متن'), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to extract specific section from markdown
  const extractSection = (keyword: string): string => {
    if (!content) return '';
    const sections = content.split(/(?=\n## |\n# )/);
    const found = sections.find((s) => s.includes(keyword));
    return found ? found.trim() : '';
  };

  const planText = extractSection('برنامه آموزشی');
  const explanationText = extractSection('معرفی و شرح');
  const stepsText = extractSection('آموزش کامل و گام‌به‌گام');

  const displayedContent = () => {
    switch (activeTab) {
      case 'plan':
        return planText || content;
      case 'explanation':
        return explanationText || content;
      case 'steps':
        return stepsText || content;
      default:
        return content;
    }
  };

  // Formatter for markdown display including table support
  const formatMarkdown = (text: string | null) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table detection: lines starting with '|' and ending with '|'
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

          const dataRows = tableLines.slice(2).map((r) =>
            r
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );

          elements.push(
            <div key={`tbl-${i}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
              <table className="w-full text-right text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800">
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="p-2.5 font-bold text-emerald-900 dark:text-emerald-200 whitespace-nowrap border-l border-slate-200 dark:border-slate-700 last:border-l-0">
                        {renderBold(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-700/60">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 text-slate-700 dark:text-slate-300 border-l border-slate-200/60 dark:border-slate-700/60 last:border-l-0">
                          {renderBold(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-300 mt-6 mb-3 border-b pb-2 border-emerald-200 dark:border-emerald-800">
            {trimmed.replace('# ', '')}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold text-teal-800 dark:text-teal-300 mt-5 mb-2 bg-teal-50/80 dark:bg-teal-950/40 p-2.5 rounded-lg border-r-4 border-teal-600">
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            {trimmed.replace('### ', '')}
          </h3>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={`li-${i}`} className="mr-5 text-sm sm:text-base text-slate-700 dark:text-slate-300 my-1 leading-relaxed list-disc">
            {renderBold(trimmed.substring(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <div key={`num-${i}`} className="mr-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
            {renderBold(trimmed)}
          </div>
        );
      } else if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={`quote-${i}`} className="p-3 my-3 bg-amber-50 dark:bg-amber-950/30 border-r-4 border-amber-500 rounded-lg text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            {trimmed.replace('> ', '')}
          </blockquote>
        );
      } else if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={`hr-${i}`} className="my-5 border-slate-200 dark:border-slate-700" />);
      } else if (!trimmed) {
        elements.push(<div key={`sp-${i}`} className="h-2"></div>);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-sm sm:text-base text-slate-700 dark:text-slate-300 my-1.5 leading-relaxed">
            {renderBold(trimmed)}
          </p>
        );
      }

      i++;
    }

    return elements;
  };

  const renderBold = (txt: string) => {
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-right font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <AiIcon className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-300 text-slate-900 shadow-sm">
                  آموزش هوشمند مهارت بالینی
                </span>
                <span className="text-xs text-emerald-100 opacity-90">
                  منطبق بر گایدلاین‌ها و ۵ مرجع بالینی
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black mt-1 text-white tracking-tight">
                {skillName}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 opacity-90 mt-0.5">
                دسته: {categoryName} | بخش: {departmentName} {staffName ? `| پرسنل: ${staffName}` : ''}
                {currentScore !== undefined && ` | نمره ارزیابی: ${currentScore} از ${maxScore}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {!isLoading && (
              <button
                onClick={fetchTrainingData}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
                title="تولید مجدد با هوش مصنوعی"
              >
                <span>🔄</span>
                <span>تولید مجدد</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
              aria-label="بستن"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* References Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 border-b border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
          <div className="flex items-center gap-1.5">
            <span>📚 استناد دقیق:</span>
            <span>۱. گایدلاین‌های جهانی ۲. پاتر-پری ۳. برونر-سودارث ۴. بوکلت مادری ۵. استانداردهای اعتباربخشی بیمارستان</span>
          </div>
          <div className="text-emerald-700 dark:text-emerald-400 text-xs">
            آموزش استاندارد گام‌به‌گام و سنجه‌های ایمنی بیمار
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 pt-3 pb-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 overflow-x-auto text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('full')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'full'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📋 کل سند و آموزش
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'plan'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🎯 ۱. برنامه آموزشی مهارت
          </button>
          <button
            onClick={() => setActiveTab('explanation')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'explanation'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            💡 ۲. شرح و معرفی مهارت (چیست و چرا)
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'steps'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🩺 ۳. آموزش گام‌به‌گام و سنجه‌ها
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6" ref={contentRef}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <AiIcon className="w-6 h-6 text-emerald-600 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  در حال استخراج برنامه آموزشی و آموزش گام‌به‌گام مهارت...
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  استخراج دستورالعمل تکنیکال و مراجع کتاب پاتر-پری، برونر-سودارث و سنجه‌های اعتباربخشی وزارت بهداشت
                </p>
              </div>
            </div>
          ) : content ? (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              {formatMarkdown(displayedContent())}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">محتوایی یافت نشد.</div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            آموزش بالینی بر پایه ۵ منبع اجباری و استاندارد اعتباربخشی بیمارستان تدوین گردیده است.
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm"
            >
              {copyStatus}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>چاپ</span>
            </button>

            {/* Requested Word Download Button */}
            <button
              onClick={handleDownloadWord}
              disabled={!content || isLoading || isExportingWord}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md flex items-center gap-2"
            >
              <DocumentIcon className="w-5 h-5 text-amber-300" />
              <span>{isExportingWord ? 'در حال آماده‌سازی فایل ورد...' : '📥 دانلود فایل ورد (.docx)'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white text-xs sm:text-sm font-semibold rounded-xl transition"
            >
              بستن
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default SkillAiTrainingModal;
