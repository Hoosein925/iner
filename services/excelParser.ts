import { SkillCategory, SkillItem, NamedChecklistTemplate } from '../types';
import * as XLSX from 'xlsx';

const JALALI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", 
    "تیر", "مرداد", "شهریور", 
    "مهر", "آبان", "آذر", 
    "دی", "بهمن", "اسفند"
];

const CATEGORY_NAMES = [
    "مهارت های عمومی",
    "مهارت های ارتباطی",
    "مهارت های تخصصی"
];

/**
 * Normalizes Persian/Arabic characters, trims whitespace, and replaces zero-width non-joiners.
 */
const normalizePersianText = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val)
        .replace(/\u200c/g, ' ')
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Converts Persian and Arabic digits to standard ASCII numerals (0-9).
 * Also normalizes commas to dots for floating point parsing.
 */
const toAsciiDigits = (str: string): string => {
    return str
        .replace(/[۰٠]/g, '0')
        .replace(/[۱١]/g, '1')
        .replace(/[۲٢]/g, '2')
        .replace(/[۳٣]/g, '3')
        .replace(/[۴٤]/g, '4')
        .replace(/[۵٥]/g, '5')
        .replace(/[۶٦]/g, '6')
        .replace(/[۷٧]/g, '7')
        .replace(/[۸٨]/g, '8')
        .replace(/[۹٩]/g, '9')
        .replace(/[،,]/g, '.');
};

/**
 * Parses raw cell value in a month column.
 * According to official hospital evaluation guidelines:
 * - Unregistered months have empty / None cells.
 * - Registered months have numeric scores between 1 and 4.
 * Returns the numeric score (1 to 4) if valid, or null if cell is empty/None/formula error/unrated.
 */
const parseRawMonthScore = (raw: any): number | null => {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') {
        return (isFinite(raw) && raw >= 1 && raw <= 4) ? raw : null;
    }
    const str = normalizePersianText(raw);
    if (!str) return null;

    // Skip formula errors, dashes, blanks, non-evaluations
    if (
        str.startsWith('#') || str === '-' || str === '_' || str === '/' ||
        str.toLowerCase() === 'n/a' || str === 'غ' || str === 'غایب' || str === 'عدم حضور'
    ) {
        return null;
    }

    const ascii = toAsciiDigits(str).trim();
    const match = ascii.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (match) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && isFinite(val) && val >= 1 && val <= 4) {
            return val;
        }
    }
    return null;
};

/**
 * General score value parser (0 to 100), used for general numeric conversions.
 */
const parseScoreValue = (raw: any): number | null => {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') {
        return (isFinite(raw) && raw >= 0 && raw <= 100) ? raw : null;
    }
    const str = normalizePersianText(raw);
    if (!str) return null;

    if (str === '-' || str === '_' || str === '/' || str === 'غ' || str === 'غایب' || str.toLowerCase() === 'n/a') {
        return 0;
    }

    const ascii = toAsciiDigits(str);
    const match = ascii.match(/-?\d+(?:\.\d+)?/);
    if (match) {
        const val = parseFloat(match[0]);
        if (!isNaN(val) && isFinite(val) && val >= 0 && val <= 100) {
            return val;
        }
    }
    return null;
};

/**
 * Matches a cell string against Jalali month names.
 */
const matchJalaliMonth = (cellText: string): string | null => {
    if (!cellText) return null;
    const normalized = normalizePersianText(cellText);
    if (!normalized || normalized.length > 25) return null;

    const lower = normalized.toLowerCase();
    const titleKeywords = [
        'سه ماه', 'اقدام', 'ارزیابی', 'چک لیست', 'چک‌لیست', 'شاخص', 'جدول',
        'پرستاری', 'عملکرد', 'اطلاعات', 'مشخصات', 'بیمارستان', 'بخش', 'نام', 'ردیف',
        'عناوین', 'دوره', 'فصل', 'مربوط', 'سال', 'چهارم', 'سوم', 'دوم', 'اول'
    ];
    for (const kw of titleKeywords) {
        if (lower.includes(kw)) return null;
    }

    const cleanText = normalized.replace(/[0-9۰-۹()،,:/\-_.]/g, ' ').trim();
    if (!cleanText) return null;

    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 3) return null;

    for (const month of JALALI_MONTHS) {
        if (cleanText === month || cleanText === `${month} ماه` || cleanText === `ماه ${month}`) {
            return month;
        }
        if (words.includes(month)) {
            const nonMonthWords = words.filter(w => w !== month && w !== 'ماه');
            if (nonMonthWords.length === 0) {
                return month;
            }
        }
    }
    return null;
};

/**
 * Checks if a cell represents a pure category header (0: عمومی, 1: ارتباطی, 2: تخصصی).
 * Specifically handles Column A and section banner rows without confusing skill descriptions.
 */
const getCategoryFromCell = (cellVal: any): number | null => {
    if (cellVal === undefined || cellVal === null) return null;
    const text = normalizePersianText(cellVal);
    if (!text || text.length < 2 || text.length > 35) return null;

    // Clean punctuation and numbers
    const clean = text.replace(/[0-9۰-۹:()\-_.]/g, ' ').replace(/\s+/g, ' ').trim();

    // Check exact standard category names
    if (
        clean === 'مهارت عمومی' || clean === 'مهارت های عمومی' || clean === 'مهارت‌های عمومی' ||
        clean === 'حیطه عمومی' || clean === 'حیطه مهارت های عمومی' || clean === 'حیطه مهارت‌های عمومی' ||
        clean === 'بخش عمومی' || clean === 'عمومی' || clean === 'بخش اول مهارت های عمومی' ||
        clean === 'مهارت های عمومی پرستاری' || clean === 'مهارت‌های عمومی پرستاری'
    ) {
        return 0;
    }

    if (
        clean === 'مهارت ارتباطی' || clean === 'مهارت های ارتباطی' || clean === 'مهارت‌های ارتباطی' ||
        clean === 'حیطه ارتباطی' || clean === 'حیطه مهارت های ارتباطی' || clean === 'حیطه مهارت‌های ارتباطی' ||
        clean === 'مهارت های ارتباطی و اخلاقی' || clean === 'مهارت‌های ارتباطی و اخلاقی' ||
        clean === 'ارتباطی' || clean === 'اخلاق حرفه ای' || clean === 'اخلاق حرفه‌ای' ||
        clean === 'بخش دوم مهارت های ارتباطی' || clean === 'مهارت ارتباطی و اخلاقی'
    ) {
        return 1;
    }

    if (
        clean === 'مهارت تخصصی' || clean === 'مهارت های تخصصی' || clean === 'مهارت‌های تخصصی' ||
        clean === 'حیطه تخصصی' || clean === 'حیطه مهارت های تخصصی' || clean === 'حیطه مهارت‌های تخصصی' ||
        clean === 'مهارت های بالینی و تخصصی' || clean === 'مهارت های بالینی تخصصی' ||
        clean === 'مهارت های اختصاصی' || clean === 'مهارت‌های اختصاصی' ||
        clean === 'تخصصی' || clean === 'اختصاصی' || clean === 'بخش سوم مهارت های تخصصی'
    ) {
        return 2;
    }

    // Guarded matching for variations: only if words strictly consist of category header keywords
    const headerAllowedWords = new Set([
        'مهارت', 'مهارتهای', 'مهارتها', 'های', 'حیطه', 'بخش', 'واحد', 'گروه',
        'اول', 'دوم', 'سوم', 'چهارم', 'پرستاری', 'بالینی', 'و', 'اخلاق', 'حرفه', 'ای'
    ]);

    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 5) {
        if (words.some(w => w.includes('عمومی')) && words.every(w => w.includes('عمومی') || headerAllowedWords.has(w))) {
            return 0;
        }
        if (words.some(w => w.includes('ارتباط') || w.includes('اخلاق')) && words.every(w => w.includes('ارتباط') || w.includes('اخلاق') || headerAllowedWords.has(w))) {
            return 1;
        }
        if (words.some(w => w.includes('تخصص') || w.includes('اختصاص')) && words.every(w => w.includes('تخصص') || w.includes('اختصاص') || headerAllowedWords.has(w))) {
            return 2;
        }
    }

    return null;
};

/**
 * Checks if a row represents one of the two summary rows that appear at the end of each section:
 * 1. «کل نمره: N» یا «نمره کل: N»
 * 2. «درصد نمره»
 * These rows MUST NEVER be counted as skill items.
 */
const isSummaryRow = (row: any[]): boolean => {
    if (!row || row.length === 0) return false;

    // Scan columns 0 through 5 for summary indicators
    for (let c = 0; c < Math.min(row.length, 6); c++) {
        const raw = row[c];
        if (raw === undefined || raw === null) continue;
        const str = normalizePersianText(raw);
        if (!str) continue;

        const stripped = str.replace(/[0-9۰-۹:()\-_%.\s]/g, '');

        if (
            str.includes('کل نمره') || str.includes('نمره کل') ||
            str.includes('درصد نمره') || str.includes('درصد کل') ||
            str.includes('میانگین درصد') || str.includes('جمع نمره') ||
            str.includes('مجموع نمره') || str.includes('امتیاز کل') ||
            str.includes('نمره میانگین') || str.includes('تعداد موارد') ||
            str.includes('تعداد کل') ||
            stripped === 'کلنمره' || stripped === 'نمرهکل' ||
            stripped === 'درصدنمره' || stripped === 'درصدکل' ||
            stripped === 'مجموع' || stripped === 'جمع' ||
            stripped === 'میانگین' || stripped === 'درصد' ||
            stripped === 'امتیاز'
        ) {
            return true;
        }
    }
    return false;
};

/**
 * Checks if a row is a table header, subheader, or signature footer.
 */
const isHeaderOrFooterRow = (row: any[]): boolean => {
    if (!row || row.length === 0) return true;

    let hasAnyContent = false;
    for (let c = 0; c < Math.min(row.length, 5); c++) {
        const t = normalizePersianText(row[c]);
        if (t && t.length > 0) {
            hasAnyContent = true;
            break;
        }
    }
    if (!hasAnyContent) return true;

    for (let c = 0; c < Math.min(row.length, 5); c++) {
        const t = normalizePersianText(row[c]);
        if (!t) continue;
        if (
            t === 'ردیف' || t === 'رديف' || t === 'عنوان مهارت' || t === 'عناوین مهارت' ||
            t === 'شرح مهارت' || t === 'نام مهارت' || t === 'عناوین' || t === 'کد' ||
            t.startsWith('امضا') || t.startsWith('امضاء') || t.startsWith('نام و امضا') ||
            t.startsWith('مترون') || t.startsWith('سوپروایزر') || t.startsWith('مسئول بخش') ||
            t.startsWith('ارزیابی کننده') || t.startsWith('تاریخ') || t.startsWith('توضیحات') ||
            t.startsWith('ملاحظات') || t.startsWith('کد فرم') || t.startsWith('صفحه ') ||
            t.startsWith('شماره فرم')
        ) {
            // Guard against clinical skills that contain words like "تاریخ انقضا"
            if (!t.includes('دارو') && !t.includes('بیمار') && !t.includes('پرونده') && !t.includes('تجهیزات')) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Extracts staff name from sheet header if explicitly written, otherwise returns defaultSheetName.
 */
const extractStaffNameFromSheet = (json: any[][], defaultSheetName: string): string => {
    for (let r = 0; r < Math.min(json.length, 5); r++) {
        const row = json[r];
        if (!row) continue;
        for (let c = 0; c < Math.min(row.length, 8); c++) {
            const val = normalizePersianText(row[c]);
            if (val.includes('نام و نام خانوادگی') || val.includes('نام پرسنل') || val.includes('نام ارزیابی شونده') || val.includes('نام کارمند')) {
                const parts = val.split(/[:：]/);
                if (parts.length > 1 && parts[1].trim().length >= 3) {
                    return parts[1].trim();
                }
                if (c + 1 < row.length) {
                    const nextVal = normalizePersianText(row[c + 1]);
                    if (nextVal && nextVal.length >= 3 && !nextVal.includes('نام') && !nextVal.includes('بخش')) {
                        return nextVal;
                    }
                }
            }
        }
    }
    return defaultSheetName.trim();
};

/**
 * Parses a single worksheet containing skill assessment data.
 * 
 * Implements the full hospital evaluation checklist specification:
 * 1. Sheet title (row 1) and table headers (rows 3 and 4) are safely ignored.
 * 2. Dynamically detects the "ردیف" column in header rows:
 *    - Standard sheets: Col B (1) = ردیف, Col C (2) = عنوان مهارت, Col D (3) = شروع ماه‌ها
 *    - Shifted sheets (اتاق عمل / هوشبری): Col C (2) = ردیف, Col D (3) = عنوان مهارت, Col E (4) = شروع ماه‌ها
 * 3. Categorization:
 *    - Categorization strictly follows Column A sequential labels:
 *      Category 0: «مهارت عمومی»
 *      Category 1: «مهارت ارتباطی»
 *      Category 2: «مهارت تخصصی»
 *    - For Practical Nurse (بهیار) and Nurse Assistant (کمک پرستار), only 2 categories exist.
 *      Category 2 does NOT exist and is not fabricated.
 * 4. Summary rows («کل نمره», «درصد نمره») are strictly excluded and never counted as skills.
 * 5. Registered vs. Unregistered Months:
 *    - Unregistered months are completely empty (None).
 *    - Registered months have numbers between 1 and 4 in raw score columns.
 *    - Percentage formula columns (G/M/S/Y) are never used to determine month status.
 *    - If a month has no scores between 1 and 4, it is NOT registered and omitted from the returned map.
 */
export const parseAssessmentsFromSheet = (worksheet: XLSX.WorkSheet): Map<string, SkillCategory[]> => {
    const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
    const assessments = new Map<string, SkillCategory[]>();

    if (!json || json.length < 4) return assessments;

    // 1. Detect "ردیف" (Row Number) column in header rows (rows 0 to 5)
    let radifColIndex = 1; // Default: Col B (standard layout)
    let radifRowIndex = 2; // Default: Row 3 (0-indexed 2)
    let foundRadif = false;

    for (let r = 0; r < Math.min(json.length, 6); r++) {
        const row = json[r];
        if (!row) continue;
        for (let c = 0; c < Math.min(row.length, 5); c++) {
            const val = normalizePersianText(row[c]);
            if (val === 'ردیف' || val === 'رديف' || val.includes('ردیف') || val.includes('رديف')) {
                radifColIndex = c;
                radifRowIndex = r;
                foundRadif = true;
                break;
            }
        }
        if (foundRadif) break;
    }

    // Fallback detection if "ردیف" text was missing from header
    if (!foundRadif) {
        let col1Digits = 0;
        let col2Digits = 0;
        for (let r = 4; r < Math.min(json.length, 15); r++) {
            const row = json[r];
            if (!row) continue;
            if (/^\d+$/.test(toAsciiDigits(normalizePersianText(row[1])))) col1Digits++;
            if (/^\d+$/.test(toAsciiDigits(normalizePersianText(row[2])))) col2Digits++;
        }
        if (col2Digits > col1Digits) {
            radifColIndex = 2; // Shifted (اتاق عمل / هوشبری)
        } else {
            radifColIndex = 1; // Standard
        }
    }

    // Determine key column offsets
    // Standard: categoryCol = 0 (A), radifCol = 1 (B), descCol = 2 (C), monthBase = 3 (D)
    // Shifted (اتاق عمل / هوشبری): categoryCol = 0 (A), subPhase = 1 (B), radifCol = 2 (C), descCol = 3 (D), monthBase = 4 (E)
    const categoryColIndex = 0;
    const descColIndex = radifColIndex + 1;
    const monthBase = radifColIndex + 2;

    // 2. Map the 12 Jalali Months to their exact column positions
    // Each quarter occupies 6 columns: 3 months + 1 percent + 1 has/has-not + 1 corrective action
    const monthColMap = new Map<string, number>();

    // Scan headers (rows 0 to 5) for explicit month names
    for (let r = 0; r < Math.min(json.length, 6); r++) {
        const row = json[r];
        if (!row) continue;
        for (let c = monthBase; c < row.length; c++) {
            const cellVal = row[c];
            if (cellVal !== undefined && cellVal !== null) {
                const foundMonth = matchJalaliMonth(String(cellVal));
                if (foundMonth && !monthColMap.has(foundMonth)) {
                    monthColMap.set(foundMonth, c);
                }
            }
        }
    }

    // Fallback/fill using the strict 6-column quarter mathematical formula from the guide
    for (let mIdx = 0; mIdx < JALALI_MONTHS.length; mIdx++) {
        const monthName = JALALI_MONTHS[mIdx];
        if (!monthColMap.has(monthName)) {
            const q = Math.floor(mIdx / 3);
            const mInQ = mIdx % 3;
            const expectedCol = monthBase + q * 6 + mInQ;
            monthColMap.set(monthName, expectedCol);
        }
    }

    // 3. Scan rows and collect skills per category
    // categorySkills[0] = مهارت های عمومی
    // categorySkills[1] = مهارت های ارتباطی
    // categorySkills[2] = مهارت های تخصصی
    const categorySkills: { radif: number; description: string; rawRow: any[] }[][] = [
        [],
        [],
        []
    ];

    let currentCategory = 0;
    let inSummaryBlock = false;
    let category0Finished = false;
    let category1Finished = false;

    // Data rows begin after headers (row 4 or 5)
    const startRow = Math.max(4, radifRowIndex + 1);

    for (let r = startRow; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length === 0) continue;

        // Check if this row is one of the two summary rows («کل نمره», «درصد نمره»)
        if (isSummaryRow(row)) {
            inSummaryBlock = true;
            if (currentCategory === 0) {
                category0Finished = true;
            } else if (currentCategory === 1) {
                category1Finished = true;
            }
            continue; // Skip summary rows completely
        }

        // Check if this row is a header or footer row
        if (isHeaderOrFooterRow(row)) {
            continue;
        }

        // Check for category label in Column A or before description column
        let explicitCategory: number | null = null;
        for (let c = 0; c <= categoryColIndex; c++) {
            const cat = getCategoryFromCell(row[c]);
            if (cat !== null) {
                explicitCategory = cat;
                break;
            }
        }

        if (explicitCategory !== null) {
            currentCategory = explicitCategory;
            inSummaryBlock = false;
        } else if (inSummaryBlock) {
            // If we just finished a category summary and encounter skills:
            if (category0Finished && currentCategory === 0) {
                currentCategory = 1;
                inSummaryBlock = false;
            }
        }

        // Extract skill description from descColIndex
        let skillDesc = normalizePersianText(row[descColIndex]);

        // If primary column empty, check adjacent candidate columns before monthBase
        if (!skillDesc || skillDesc.length < 2 || /^\d+$/.test(skillDesc)) {
            for (let c = 1; c < monthBase; c++) {
                if (c === descColIndex || c === radifColIndex) continue;
                const text = normalizePersianText(row[c]);
                if (text && text.length >= 3 && !/^\d+$/.test(text) && getCategoryFromCell(text) === null) {
                    skillDesc = text;
                    break;
                }
            }
        }

        if (!skillDesc || skillDesc.length < 2 || /^\d+$/.test(skillDesc)) {
            continue; // Empty row or banner row without skill text
        }

        // Make sure description is not a standalone category header
        if (getCategoryFromCell(skillDesc) !== null) {
            continue;
        }

        // Clean leading numbering like "1- " or "۱. "
        skillDesc = skillDesc.replace(/^[0-9۰-۹]+[\s.\-_:)]+\s*/, '').trim();
        if (skillDesc.length < 2) continue;

        // Parse row number if present
        let radifNum = 0;
        const radifRaw = row[radifColIndex];
        if (radifRaw !== undefined && radifRaw !== null) {
            const radifStr = toAsciiDigits(normalizePersianText(radifRaw)).trim();
            const match = radifStr.match(/^\d+$/);
            if (match) {
                radifNum = parseInt(match[0], 10);
            }
        }

        // If row number restarts at 1 and we were after category 0 summary, ensure category 1:
        if (radifNum === 1 && category0Finished && currentCategory === 0) {
            currentCategory = 1;
        }

        // If we are after category 1 summary and row number restarts at 1:
        // Transition to category 2 if explicit label seen or if clinical skills continue
        if (radifNum === 1 && category1Finished && currentCategory === 1) {
            // Check if this row or previous row had Category 2 label
            if (explicitCategory === 2) {
                currentCategory = 2;
            }
        }

        // Guard against duplicate skills within the same category
        const targetSkills = categorySkills[currentCategory];
        if (!targetSkills.some(s => s.description === skillDesc)) {
            targetSkills.push({
                radif: radifNum,
                description: skillDesc,
                rawRow: row
            });
        }
    }

    // Flatten all skills to check registered month status
    const allSkills: { radif: number; description: string; rawRow: any[] }[] = [];
    for (let c = 0; c < 3; c++) {
        allSkills.push(...categorySkills[c]);
    }

    if (allSkills.length === 0) {
        return assessments;
    }

    // 4. Identify Registered Months and Extract Scores
    // Rule: A month is registered IF AND ONLY IF it has at least one raw score between 1 and 4.
    for (let mIdx = 0; mIdx < JALALI_MONTHS.length; mIdx++) {
        const monthName = JALALI_MONTHS[mIdx];
        const colIndex = monthColMap.get(monthName);
        if (colIndex === undefined) continue;

        let validScoreCount = 0;
        for (const skill of allSkills) {
            const raw = skill.rawRow[colIndex];
            const parsed = parseRawMonthScore(raw);
            if (parsed !== null && parsed >= 1 && parsed <= 4) {
                validScoreCount++;
            }
        }

        // If no scores between 1 and 4 exist, this month was NOT registered
        if (validScoreCount === 0) {
            continue;
        }

        // Build categories for this registered month
        const monthCategories: SkillCategory[] = [];

        for (let c = 0; c < 3; c++) {
            const skillsInCat = categorySkills[c];
            // Only include categories that exist in this sheet
            // (e.g. بهیار and کمک پرستار have only categories 0 and 1)
            if (skillsInCat.length === 0) continue;

            const items: SkillItem[] = skillsInCat.map((skill, idx) => {
                const raw = skill.rawRow[colIndex];
                const parsed = parseRawMonthScore(raw);
                return {
                    description: skill.description,
                    score: parsed !== null ? parsed : 0,
                    radif: skill.radif > 0 ? skill.radif : (idx + 1)
                };
            });

            monthCategories.push({
                name: CATEGORY_NAMES[c],
                items
            });
        }

        if (monthCategories.length > 0) {
            assessments.set(monthName, monthCategories);
        }
    }

    return assessments;
};

/**
 * Parses an Excel file for a single department/staff assessment.
 */
export const parseExcelData = (file: File): Promise<Map<string, SkillCategory[]>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const assessments = parseAssessmentsFromSheet(worksheet);

        if (assessments.size === 0) {
            throw new Error("داده ارزیابی معتبری با ماه‌های ثبت‌شده یافت نشد. اطمینان حاصل کنید که حداقل یک ماه با نمرات ۱ تا ۴ در فایل پر شده باشد.");
        }
        
        resolve(assessments);

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(error instanceof Error ? error : new Error("Failed to parse Excel file."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parses a comprehensive Excel workbook containing multiple sheets (one sheet per staff member or department).
 */
export const parseComprehensiveExcel = (file: File): Promise<{ [staffName: string]: Map<string, SkillCategory[]> }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const allStaffData: { [staffName: string]: Map<string, SkillCategory[]> } = {};

                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const staffAssessments = parseAssessmentsFromSheet(worksheet);
                    if (staffAssessments.size > 0) {
                        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
                        const resolvedStaffName = extractStaffNameFromSheet(json, sheetName);
                        allStaffData[resolvedStaffName] = staffAssessments;
                    }
                }
                
                if (Object.keys(allStaffData).length === 0) {
                    throw new Error("فایل اکسل جامع معتبر نیست. داده‌های ارزیابی ثبت‌شده‌ای در شیت‌ها یافت نشد.");
                }
                resolve(allStaffData);
            } catch (error) {
                console.error("Error parsing comprehensive Excel file:", error);
                reject(error instanceof Error ? error : new Error("Failed to parse comprehensive Excel file."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Parses a filled checklist file. Supports both standard simple templates and full hospital checklist sheets.
 */
export const parseFilledChecklist = (file: File): Promise<{ skills: SkillCategory[], templateInfo: Partial<NamedChecklistTemplate> }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 1. Try single-checklist metadata format
        const templateName = json[0]?.[1] as string;
        const scoreRangeStr = json[1]?.[1] as string;
        const scoreRange = scoreRangeStr?.match(/(\d+\.?\d*)\s*to\s*(\d+\.?\d*)/);

        if (templateName && scoreRange) {
            const minScore = parseFloat(scoreRange[1]);
            const maxScore = parseFloat(scoreRange[2]);
            const templateId = json[2]?.[1] as string;
            const templateInfo: Partial<NamedChecklistTemplate> = { id: templateId, name: templateName, minScore, maxScore };

            const categoriesMap = new Map<string, SkillItem[]>();
            let currentCategoryName = '';

            for (let i = 5; i < json.length; i++) {
              const row = json[i];
              if (!row || row.length < 2) continue;

              const rawCat = (row[0] as string)?.trim();
              if (rawCat && rawCat.length > 0) {
                  currentCategoryName = rawCat;
              }

              const description = (row[1] as string)?.trim();
              const rawScore = row[2];

              if (!currentCategoryName || !description) continue;
              
              const parsedScore = parseScoreValue(rawScore);
              const score = parsedScore !== null ? parsedScore : 0;

              if (!categoriesMap.has(currentCategoryName)) {
                categoriesMap.set(currentCategoryName, []);
              }
              categoriesMap.get(currentCategoryName)!.push({
                description,
                score,
                radif: categoriesMap.get(currentCategoryName)!.length + 1
              });
            }

            if (categoriesMap.size > 0) {
                const skills: SkillCategory[] = Array.from(categoriesMap.entries()).map(([name, items]) => ({
                    name,
                    items
                }));
                resolve({ skills, templateInfo });
                return;
            }
        }

        // 2. Fallback to hospital checklist format via parseAssessmentsFromSheet
        const assessments = parseAssessmentsFromSheet(worksheet);
        if (assessments.size > 0) {
            // Pick first registered month's skills
            const firstMonth = assessments.keys().next().value;
            const skills = assessments.get(firstMonth) || [];
            const templateInfo: Partial<NamedChecklistTemplate> = {
                id: sheetName,
                name: sheetName,
                minScore: 1,
                maxScore: 4
            };
            resolve({ skills, templateInfo });
            return;
        }

        throw new Error("فایل اکسل معتبر نیست. لطفاً از فایل اکسل ارزیابی مهارت‌ها استفاده کنید.");

      } catch (error) {
        console.error("Error parsing filled checklist:", error);
        reject(error instanceof Error ? error : new Error("خطا در پردازش فایل چک‌لیست."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
