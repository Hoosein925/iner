import React, { useState, useMemo, useEffect } from 'react';
import {
  Hospital,
  SensitiveIndicatorsReport,
  SensitiveIndicatorDetail,
} from '../types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BackIcon } from './icons/BackIcon';
import { AiIcon } from './icons/AiIcon';
import {
  parseSensitiveIndicatorsExcel,
  getSampleSensitiveIndicatorsReport,
  getIndicatorCanonicalKey,
} from '../services/sensitiveIndicatorsParser';
import { generateSensitiveIndicatorsAnalysisWithAI } from '../services/geminiService';

interface SensitiveIndicatorsViewProps {
  hospital: Hospital;
  onBack: () => void;
  onSaveReport?: (report: SensitiveIndicatorsReport) => void;
}

const PERIOD_OPTIONS = [
  { key: 'annual', label: 'کل سال' },
  { key: 'spring', label: 'بهار (سه‌ماهه اول)' },
  { key: 'summer', label: 'تابستان (سه‌ماهه دوم)' },
  { key: 'autumn', label: 'پاییز (سه‌ماهه سوم)' },
  { key: 'winter', label: 'زمستان (سه‌ماهه چهارم)' },
  { key: 'firstHalf', label: 'شش‌ماهه اول' },
  { key: 'secondHalf', label: 'شش‌ماهه دوم' },
];

const OVERVIEW_PERIOD_OPTIONS = [
  { key: 'annual', label: 'کل سال (میانگین سالیانه)' },
  { key: 'spring', label: 'بهار (سه‌ماهه اول)' },
  { key: 'summer', label: 'تابستان (سه‌ماهه دوم)' },
  { key: 'autumn', label: 'پاییز (سه‌ماهه سوم)' },
  { key: 'winter', label: 'زمستان (سه‌ماهه چهارم)' },
  { key: 'firstHalf', label: 'شش‌ماهه اول' },
  { key: 'secondHalf', label: 'شش‌ماهه دوم' },
];

export const SensitiveIndicatorsView: React.FC<SensitiveIndicatorsViewProps> = ({
  hospital,
  onBack,
  onSaveReport,
}) => {
  const [report, setReport] = useState<SensitiveIndicatorsReport | null>(
    hospital.sensitiveIndicatorsReport || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview_chart' | 'dept_comparison' | 'ai_analysis' | 'raw_table'>('overview_chart');

  // Department comparison filters
  const [selectedIndicatorIndex, setSelectedIndicatorIndex] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('annual');

  // Overview dashboard sub-modes:
  const [overviewSubMode, setOverviewSubMode] = useState<'ranked_bars' | 'focused_trend' | 'scorecard_matrix' | 'custom_lines'>('ranked_bars');
  const [overviewPeriod, setOverviewPeriod] = useState<string>('annual');
  const [focusedIndicatorName, setFocusedIndicatorName] = useState<string>('');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  // Screen size detection for responsive chart widths
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bar chart view styles (Visual full-width bars vs SVG chart)
  const [rankedViewType, setRankedViewType] = useState<'svg_chart' | 'visual_bars'>('svg_chart');
  const [deptViewType, setDeptViewType] = useState<'svg_chart' | 'visual_bars'>('svg_chart');

  // Default selection when report loads
  useEffect(() => {
    if (report) {
      const allNames = Array.from(new Set([
        ...(report.overview || []).map(i => i.indicatorName),
        ...(report.indicators || []).map(i => i.title),
      ])).filter(Boolean);

      if (allNames.length > 0) {
        if (!focusedIndicatorName || !allNames.includes(focusedIndicatorName)) {
          setFocusedIndicatorName(allNames[0]);
        }
        if (selectedLines.length === 0) {
          // Select up to 3 indicators by default so the chart is immediately ready
          setSelectedLines(allNames.slice(0, Math.min(3, allNames.length)));
        }
      }
    }
  }, [report, focusedIndicatorName, selectedLines.length]);

  // AI analysis state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>(
    hospital.sensitiveIndicatorsReport?.aiAnalysis || ''
  );

  const handleLoadSampleReport = () => {
    const sample = getSampleSensitiveIndicatorsReport(hospital.name);
    setReport(sample);
    if (onSaveReport) {
      onSaveReport(sample);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const parsedReport = await parseSensitiveIndicatorsExcel(file);
      setReport(parsedReport);
      if (onSaveReport) {
        onSaveReport(parsedReport);
      }
    } catch (err: any) {
      console.error('Failed to parse sensitive indicators Excel:', err);
      setUploadError('خطا در پردازش فایل اکسل. لطفاً اطمینان حاصل کنید فایل مطابق الگوی ۱۳ شیتی وزارت بهداشت می‌باشد.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!report) return;
    setIsGeneratingAI(true);

    try {
      const analysis = await generateSensitiveIndicatorsAnalysisWithAI(report);
      setAiAnalysisResult(analysis);
      const updatedReport: SensitiveIndicatorsReport = {
        ...report,
        aiAnalysis: analysis,
      };
      setReport(updatedReport);
      if (onSaveReport) {
        onSaveReport(updatedReport);
      }
      setActiveTab('ai_analysis');
    } catch (err) {
      alert('خطا در ارتباط با هوش مصنوعی. لطفاً مجدداً تلاش نمایید.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Helper functions for scoring colors and badges
  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981'; // Emerald
    if (score >= 70) return '#3b82f6'; // Blue
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Rose
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
    if (score >= 70) return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
    if (score >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
  };

  // Helper to strictly format percentage scores with at most 1 decimal place (e.g. 85.4 or 85)
  const formatScore = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '-';
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return '-';
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  };

  const formatScore1Dec = formatScore;

  const formatScorePercent = (val: number | string | null | undefined): string => {
    const s = formatScore(val);
    return s === '-' ? '-' : `${s}٪`;
  };

  const formatScoreNum = (val: number | string | null | undefined): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return null;
    return Math.round(num * 10) / 10;
  };

  // Dedicated SVG tick for horizontal BarCharts to guarantee Persian RTL text is never clipped
  const renderBarChartYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const rawText = String(payload?.value || '');
    // Desktop: width is 200px, allow up to 26 chars
    // Mobile: width is 140px, allow up to 16 chars
    const maxChars = isMobile ? 16 : 26;
    const displayText = rawText.length > maxChars ? rawText.slice(0, maxChars - 1) + '…' : rawText;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-10}
          y={4}
          textAnchor="end"
          fill="currentColor"
          className="text-[11px] sm:text-xs font-bold fill-slate-800 dark:fill-slate-100 select-none cursor-help"
          style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}
        >
          <title>{rawText}</title>
          {displayText}
        </text>
      </g>
    );
  };

  // Fixed palette cycled across indicator lines
  const OVERVIEW_LINE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#f97316', '#ec4899', '#14b8a6', '#6366f1'];

  // Helper to resolve complete metrics for any indicator from both overview and detailed sheets
  const resolveIndicatorMetrics = (indicatorName: string) => {
    if (!report) return null;
    const targetKey = getIndicatorCanonicalKey(indicatorName);
    const cleanTarget = indicatorName.replace(/\s+/g, '').replace(/‌/g, '').toLowerCase();

    // 1. Look in overview
    const oItem = (report.overview || []).find(o => {
      const oKey = getIndicatorCanonicalKey(o.indicatorName);
      if (targetKey && oKey && targetKey === oKey) return true;
      const oClean = o.indicatorName.replace(/\s+/g, '').replace(/‌/g, '').toLowerCase();
      return oClean === cleanTarget || oClean.includes(cleanTarget) || cleanTarget.includes(oClean);
    });

    // 2. Look in detailed indicator sheets
    const dItem = (report.indicators || []).find(i => {
      const iKey = getIndicatorCanonicalKey(i.title || i.sheetName);
      if (targetKey && iKey && targetKey === iKey) return true;
      const iClean = i.title.replace(/\s+/g, '').replace(/‌/g, '').toLowerCase();
      const sClean = i.sheetName.replace(/\s+/g, '').replace(/‌/g, '').toLowerCase();
      return iClean === cleanTarget || cleanTarget.includes(iClean) || sClean.includes(cleanTarget);
    });

    const getDeptAvg = (period: 'spring' | 'summer' | 'autumn' | 'winter' | 'annual') => {
      if (!dItem) return null;
      const rates = dItem.departments
        .map(d => d[period]?.rate)
        .filter((r): r is number => typeof r === 'number');
      return rates.length > 0 ? formatScoreNum(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
    };

    const getDeptHalfAvg = (half: 'firstHalf' | 'secondHalf') => {
      if (!dItem) return null;
      const rates = dItem.departments
        .map(d => d[half]?.rate)
        .filter((r): r is number => typeof r === 'number');
      return rates.length > 0 ? formatScoreNum(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
    };

    const firstHalf = formatScoreNum(oItem?.firstHalf ?? dItem?.allStaffSummary?.firstHalf ?? dItem?.overallSummary?.firstHalf ?? getDeptHalfAvg('firstHalf'));
    const secondHalf = formatScoreNum(oItem?.secondHalf ?? dItem?.allStaffSummary?.secondHalf ?? dItem?.overallSummary?.secondHalf ?? getDeptHalfAvg('secondHalf'));

    let sp = formatScoreNum(oItem?.spring ?? dItem?.allStaffSummary?.spring ?? dItem?.overallSummary?.spring ?? getDeptAvg('spring') ?? firstHalf ?? null);
    let su = formatScoreNum(oItem?.summer ?? dItem?.allStaffSummary?.summer ?? dItem?.overallSummary?.summer ?? getDeptAvg('summer') ?? firstHalf ?? null);
    let au = formatScoreNum(oItem?.autumn ?? dItem?.allStaffSummary?.autumn ?? dItem?.overallSummary?.autumn ?? getDeptAvg('autumn') ?? secondHalf ?? null);
    let wi = formatScoreNum(oItem?.winter ?? dItem?.allStaffSummary?.winter ?? dItem?.overallSummary?.winter ?? getDeptAvg('winter') ?? secondHalf ?? null);
    let ann = formatScoreNum(oItem?.annual ?? dItem?.allStaffSummary?.annual ?? dItem?.overallSummary?.annual ?? getDeptAvg('annual') ?? null);

    if (ann === null) {
      const valid = [sp, su, au, wi].filter((v): v is number => typeof v === 'number');
      if (valid.length > 0) ann = formatScoreNum(valid.reduce((a, b) => a + b, 0) / valid.length);
      else {
        const validHalves = [firstHalf, secondHalf].filter((v): v is number => typeof v === 'number');
        if (validHalves.length > 0) ann = formatScoreNum(validHalves.reduce((a, b) => a + b, 0) / validHalves.length);
      }
    }

    if (sp === null && ann !== null) sp = ann;
    if (su === null && ann !== null) su = ann;
    if (au === null && ann !== null) au = ann;
    if (wi === null && ann !== null) wi = ann;

    const fullName = oItem?.indicatorName || dItem?.title || indicatorName;
    return {
      name: fullName.replace(/\n/g, ' ').trim(),
      fullName,
      spring: sp,
      summer: su,
      autumn: au,
      winter: wi,
      firstHalf,
      secondHalf,
      annual: ann,
      isSemiAnnual: dItem?.pattern === 'C' || (firstHalf !== null && sp === su && au === wi),
    };
  };

  // 1. Data for Ranked Bars (Mode 1)
  const rankedOverviewData = useMemo(() => {
    if (!report) return [];
    const rawList = [
      ...(report.overview || []).map(i => i.indicatorName),
      ...(report.indicators || []).map(i => i.title),
    ].filter(Boolean);

    const seen = new Set<string>();
    const uniqueList: string[] = [];
    for (const name of rawList) {
      const key = getIndicatorCanonicalKey(name) || name;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(name);
      }
    }

    const list = uniqueList
      .map(indName => {
        const metrics = resolveIndicatorMetrics(indName);
        if (!metrics) return null;
        const raw = (metrics as any)[overviewPeriod] ?? metrics.annual;
        const val = typeof raw === 'number' ? Number(raw.toFixed(1)) : null;
        return {
          name: metrics.name,
          fullName: metrics.fullName,
          score: val,
        };
      })
      .filter((item): item is { name: string; fullName: string; score: number } => item !== null && item.score !== null);

    return list.sort((a, b) => b.score - a.score);
  }, [report, overviewPeriod]);

  const rankedOverviewStats = useMemo(() => {
    if (rankedOverviewData.length === 0) return null;
    const scores = rankedOverviewData.map(d => d.score);
    const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
    const top = rankedOverviewData[0];
    const lowest = rankedOverviewData[rankedOverviewData.length - 1];
    return { avg, top, lowest, count: rankedOverviewData.length };
  }, [rankedOverviewData]);

  // 2. Data for Focused Trend (Mode 2)
  const activeFocusedMetrics = useMemo(() => {
    if (!report) return null;
    const allNames = [
      ...(report.overview || []).map(i => i.indicatorName),
      ...(report.indicators || []).map(i => i.title),
    ].filter(Boolean);
    const fallbackName = allNames[0] || '';
    const targetName = focusedIndicatorName || fallbackName;
    return resolveIndicatorMetrics(targetName);
  }, [report, focusedIndicatorName]);

  const focusedTrendData = useMemo(() => {
    if (!activeFocusedMetrics) return [];
    const sp = typeof activeFocusedMetrics.spring === 'number' ? Number(activeFocusedMetrics.spring.toFixed(1)) : (typeof activeFocusedMetrics.annual === 'number' ? activeFocusedMetrics.annual : null);
    const su = typeof activeFocusedMetrics.summer === 'number' ? Number(activeFocusedMetrics.summer.toFixed(1)) : (typeof activeFocusedMetrics.annual === 'number' ? activeFocusedMetrics.annual : null);
    const au = typeof activeFocusedMetrics.autumn === 'number' ? Number(activeFocusedMetrics.autumn.toFixed(1)) : (typeof activeFocusedMetrics.annual === 'number' ? activeFocusedMetrics.annual : null);
    const wi = typeof activeFocusedMetrics.winter === 'number' ? Number(activeFocusedMetrics.winter.toFixed(1)) : (typeof activeFocusedMetrics.annual === 'number' ? activeFocusedMetrics.annual : null);

    return [
      { season: 'بهار (فصل اول)', seasonShort: 'بهار', score: sp },
      { season: 'تابستان (فصل دوم)', seasonShort: 'تابستان', score: su },
      { season: 'پاییز (فصل سوم)', seasonShort: 'پاییز', score: au },
      { season: 'زمستان (فصل چهارم)', seasonShort: 'زمستان', score: wi },
    ];
  }, [activeFocusedMetrics]);

  const focusedSeasonalDetails = useMemo(() => {
    if (!activeFocusedMetrics) return null;
    const sp = activeFocusedMetrics.spring ?? null;
    const su = activeFocusedMetrics.summer ?? null;
    const au = activeFocusedMetrics.autumn ?? null;
    const wi = activeFocusedMetrics.winter ?? null;
    const ann = activeFocusedMetrics.annual ?? null;
    const firstHalf = activeFocusedMetrics.firstHalf ?? null;
    const secondHalf = activeFocusedMetrics.secondHalf ?? null;
    const isSemiAnnual = activeFocusedMetrics.isSemiAnnual;

    const deltaSu = (typeof su === 'number' && typeof sp === 'number') ? Number((su - sp).toFixed(1)) : null;
    const deltaAu = (typeof au === 'number' && typeof su === 'number') ? Number((au - su).toFixed(1)) : null;
    const deltaWi = (typeof wi === 'number' && typeof au === 'number') ? Number((wi - au).toFixed(1)) : null;
    const deltaHalves = (typeof secondHalf === 'number' && typeof firstHalf === 'number') ? Number((secondHalf - firstHalf).toFixed(1)) : null;

    const validScores = [sp, su, au, wi].filter((v): v is number => typeof v === 'number');
    const maxVal = validScores.length ? Math.max(...validScores) : null;
    const minVal = validScores.length ? Math.min(...validScores) : null;

    return { sp, su, au, wi, ann, firstHalf, secondHalf, isSemiAnnual, deltaSu, deltaAu, deltaWi, deltaHalves, maxVal, minVal };
  }, [activeFocusedMetrics]);

  // 3. Data for Scorecard Matrix (Mode 3)
  const scorecardsList = useMemo(() => {
    if (!report) return [];
    const rawList = [
      ...(report.overview || []).map(i => i.indicatorName),
      ...(report.indicators || []).map(i => i.title),
    ].filter(Boolean);

    const seen = new Set<string>();
    const uniqueList: string[] = [];
    for (const name of rawList) {
      const key = getIndicatorCanonicalKey(name) || name;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(name);
      }
    }

    return uniqueList.map(indName => {
      const metrics = resolveIndicatorMetrics(indName);
      const sp = metrics?.spring ?? null;
      const su = metrics?.summer ?? null;
      const au = metrics?.autumn ?? null;
      const wi = metrics?.winter ?? null;
      const ann = metrics?.annual ?? null;
      const firstHalf = metrics?.firstHalf ?? null;
      const secondHalf = metrics?.secondHalf ?? null;
      const isSemiAnnual = metrics?.isSemiAnnual ?? false;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      const valid = [sp, su, au, wi].filter((v): v is number => typeof v === 'number');
      if (valid.length >= 2) {
        const diff = valid[valid.length - 1] - valid[0];
        if (diff > 1.5) trend = 'improving';
        else if (diff < -1.5) trend = 'declining';
      }

      return {
        name: metrics?.name || indName,
        fullName: metrics?.fullName || indName,
        sp,
        su,
        au,
        wi,
        ann,
        firstHalf,
        secondHalf,
        isSemiAnnual,
        trend,
      };
    });
  }, [report]);

  // 4. Data for Custom Lines (Mode 4)
  const customLinesChartData = useMemo(() => {
    if (!report) return [];
    const periods = [
      { key: 'spring', name: 'بهار' },
      { key: 'summer', name: 'تابستان' },
      { key: 'autumn', name: 'پاییز' },
      { key: 'winter', name: 'زمستان' },
    ];
    return periods.map(p => {
      const row: any = { periodName: p.name };
      selectedLines.forEach(lineName => {
        const metrics = resolveIndicatorMetrics(lineName);
        if (metrics) {
          let val = (metrics as any)[p.key];
          if (val === null || val === undefined) {
            val = metrics.annual;
          }
          if (typeof val === 'number') {
            row[lineName] = Number(val.toFixed(1));
          }
        }
      });
      return row;
    });
  }, [report, selectedLines]);

  // Selected indicator for Department Comparison
  const currentIndicator: SensitiveIndicatorDetail | undefined = report?.indicators?.[selectedIndicatorIndex];

  // 2. Data for Department Comparison Bar Chart
  const deptComparisonChartData = useMemo(() => {
    if (!currentIndicator) return [];

    return currentIndicator.departments
      .map(dept => {
        const periodObj = (dept as any)[selectedPeriod] || dept.annual;
        const rateVal = periodObj?.rate !== undefined ? periodObj.rate : (dept.annual?.rate ?? null);
        return {
          name: dept.departmentName,
          rate: typeof rateVal === 'number' ? Number(rateVal.toFixed(1)) : 0,
        };
      })
      .filter(d => typeof d.rate === 'number')
      .sort((a, b) => b.rate - a.rate);
  }, [currentIndicator, selectedPeriod]);

  const deptComparisonStats = useMemo(() => {
    if (deptComparisonChartData.length === 0) return null;
    const rates = deptComparisonChartData.map(d => d.rate);
    const avg = Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1));
    const top = deptComparisonChartData[0];
    const lowest = deptComparisonChartData[deptComparisonChartData.length - 1];
    return { avg, top, lowest, count: deptComparisonChartData.length };
  }, [deptComparisonChartData]);

  return (
    <div className="p-3 sm:p-6 lg:p-8 font-sans max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 sm:p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
            title="بازگشت به صفحه بیمارستان"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-white">
                پایش «شاخص‌های حساس بیمارستانی» (الگوی ۱۳ شیتی)
              </h1>
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black shadow-xs">
                {report?.hospitalInfo.year || 'سال جاری'}
              </span>
            </div>
            <p className="text-xs text-blue-100/90 font-medium mt-1">
              مرکز درمانی: <strong>{hospital.name}</strong> | پایش زخم فشاری، سقوط، بهداشت دست، رضایت بیمار و مهارت‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleLoadSampleReport}
            className="px-3 sm:px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs"
            title="بارگذاری داده‌های پیش‌فرض و استاندارد الگوی ۱۳ شیتی جهت مشاهده کامل داشبورد"
          >
            <span>✨ {report ? 'داده‌های نمونه' : 'بارگذاری داده‌های نمونه'}</span>
          </button>

          {report && (
            <button
              onClick={handleRunAIAnalysis}
              disabled={isGeneratingAI}
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <AiIcon className="w-4 h-4 shrink-0" />
              <span>{isGeneratingAI ? 'در حال تحلیل با هوش مصنوعی...' : 'تحلیل هوشمند (Gemini)'}</span>
            </button>
          )}

          <label className="cursor-pointer px-3.5 sm:px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95">
            <span>📥 {report ? 'آپلود مجدد اکسل' : 'آپلود فایل اکسل شاخص‌ها'}</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>{uploadError}</span>
        </div>
      )}

      {/* No Data Loaded Welcome */}
      {!report && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-3xl shadow-sm">
            📊
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              فایل اکسل شاخص‌های حساس بیمارستان بارگذاری نشده است
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto mt-1 leading-relaxed">
              فایل ۱۳ شیتی اکسل شاخص‌های حساس (شامل شیت بخش، شیت سرپایی، شاخص‌ها در یک نگاه، مهارت‌های ارتباطی، عمومی، تخصصی، زخم فشاری، سقوط، بهداشت دست و رضایت‌سنجی) را آپلود کنید یا داده‌های نمونه را مشاهده نمایید.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <label className="w-full sm:w-auto cursor-pointer px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition text-center active:scale-95">
              <span>📥 بارگذاری فایل اکسل شاخص‌ها...</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={handleLoadSampleReport}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition text-center active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✨ مشاهده و بارگذاری داده‌های استاندارد نمونه بیمارستان</span>
            </button>
          </div>
        </div>
      )}

      {/* When Report is Loaded */}
      {report && (
        <div className="space-y-6">
          {/* Metadata & Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
                🏥
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-bold block truncate">بخش‌های بستری</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {report.inpatientDepts.length} بخش
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0">
                🏢
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-bold block truncate">واحدهای سرپایی</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {report.outpatientUnits.length} واحد
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                📑
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-bold block truncate">دسته‌های شاخص</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {report.indicators.length} شاخص
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
                🤖
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-bold block truncate">وضعیت تحلیل هوش مصنوعی</span>
                <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 block truncate">
                  {report.aiAnalysis ? 'انجام شده ✓' : 'آماده تحلیل'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Responsive pill tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <button
              onClick={() => setActiveTab('overview_chart')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'overview_chart'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>📈 روند کل بیمارستان در سال</span>
            </button>

            <button
              onClick={() => setActiveTab('dept_comparison')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'dept_comparison'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>📊 مقایسه بخش‌ها به تفکیک شاخص</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_analysis')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'ai_analysis'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>✨ تحلیل راهبردی هوش مصنوعی</span>
            </button>

            <button
              onClick={() => setActiveTab('raw_table')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'raw_table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>📋 جدول داده‌های خام استخراج‌شده</span>
            </button>
          </div>

          {/* TAB 1: Hospital Overview Trend & Analysis Dashboard */}
          {activeTab === 'overview_chart' && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
              {/* Header and Sub-Mode Switcher */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📊</span>
                    <span>پایش جامع شاخص‌های حساس در یک نگاه</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    برگرفته از شیت خلاصه داشبورد؛ رتبه‌بندی عملکرد، روند فصلی و ماتریس وضعیت شاخص‌ها
                  </p>
                </div>

                {/* Sub-mode Segmented Buttons */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl overflow-x-auto text-xs font-bold shrink-0">
                  <button
                    onClick={() => setOverviewSubMode('ranked_bars')}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      overviewSubMode === 'ranked_bars'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    📊 رتبه‌بندی شاخص‌ها (میله‌ای)
                  </button>

                  <button
                    onClick={() => setOverviewSubMode('focused_trend')}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      overviewSubMode === 'focused_trend'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    📈 روند فصلی تک‌شاخص
                  </button>

                  <button
                    onClick={() => setOverviewSubMode('scorecard_matrix')}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      overviewSubMode === 'scorecard_matrix'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    📑 ماتریس کارتی شاخص‌ها
                  </button>

                  <button
                    onClick={() => setOverviewSubMode('custom_lines')}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      overviewSubMode === 'custom_lines'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    📉 مقایسه خطی انتخابی
                  </button>
                </div>
              </div>

              {/* Empty State Guard */}
              {(!report || (!report.overview?.length && !report.indicators?.length)) ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                  <p className="text-xs sm:text-sm">داده‌ای برای شیت خلاصه داشبورد یافت نشد. لطفاً فایل اکسل معتبر آپلود کنید یا داده‌های نمونه را بارگذاری نمایید.</p>
                  <button
                    onClick={handleLoadSampleReport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    ✨ بارگذاری داده‌های نمونه الگوی ۱۳ شیتی
                  </button>
                </div>
              ) : (
                <>
                  {/* SUB-MODE 1: RANKED BARS (Highest to Lowest, Clear and Uncluttered) */}
                  {overviewSubMode === 'ranked_bars' && (
                    <div className="space-y-4">
                      {/* Period Selector & Quick KPIs */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">دوره زمانی ارزیابی:</span>
                          <select
                            value={overviewPeriod}
                            onChange={e => setOverviewPeriod(e.target.value)}
                            className="px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                          >
                            {OVERVIEW_PERIOD_OPTIONS.map(opt => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {rankedOverviewStats && (
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                              میانگین کل: <strong className="font-mono">{formatScorePercent(rankedOverviewStats.avg)}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                              بهترین: <strong className="font-mono">{formatScorePercent(rankedOverviewStats.top.score)}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                              پایین‌ترین: <strong className="font-mono">{formatScorePercent(rankedOverviewStats.lowest.score)}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Graphical Bar Chart Header & Guide */}
                      <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-blue-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[11px] font-bold">
                            <span>📊 نمودار رتبه‌بندی کلی بیمارستان</span>
                          </div>
                          <h4 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                            <span>رتبه‌بندی شاخص‌های حساس ۱۰گانه بیمارستان ({rankedOverviewData.length} شاخص)</span>
                          </h4>
                          <p className="text-xs text-blue-100/90 leading-relaxed max-w-3xl">
                            <strong>مفهوم هر میله:</strong> هر میله افقی در این نمودار، میانگین کل عملکرد بیمارستان را در یکی از <strong>شاخص‌های حساس ایمنی و مراقبتی</strong> در دوره <strong>«{OVERVIEW_PERIOD_OPTIONS.find(p => p.key === overviewPeriod)?.label}»</strong> نشان می‌دهد. نام کامل هر شاخص در سمت چپ و نمره کیفیت (۰ تا ۱۰۰٪) در سمت راست میله درج شده است.
                          </p>
                        </div>

                        {/* Legend badges */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0 text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🟢 عالی (≥۸۵٪)</span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">🔵 مطلوب (۷۰-۸۴٪)</span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">🟡 متوسط (۵۰-۶۹٪)</span>
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">🔴 نیازمند اقدام (&lt;۵۰٪)</span>
                        </div>
                      </div>

                      {/* High-Clarity Horizontal Bar Chart & Analytics (Text strictly on the LEFT, Colored Bar opposite to it) */}
                      <div className="bg-slate-50/70 dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                        {/* Chart Scale Header (dir-ltr: Left = Title, Right = Scale & Score) */}
                        <div dir="ltr" className="flex items-center gap-2 sm:gap-4 px-2 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <div dir="rtl" className="w-56 sm:w-72 md:w-88 shrink-0 flex items-center justify-between text-right">
                            <span className="text-slate-800 dark:text-slate-200 font-black">📌 عنوان شاخص حساس (در سمت چپ نمودار)</span>
                            <span className="hidden md:inline text-[10px] text-blue-600 dark:text-blue-400 font-normal">کلیک جهت روند فصلی</span>
                          </div>
                          <div className="flex-1 flex justify-between px-2 text-center font-mono text-[10px] text-slate-400">
                            <span>۰٪</span>
                            <span className="hidden xs:inline">۲۵٪</span>
                            <span>۵۰٪</span>
                            <span className="hidden xs:inline">۷۵٪</span>
                            <span>۱۰۰٪</span>
                          </div>
                          <div className="shrink-0 w-20 sm:w-24 text-right font-mono pr-1">نمره و وضعیت</div>
                        </div>

                        {/* Chart Rows */}
                        <div className="space-y-2.5">
                          {rankedOverviewData.map((item, idx) => {
                            const pct = Math.min(100, Math.max(item.score > 0 ? 2 : 0, item.score));
                            const color = getScoreColor(item.score);
                            return (
                              <div
                                key={item.fullName}
                                onClick={() => {
                                  setFocusedIndicatorName(item.fullName);
                                  setOverviewSubMode('focused_trend');
                                }}
                                dir="ltr"
                                className="group flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 p-2.5 sm:p-3.5 bg-white dark:bg-slate-750 hover:bg-blue-50/70 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs hover:shadow-sm"
                                title="برای مشاهده نمودار نوسانات فصلی این شاخص کلیک کنید"
                              >
                                {/* Column 1: Title & Rank (دقیقاً در سمت چپ نمودار، روبروی خط رنگی) */}
                                <div dir="rtl" className="w-full sm:w-72 md:w-88 shrink-0 flex items-center gap-2.5 text-right">
                                  <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-black text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug break-words">
                                      {item.fullName}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                        item.score >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                        item.score >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                        item.score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      }`}>
                                        {item.score >= 85 ? '🟢 عالی' : item.score >= 70 ? '🔵 مطلوب' : item.score >= 50 ? '🟡 متوسط' : '🔴 نیازمند اقدام'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Column 2: Colored Bar Track (روبروی ردیف خط رنگی، بدون نوشته در خط رنگی) */}
                                <div className="flex-1 flex items-center gap-3 min-w-0 w-full">
                                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-5 overflow-hidden p-0.5 relative">
                                    {/* Grid reference ticks */}
                                    <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-20">
                                      <div className="border-r border-slate-500 h-full w-1/4" />
                                      <div className="border-r border-slate-500 h-full w-1/4" />
                                      <div className="border-r border-slate-500 h-full w-1/4" />
                                    </div>

                                    {/* The colored bar (خط رنگی بدون نوشته) */}
                                    <div
                                      className="h-full rounded-full transition-all duration-700 shadow-xs"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: color,
                                      }}
                                    />
                                  </div>

                                  {/* Score Badge */}
                                  <div className="shrink-0 flex items-center gap-1.5 w-20 sm:w-24 justify-end">
                                    <span
                                      className={`text-xs font-black px-2.5 py-1 rounded-lg border font-mono ${getScoreBadgeClass(
                                        item.score
                                      )}`}
                                    >
                                      {formatScorePercent(item.score)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-MODE 2: FOCUSED SEASONAL TREND (Area Chart + Quarterly Progression) */}
                  {overviewSubMode === 'focused_trend' && activeFocusedMetrics && (
                    <div className="space-y-4">
                      {/* Explanatory Banner */}
                      <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-100 flex items-center gap-2">
                            <span>📈</span>
                            <span>نمودار نوسانات فصلی شاخص «{activeFocusedMetrics.fullName}»</span>
                          </h4>
                          <p className="text-[11px] text-blue-800/80 dark:text-blue-300 mt-0.5 leading-relaxed">
                            <strong>راهنمای نمودار:</strong> این نمودار تغییرات نمره کیفیت این شاخص را از فصل بهار تا زمستان در مقایسه با میانگین کل سال (خط‌چین نارنجی: {formatScorePercent(activeFocusedMetrics.annual)}) به تصویر می‌کشد.
                          </p>
                        </div>
                      </div>

                      {/* Indicator Selector */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">انتخاب شاخص:</span>
                          <select
                            value={focusedIndicatorName}
                            onChange={e => setFocusedIndicatorName(e.target.value)}
                            className="w-full sm:w-auto flex-1 px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from(new Set([
                              ...(report.overview || []).map(i => i.indicatorName),
                              ...(report.indicators || []).map(i => i.title),
                            ])).map(indName => (
                              <option key={indName} value={indName}>
                                {indName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {typeof activeFocusedMetrics.annual === 'number' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-500 font-medium">میانگین سالیانه:</span>
                            <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-xl border font-mono ${getScoreBadgeClass(activeFocusedMetrics.annual)}`}>
                              {formatScorePercent(activeFocusedMetrics.annual)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Area Progression Chart */}
                      <div className="h-72 sm:h-80 w-full pt-2 dir-ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={focusedTrendData} margin={{ top: 10, right: 25, left: 0, bottom: 20 }}>
                            <defs>
                              <linearGradient id="focusedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="season" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="٪" />
                            <Tooltip
                              formatter={(value: any) => [formatScorePercent(value), 'نمره کیفیت']}
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                color: '#fff',
                                borderRadius: '12px',
                                direction: 'rtl',
                                fontSize: '12px',
                              }}
                            />
                            {typeof activeFocusedMetrics.annual === 'number' && (
                              <ReferenceLine
                                y={activeFocusedMetrics.annual}
                                stroke="#f59e0b"
                                strokeDasharray="4 4"
                                label={{ value: `میانگین سال: ${formatScorePercent(activeFocusedMetrics.annual)}`, fill: '#d97706', fontSize: 11, position: 'top' }}
                              />
                            )}
                            <Area
                              type="monotone"
                              dataKey="score"
                              stroke="#2563eb"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#focusedGrad)"
                              dot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
                              activeDot={{ r: 8 }}
                              connectNulls
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Semi-Annual Highlight if Applicable */}
                      {focusedSeasonalDetails?.isSemiAnnual && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-center shadow-xs">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block mb-1">
                              🌸 عملکرد شش‌ماهه اول (نیم‌سال اول)
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {formatScorePercent(focusedSeasonalDetails.firstHalf ?? focusedSeasonalDetails.sp)}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">پایش بهار و تابستان</span>
                          </div>

                          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 text-center shadow-xs">
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                              🍂 عملکرد شش‌ماهه دوم (نیم‌سال دوم)
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {formatScorePercent(focusedSeasonalDetails.secondHalf ?? focusedSeasonalDetails.wi)}
                            </span>
                            {focusedSeasonalDetails.deltaHalves !== null ? (
                              <span className={`text-[10px] font-bold block mt-0.5 ${focusedSeasonalDetails.deltaHalves >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {focusedSeasonalDetails.deltaHalves >= 0 ? `▲ +${formatScore1Dec(focusedSeasonalDetails.deltaHalves)}٪ رشد نسبت به نیمه اول` : `▼ ${formatScore1Dec(focusedSeasonalDetails.deltaHalves)}٪ افت نسبت به نیمه اول`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-0.5">پایش پاییز و زمستان</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4 Quarterly Progression Cards */}
                      {focusedSeasonalDetails && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                          {/* Spring */}
                          <div className="p-3 bg-white dark:bg-slate-750 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-center shadow-xs">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              🌸 بهار (فصل اول)
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {focusedSeasonalDetails.sp !== null ? formatScorePercent(focusedSeasonalDetails.sp) : 'فاقد داده'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1">نقطه آغاز سال</span>
                          </div>

                          {/* Summer */}
                          <div className="p-3 bg-white dark:bg-slate-750 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-center shadow-xs">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              ☀️ تابستان (فصل دوم)
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {focusedSeasonalDetails.su !== null ? formatScorePercent(focusedSeasonalDetails.su) : 'فاقد داده'}
                            </span>
                            {focusedSeasonalDetails.deltaSu !== null ? (
                              <span
                                className={`text-[10px] font-bold block mt-1 ${
                                  focusedSeasonalDetails.deltaSu >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {focusedSeasonalDetails.deltaSu >= 0 ? `▲ +${formatScore1Dec(focusedSeasonalDetails.deltaSu)}٪ رشد` : `▼ ${formatScore1Dec(focusedSeasonalDetails.deltaSu)}٪ افت`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-1">-</span>
                            )}
                          </div>

                          {/* Autumn */}
                          <div className="p-3 bg-white dark:bg-slate-750 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-center shadow-xs">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              🍂 پاییز (فصل سوم)
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {focusedSeasonalDetails.au !== null ? formatScorePercent(focusedSeasonalDetails.au) : 'فاقد داده'}
                            </span>
                            {focusedSeasonalDetails.deltaAu !== null ? (
                              <span
                                className={`text-[10px] font-bold block mt-1 ${
                                  focusedSeasonalDetails.deltaAu >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {focusedSeasonalDetails.deltaAu >= 0 ? `▲ +${formatScore1Dec(focusedSeasonalDetails.deltaAu)}٪ رشد` : `▼ ${formatScore1Dec(focusedSeasonalDetails.deltaAu)}٪ افت`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-1">-</span>
                            )}
                          </div>

                          {/* Winter */}
                          <div className="p-3 bg-white dark:bg-slate-750 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-center shadow-xs">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              ❄️ زمستان (فصل چهارم)
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {focusedSeasonalDetails.wi !== null ? formatScorePercent(focusedSeasonalDetails.wi) : 'فاقد داده'}
                            </span>
                            {focusedSeasonalDetails.deltaWi !== null ? (
                              <span
                                className={`text-[10px] font-bold block mt-1 ${
                                  focusedSeasonalDetails.deltaWi >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {focusedSeasonalDetails.deltaWi >= 0 ? `▲ +${formatScore1Dec(focusedSeasonalDetails.deltaWi)}٪ رشد` : `▼ ${formatScore1Dec(focusedSeasonalDetails.deltaWi)}٪ افت`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-1">-</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Narrative Insight */}
                      {focusedSeasonalDetails && focusedSeasonalDetails.maxVal !== null && focusedSeasonalDetails.minVal !== null && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2 flex-wrap font-medium">
                          <span>
                            📌 بالاترین رکورد ثبت‌شده در این شاخص: <strong>{formatScorePercent(focusedSeasonalDetails.maxVal)}</strong> | کمترین رکورد: <strong>{formatScorePercent(focusedSeasonalDetails.minVal)}</strong> (دامنه نوسان: <strong>{formatScorePercent(focusedSeasonalDetails.maxVal - focusedSeasonalDetails.minVal)}</strong>)
                          </span>
                          <button
                            onClick={() => setOverviewSubMode('ranked_bars')}
                            className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline"
                          >
                            بازگشت به رتبه‌بندی همه شاخص‌ها ←
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-MODE 3: SCORECARD MATRIX (Clean Grid of All 10 Indicators) */}
                  {overviewSubMode === 'scorecard_matrix' && (
                    <div className="space-y-4">
                      {/* Explanatory Banner */}
                      <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs">
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-100 flex items-center gap-2">
                            <span>📑</span>
                            <span>ماتریس کارتی وضعیت تمام شاخص‌های حساس ({scorecardsList.length} شاخص)</span>
                          </h4>
                          <p className="text-[11px] text-blue-800/80 dark:text-blue-300 mt-0.5 leading-relaxed">
                            <strong>راهنما:</strong> کارنامه فشرده عملکرد هر شاخص در فصول ۴گانه سال به همراه نمره کل سال و جهت روند کلی. برای مشاهده نمودار تفصیلی، روی «نمودار روند ←» کلیک نمایید.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 self-end md:self-center shrink-0">
                          فصول: بهار · تابستان · پاییز · زمستان
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {scorecardsList.map((card, idx) => (
                          <div
                            key={card.fullName}
                            className="bg-white dark:bg-slate-750 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                                  {card.fullName}
                                </h4>
                                {card.ann !== null && (
                                  <span
                                    className={`text-xs font-black px-2.5 py-0.5 rounded-lg border shrink-0 font-mono ${getScoreBadgeClass(
                                      card.ann
                                    )}`}
                                  >
                                    {formatScorePercent(card.ann)}
                                  </span>
                                )}
                              </div>

                              {/* 4 Seasonal Badges */}
                              <div className="grid grid-cols-4 gap-1.5 pt-3 text-center">
                                <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block">بهار</span>
                                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                    {card.sp !== null ? formatScorePercent(card.sp) : '-'}
                                  </span>
                                </div>
                                <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block">تابستان</span>
                                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                    {card.su !== null ? formatScorePercent(card.su) : '-'}
                                  </span>
                                </div>
                                <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block">پاییز</span>
                                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                    {card.au !== null ? formatScorePercent(card.au) : '-'}
                                  </span>
                                </div>
                                <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block">زمستان</span>
                                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                    {card.wi !== null ? formatScorePercent(card.wi) : '-'}
                                  </span>
                                </div>
                              </div>

                              {/* Extra semi-annual tag if available */}
                              {card.isSemiAnnual && card.firstHalf !== null && card.secondHalf !== null && (
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-2 px-1">
                                  <span>شش‌ماهه اول: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatScorePercent(card.firstHalf)}</strong></span>
                                  <span>شش‌ماهه دوم: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatScorePercent(card.secondHalf)}</strong></span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px]">
                              <span className="font-bold flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                {card.trend === 'improving' ? '📈 روند صعودی' : card.trend === 'declining' ? '📉 افت فصلی' : '➡️ پایدار'}
                              </span>
                              <button
                                onClick={() => {
                                  setFocusedIndicatorName(card.fullName);
                                  setOverviewSubMode('focused_trend');
                                }}
                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                نمودار روند ←
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-MODE 4: CUSTOM LINES (Clean Pick-Your-Lines Chart) */}
                  {overviewSubMode === 'custom_lines' && (
                    <div className="space-y-4">
                      {/* Explanatory Banner */}
                      <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs">
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-100 flex items-center gap-2">
                            <span>📉</span>
                            <span>نمودار مقایسه خطی هم‌زمان شاخص‌های منتخب (بهار تا زمستان)</span>
                          </h4>
                          <p className="text-[11px] text-blue-800/80 dark:text-blue-300 mt-0.5 leading-relaxed">
                            <strong>راهنما:</strong> هر خط رنگی نمایانگر یک شاخص حساس انتخابی است. با انتخاب حداکثر ۴ شاخص، روند نوسانات فصلی آن‌ها را روی یک محور واحد مقایسه نمایید.
                          </p>
                        </div>
                      </div>

                      {/* Checkbox Selector with Presets */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>انتخاب شاخص‌های موردنظر برای رسم خطوط هم‌زمان (حداکثر ۴ شاخص برای خوانایی کامل):</span>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-mono">
                              {selectedLines.length} شاخص انتخاب شده
                            </span>
                            {selectedLines.length >= 4 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                (سقف ۴ شاخص تکمیل شد)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                          <span className="text-[11px] text-slate-500 font-medium">دسته‌بندی‌های سریع:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const allNames = Array.from(new Set([
                                ...(report.overview || []).map(i => i.indicatorName),
                                ...(report.indicators || []).map(i => i.title),
                              ]));
                              const safety = allNames.filter(n => {
                                const k = getIndicatorCanonicalKey(n);
                                return k === 'FALL_INPATIENT' || k === 'PRESSURE_ULCER' || k === 'HAND_PROF';
                              });
                              if (safety.length > 0) setSelectedLines(safety.slice(0, 4));
                            }}
                            className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 rounded-lg font-bold text-[11px] transition active:scale-95"
                          >
                            🩺 شاخص‌های ایمنی بیمار
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const allNames = Array.from(new Set([
                                ...(report.overview || []).map(i => i.indicatorName),
                                ...(report.indicators || []).map(i => i.title),
                              ]));
                              const skills = allNames.filter(n => {
                                const k = getIndicatorCanonicalKey(n);
                                return k === 'COMM_PROF' || k === 'SKILLS_GEN' || k === 'SATISFACTION';
                              });
                              if (skills.length > 0) setSelectedLines(skills.slice(0, 4));
                            }}
                            className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900 rounded-lg font-bold text-[11px] transition active:scale-95"
                          >
                            💬 مهارت‌ها و رضایت
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const topNames = rankedOverviewData.slice(0, 3).map(d => d.fullName);
                              if (topNames.length > 0) setSelectedLines(topNames);
                            }}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 rounded-lg font-bold text-[11px] transition active:scale-95"
                          >
                            ✨ ۳ شاخص برتر
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {Array.from(new Set([
                            ...(report.overview || []).map(i => i.indicatorName),
                            ...(report.indicators || []).map(i => i.title),
                          ])).map((indName) => {
                            const isSelected = selectedLines.includes(indName);
                            const isAtLimit = !isSelected && selectedLines.length >= 4;
                            return (
                              <button
                                key={indName}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (selectedLines.length > 1) {
                                      setSelectedLines(selectedLines.filter(name => name !== indName));
                                    }
                                  } else {
                                    if (selectedLines.length < 4) {
                                      setSelectedLines([...selectedLines, indName]);
                                    }
                                  }
                                }}
                                disabled={isAtLimit}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                                } ${isAtLimit ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{indName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Clean Selected Line Chart */}
                      <div className="h-80 sm:h-96 w-full pt-2 dir-ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={customLinesChartData} margin={{ top: 10, right: 25, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="periodName" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="٪" />
                            <Tooltip
                              formatter={(value: any, name: any) => [formatScorePercent(value), name]}
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                color: '#fff',
                                borderRadius: '12px',
                                direction: 'rtl',
                                fontSize: '12px',
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            {selectedLines.map((name, idx) => (
                              <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                name={name.replace(/\n/g, ' ')}
                                stroke={OVERVIEW_LINE_COLORS[idx % OVERVIEW_LINE_COLORS.length]}
                                strokeWidth={3}
                                dot={{ r: 5 }}
                                activeDot={{ r: 7 }}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: Department Comparison Bar Chart */}
          {activeTab === 'dept_comparison' && (
            !currentIndicator ? (
              <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 text-sm">
                داده‌های بخش‌های درمانی برای شاخص‌ها یافت نشد. لطفاً فایل اکسل معتبر بارگذاری نمایید یا از داده‌های نمونه استفاده کنید.
              </div>
            ) : (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              {/* Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">شاخص:</span>
                  <select
                    value={selectedIndicatorIndex}
                    onChange={e => setSelectedIndicatorIndex(parseInt(e.target.value))}
                    className="px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  >
                    {report.indicators.map((ind, idx) => (
                      <option key={ind.sheetName} value={idx}>
                        {ind.title} ({ind.departments.length} بخش)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">دوره زمانی:</span>
                  <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  >
                    {PERIOD_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Comparison Header Banner & Guide */}
              <div className="p-4 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white rounded-2xl border border-teal-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 text-[11px] font-bold">
                    <span>🏥 مقایسه بخش‌های درمانی بیمارستان</span>
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                    <span>مقایسه و رتبه‌بندی عملکرد بخش‌ها در شاخص: «{currentIndicator.title}»</span>
                  </h3>
                  <p className="text-xs text-teal-100/90 leading-relaxed max-w-3xl">
                    <strong>مفهوم هر میله:</strong> هر میله افقی در این نمودار متعلق به یک <strong>«بخش بستری یا واحد درمانی مشخص»</strong> (نظیر ICU، CCU، جراحی، اورژانس و...) در بیمارستان است که نرخ یا نمره عملکرد آن بخش را در شاخص <strong>«{currentIndicator.title}»</strong> طی دوره <strong>«{PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label}»</strong> نشان می‌دهد.
                  </p>
                </div>

                {/* Legend badges */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🟢 عالی (≥۸۵٪)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">🔵 مطلوب (۷۰-۸۴٪)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">🟡 متوسط (۵۰-۶۹٪)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">🔴 نیازمند اصلاح (&lt;۵۰٪)</span>
                </div>
              </div>

              {/* KPI Summary Chips */}
              {deptComparisonStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[11px] text-slate-500 font-bold block mb-0.5">تعداد بخش‌های پایش‌شده</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">{deptComparisonStats.count} بخش</span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold block mb-0.5">میانگین شاخص در بیمارستان</span>
                    <span className="text-base sm:text-lg font-black text-blue-900 dark:text-blue-100 font-mono">{formatScorePercent(deptComparisonStats.avg)}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center truncate">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block mb-0.5 truncate">بهترین: {deptComparisonStats.top.name}</span>
                    <span className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-200 font-mono">{formatScorePercent(deptComparisonStats.top.rate)}</span>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center truncate">
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold block mb-0.5 truncate">پایین‌ترین: {deptComparisonStats.lowest.name}</span>
                    <span className="text-base sm:text-lg font-black text-amber-800 dark:text-amber-200 font-mono">{formatScorePercent(deptComparisonStats.lowest.rate)}</span>
                  </div>
                </div>
              )}

              {deptComparisonChartData.length > 0 ? (
                <div className="space-y-4">
                  {/* High-Clarity Horizontal Bar Chart for Departments (Zero Overlap, Text on the Left) */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    {/* Scale Header (dir-ltr: Left = Department Name, Right = Scale & Rate) */}
                    <div dir="ltr" className="flex items-center gap-2 sm:gap-4 px-2 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <div dir="rtl" className="w-56 sm:w-72 md:w-88 shrink-0 text-right">
                        <span className="text-slate-800 dark:text-slate-200 font-black">🏥 نام بخش درمانی (در سمت چپ نمودار)</span>
                      </div>
                      <div className="flex-1 flex justify-between px-2 text-center font-mono text-[10px] text-slate-400">
                        <span>۰٪</span>
                        <span className="hidden xs:inline">۲۵٪</span>
                        <span>۵۰٪</span>
                        <span className="hidden xs:inline">۷۵٪</span>
                        <span>۱۰۰٪</span>
                      </div>
                      <div className="shrink-0 w-20 sm:w-24 text-right font-mono pr-1">نرخ عملکرد</div>
                    </div>

                    {/* Chart Rows */}
                    <div className="space-y-2.5">
                      {deptComparisonChartData.map((dept, dIdx) => {
                        const pct = Math.min(100, Math.max(dept.rate > 0 ? 2 : 0, dept.rate));
                        const color = getScoreColor(dept.rate);
                        return (
                          <div
                            key={dept.name}
                            dir="ltr"
                            className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 p-2.5 sm:p-3.5 bg-white dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-sm transition"
                          >
                            {/* Column 1: Department Title & Rank (در سمت چپ نمودار، روبروی خط رنگی) */}
                            <div dir="rtl" className="w-full sm:w-72 md:w-88 shrink-0 flex items-center gap-2.5 text-right">
                              <span className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-black text-xs flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
                                {dIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words" title={dept.name}>
                                  {dept.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                    dept.rate >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                    dept.rate >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                    dept.rate >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}>
                                    {dept.rate >= 85 ? '🟢 عالی' : dept.rate >= 70 ? '🔵 مطلوب' : dept.rate >= 50 ? '🟡 متوسط' : '🔴 نیازمند مداخله'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Colored Bar Track (روبروی ردیف خط رنگی، بدون نوشته در خط رنگی) */}
                            <div className="flex-1 flex items-center gap-3 min-w-0 w-full">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-5 overflow-hidden p-0.5 relative">
                                {/* Grid reference ticks */}
                                <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-20">
                                  <div className="border-r border-slate-500 h-full w-1/4" />
                                  <div className="border-r border-slate-500 h-full w-1/4" />
                                  <div className="border-r border-slate-500 h-full w-1/4" />
                                </div>

                                {/* The colored bar (خط رنگی بدون نوشته) */}
                                <div
                                  className="h-full rounded-full transition-all duration-700 shadow-xs"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>

                              {/* Rate Badge */}
                              <div className="shrink-0 flex items-center gap-1.5 w-20 sm:w-24 justify-end">
                                <span
                                  className={`text-xs font-black px-2.5 py-1 rounded-lg border font-mono ${getScoreBadgeClass(
                                    dept.rate
                                  )}`}
                                >
                                  {formatScorePercent(dept.rate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
                  داده‌ای برای دوره انتخاب‌شده در این شاخص یافت نشد.
                </div>
              )}
            </div>
          ))}

          {/* TAB 3: Gemini AI Narrative Clinical Analysis */}
          {activeTab === 'ai_analysis' && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>تحلیل هوشمند و بالینی شاخص‌ها با هوش مصنوعی (Gemini)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      تحلیل متنی نقاط قوت، بخش‌های پرریسک، افت/بهبود فصلی و پیشنهادات اولویت‌دار اقدام اصلاحی
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunAIAnalysis}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 disabled:opacity-50"
                >
                  <AiIcon className="w-4 h-4" />
                  <span>{isGeneratingAI ? 'در حال نگارش تحلیل...' : 'تولید / به‌روزرسانی تحلیل'}</span>
                </button>
              </div>

              {isGeneratingAI ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    هوش مصنوعی در حال تحلیل مقایسه‌ای ۱۰ شاخص حساس و بخش‌های بیمارستان است...
                  </p>
                  <span className="text-xs text-slate-400">واکاوی داده‌های زخم فشاری، سقوط، بهداشت دست و نمرات پرسنل</span>
                </div>
              ) : aiAnalysisResult ? (
                <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 leading-relaxed text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-sans space-y-4 whitespace-pre-wrap">
                  {aiAnalysisResult}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs sm:text-sm space-y-3">
                  <p>هنوز تحلیلی برای این فایل ایجاد نشده است.</p>
                  <button
                    onClick={handleRunAIAnalysis}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    شروع تحلیل با هوش مصنوعی (Gemini)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Raw Table of Extracted Departments */}
          {activeTab === 'raw_table' && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  جدول تفصیلی داده‌های استخراج‌شده به تفکیک بخش و شاخص
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {report.inpatientDepts.length} بخش بستری | {report.outpatientUnits.length} واحد سرپایی
                </span>
              </div>

              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-right text-xs divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">ردیف</th>
                      <th className="p-2.5">نام بخش / واحد</th>
                      <th className="p-2.5">ارتباطی حرفه‌ای (سال)</th>
                      <th className="p-2.5">عمومی (سال)</th>
                      <th className="p-2.5">اختصاصی (سال)</th>
                      <th className="p-2.5">بهداشت دست (سال)</th>
                      <th className="p-2.5">زخم فشاری (سال)</th>
                      <th className="p-2.5">سقوط (سال)</th>
                      <th className="p-2.5">رضایت بیمار (سال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {report.inpatientDepts.map((dName, idx) => {
                      const comm = report.indicators.find(i => i.title.includes('ارتباطی حرفه‌ای'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;
                      const gen = report.indicators.find(i => i.title.includes('عمومی'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;
                      const spec = report.indicators.find(i => i.title.includes('اختصاصی'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;
                      const hand = report.indicators.find(i => i.title.includes('بهداشت دست کادر حرفه‌ای'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;
                      const ulcer = report.indicators.find(i => i.title.includes('زخم فشاری'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;
                      const fall = report.indicators.find(i => i.title.includes('سقوط در بخش‌های بستری'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;
                      const sat = report.indicators.find(i => i.title.includes('رضایت بیمار'))?.departments.find(d => d.departmentName === dName)?.annual?.rate;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                          <td className="p-2.5 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{dName}</td>
                          <td className="p-2.5 font-mono">{comm !== undefined && comm !== null ? formatScorePercent(comm) : '-'}</td>
                          <td className="p-2.5 font-mono">{gen !== undefined && gen !== null ? formatScorePercent(gen) : '-'}</td>
                          <td className="p-2.5 font-mono">{spec !== undefined && spec !== null ? formatScorePercent(spec) : '-'}</td>
                          <td className="p-2.5 font-mono">{hand !== undefined && hand !== null ? formatScorePercent(hand) : '-'}</td>
                          <td className="p-2.5 font-mono text-rose-600">{ulcer !== undefined && ulcer !== null ? formatScorePercent(ulcer) : '-'}</td>
                          <td className="p-2.5 font-mono text-amber-600">{fall !== undefined && fall !== null ? formatScorePercent(fall) : '-'}</td>
                          <td className="p-2.5 font-mono text-emerald-600">{sat !== undefined && sat !== null ? formatScorePercent(sat) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SensitiveIndicatorsView;
