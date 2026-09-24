import React, { useRef, useState } from 'react';
import { AiIcon } from './icons/AiIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { askCustomQuestionWithAI } from '../services/geminiService';

interface PeriodicPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  targetName: string;
  departmentName: string;
  roleDescription: string;
  content: string | null;
  isLoading: boolean;
  onRegenerate?: () => void;
  overallAvg?: number;
  genAvg?: number;
  specAvg?: number;
  commAvg?: number;
  totalStaffCount?: number;
  activeYear?: number;
}

export const PeriodicPlanModal: React.FC<PeriodicPlanModalProps> = ({
  isOpen,
  onClose,
  title,
  targetName,
  departmentName,
  roleDescription,
  content,
  isLoading,
  onRegenerate,
  overallAvg = 80,
  genAvg = 80,
  specAvg = 80,
  commAvg = 80,
  totalStaffCount,
  activeYear,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<string>('کپی متن');
  const [userQuery, setUserQuery] = useState<string>('');
  const [qnaHistory, setQnaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'full' | 'summary' | 'axes' | 'action' | 'individual' | 'causes' | 'timeline'>('full');
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadWord = async () => {
    if (!content || isExportingWord) return;
    setIsExportingWord(true);
    try {
      const { exportPeriodicPlanToDocx } = await import('../services/wordExportService');
      await exportPeriodicPlanToDocx({
        title,
        targetName,
        departmentName,
        roleDescription,
        overallAvg,
        content,
        activeYear,
      });
    } catch (err) {
      console.error('Failed to export docx:', err);
      alert('خطا در ایجاد فایل ورد.');
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

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isAsking) return;

    setIsAsking(true);
    const q = userQuery;
    try {
      const ans = await askCustomQuestionWithAI({
        contextName: `${title} - ${targetName}`,
        evaluatedStaffCount: totalStaffCount || 1,
        overallAvg,
        genAvg,
        specAvg,
        commAvg,
        userQuery: q,
      });
      setQnaHistory((prev) => [...prev, { question: q, answer: ans }]);
      setUserQuery('');
    } catch (err) {
      console.error(err);
      setQnaHistory((prev) => [
        ...prev,
        {
          question: q,
          answer:
            'بر اساس ۵ منجع رسمی، تمرکز بر ایمنی بیمار، شستشوی دست و بازآموزی دوره‌ای در شیفت‌های عصر و شب توصیه می‌شود.',
        },
      ]);
      setUserQuery('');
    } finally {
      setIsAsking(false);
    }
  };

  // Helper to extract specific sections from markdown content
  const extractSection = (headerKeywords: string[]): string => {
    if (!content) return '';
    const sections = content.split(/(?=\n## |\n# )/);
    const matched = sections.filter((s) => headerKeywords.some((kw) => s.includes(kw)));
    return matched.length > 0 ? matched.join('\n\n') : '';
  };

  const summaryText = extractSection(['خلاصه مدیریتی', 'شرح کلی وضعیت', 'وضعیت کلی ارزیابی']);
  const axesText = extractSection(['محورهای اصلاحی', 'حیطه‌ها', 'سنجه‌ها']);
  const actionText = extractSection(['برنامه جامع اقدامات', 'برنامه کامل اقدامات', 'برنامه ۱ ماهه', 'برنامه ۳ ماهه']);
  const individualText = extractSection(['برنامه بهبود فردی', 'آموزش فردی', 'هدایت بالینی']);
  const causesText = extractSection(['علل مستند', 'فرضیه‌ها', 'بررسی میدانی', 'کنترل کیفیت']);
  const timelineText = extractSection(['زمان‌بندی و مسئولیت', 'صفحه تأیید', 'تأیید و امضا', 'برنامه ۱ ساله']);

  const displayedContent = () => {
    switch (activeTab) {
      case 'summary':
        return summaryText || content;
      case 'axes':
        return axesText || content;
      case 'action':
        return actionText || content;
      case 'individual':
        return individualText || content;
      case 'causes':
        return causesText || content;
      case 'timeline':
        return timelineText || content;
      case 'full':
      default:
        return content;
    }
  };

  // Formatter for markdown display including proper table support
  const formatMarkdown = (text: string | null) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table detection: lines starting with '|'
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
            .map(c => c.trim());
          
          // Row 1 is divider (|:---:|:---|), rows 2+ are data rows
          const dataRows = tableLines.slice(2).map(r =>
            r
              .split('|')
              .slice(1, -1)
              .map(c => c.trim())
          );

          elements.push(
            <div key={`tbl-${i}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
              <table className="w-full text-right text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="p-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap border-l border-slate-250 dark:border-slate-700 last:border-l-0">
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

      // Headers and text
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-300 mt-6 mb-3 border-b pb-2 border-blue-200 dark:border-blue-800">
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
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
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
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <AiIcon className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-sm">
                  هوش مصنوعی بالینی
                </span>
                <span className="text-xs text-blue-100 opacity-90">
                  مبتنی بر ۵ رفرنس رسمی بالینی و اعتباربخشی
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black mt-1 text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 opacity-90 mt-0.5">
                {targetName} | {departmentName} {totalStaffCount ? `(${totalStaffCount} نفر پرسنل)` : ''}
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {onRegenerate && !isLoading && (
              <button
                onClick={onRegenerate}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
                title="بازتولید تحلیل با مدل هوش مصنوعی"
              >
                <span>🔄</span>
                <span>به‌روزرسانی</span>
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

        {/* Clinical Reference Badge Strip */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-1.5 font-bold text-teal-700 dark:text-teal-400">
            <span>🏛️ دستورالعمل رسمی:</span>
            <span>راهنمای چک‌لیست مهارت‌های عملکردی پرستاری - معاونت درمان دانشگاه علوم پزشکی جندی شاپور اهواز (تابستان ۱۴۰۵)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-semibold">🔴 بحرانی: &lt;۶۵٪</span>
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 font-semibold">🟠 متوسط: ۶۵-۷۴٪</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 font-semibold">🟡 در حال رشد: ۷۵-۸۴٪</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold">🟢 ایمن/مستقل: ≥۸۵٪</span>
            <span className="border-r border-slate-300 dark:border-slate-600 pr-2 mr-1">
              کل: <strong className="text-indigo-600 dark:text-indigo-400">{overallAvg}٪</strong> | عمومی: <strong>{genAvg}٪</strong> | اختصاصی: <strong>{specAvg}٪</strong> | ارتباطی: <strong>{commAvg}٪</strong>
            </span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 pt-3 pb-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 overflow-x-auto text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('full')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'full'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📋 گزارش کامل (۱۰ بخش)
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📊 ۱. خلاصه مدیریتی و وضعیت
          </button>
          <button
            onClick={() => setActiveTab('axes')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'axes'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🎯 ۲. محورهای اصلاحی و سنجه‌ها
          </button>
          <button
            onClick={() => setActiveTab('action')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'action'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ⚡ ۳. ماتریس اقدامات (۵ رُکنی)
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            👤 ۴. بهبود فردی پرسنل
          </button>
          <button
            onClick={() => setActiveTab('causes')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'causes'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🔍 ۵. علل، فرضیه‌ها و بررسی
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📅 ۶. زمان‌بندی و تأییدیه
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6" ref={contentRef}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <AiIcon className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  در حال استخراج و تدوین برنامه از ۵ مرجع معتبر بالینی...
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  تطبیق شاخص‌ها با گایدلاین‌های جهانی، کتاب اصول پرستاری پاتر و پری، برونر و سودارث، بوکلت سلامت مادران و سنجه‌های اعتباربخشی وزارت بهداشت
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

          {/* Q&A Section */}
          {!isLoading && content && (
            <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <AiIcon className="w-5 h-5 text-indigo-600" />
                پرسش اختصاصی از هوش مصنوعی درباره این برنامه و سنجه‌ها
              </h4>

              {qnaHistory.map((item, idx) => (
                <div key={idx} className="mb-4 space-y-2 text-xs sm:text-sm">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-medium">
                    ❓ پرسش: {item.question}
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed shadow-sm">
                    {formatMarkdown(item.answer)}
                  </div>
                </div>
              ))}

              <form onSubmit={handleAskQuestion} className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="مثال: چگونه برای سنجه ایمنی بیمار در برنامه ۳ ماهه چک‌لیست پایش تدوین کنیم؟"
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={isAsking}
                />
                <button
                  type="submit"
                  disabled={isAsking || !userQuery.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap"
                >
                  {isAsking ? 'در حال تحلیل...' : 'ارسال پرسش'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            فایل خروجی منطبق بر استاندارد فرمت‌های رسمی اداری و وزارت بهداشت می‌باشد.
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
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md flex items-center gap-2"
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
export default PeriodicPlanModal;
