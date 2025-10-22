import { SkillCategory, SkillItem, NamedChecklistTemplate } from '../types';
import * as XLSX from 'xlsx';

/**
 * Parses a single worksheet that contains skill assessment data for multiple months.
 * It expects month names to be in row 4 (from column E to Y) and skill data
 * to start from row 5, with descriptions in column D and scores in the
 * corresponding month columns.
 * @param worksheet The XLSX worksheet object.
 * @returns A Map where keys are month names and values are the skill category data for that month.
 */
const parseAssessmentsFromSheet = (worksheet: XLSX.WorkSheet): Map<string, SkillCategory[]> => {
    const json: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const assessments = new Map<string, SkillCategory[]>();

    if (json.length < 5) return assessments; // Not enough data for headers and skills

    const monthRow = json[3]; // Row 4 (0-indexed)
    const monthColumns: { month: string, colIndex: number }[] = [];

    // Columns E to Y correspond to indices 4 to 24
    for (let i = 4; i <= 24; i++) {
        const monthName = monthRow[i];
        if (monthName && typeof monthName === 'string' && monthName.trim().length > 0) {
            const trimmedMonth = monthName.trim();
            monthColumns.push({ month: trimmedMonth, colIndex: i });
            // Initialize categories for each found month
            assessments.set(trimmedMonth, [
                { name: "مهارت های عمومی", items: [] },
                { name: "مهارت های تخصصی", items: [] },
                { name: "مهارت های ارتباطی", items: [] },
            ]);
        }
    }

    if (monthColumns.length === 0) {
        return assessments; // No valid months found in row 4
    }

    let currentCategoryIndex = 0;
    const categoryNames = ["مهارت های عمومی", "مهارت های تخصصی", "مهارت های ارتباطی"];

    // Start from row 5 (index 4)
    for (let i = 4; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;

        const description = row[3] as string; // Column D

        const isSeparator = typeof description === 'string' && (description.trim().includes('مجموع') || description.trim().includes('درصد کل'));

        if (isSeparator) {
            if (currentCategoryIndex < categoryNames.length - 1) {
                currentCategoryIndex++;
            }
            continue;
        }

        if (description && typeof description === 'string' && description.trim().length > 0) {
            monthColumns.forEach(({ month, colIndex }) => {
                const scoreValue = row[colIndex];
                
                // Only process the cell if it contains a valid number greater than 0.
                // This prevents empty cells and cells with 0 from being incorrectly treated as a registered score.
                if (typeof scoreValue === 'number' && isFinite(scoreValue)) {
                    if (scoreValue > 0 && scoreValue <= 4) {
                        const skillItem: SkillItem = { description: description.trim(), score: scoreValue };
                        const monthCategories = assessments.get(month);
                        if (monthCategories && monthCategories[currentCategoryIndex]) {
                            monthCategories[currentCategoryIndex].items.push(skillItem);
                        }
                    }
                }
            });
        }
    }
    
    // After parsing, filter out months that did not have any scores.
    // An assessment is only considered "registered" if at least one skill has a score.
    const validAssessments = new Map<string, SkillCategory[]>();
    for (const [month, categories] of assessments.entries()) {
        const hasAnyItems = categories.some(category => category.items.length > 0);
        if (hasAnyItems) {
            validAssessments.set(month, categories);
        }
    }

    return validAssessments;
};

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
            throw new Error("داده ارزیابی معتبری یافت نشد. اطمینان حاصل کنید که نام ماه‌ها در ردیف 4 (از ستون E تا Y) و داده‌های مهارت از ردیف 5 به بعد قرار دارند.");
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
                       allStaffData[sheetName.trim()] = staffAssessments;
                    }
                }
                
                if (Object.keys(allStaffData).length === 0) {
                    throw new Error("فایل اکسل جامع معتبر نیست. اطمینان حاصل کنید که نام هر شیت مطابق با نام پرسنل باشد و داده‌های ارزیابی در آن وجود داشته باشد.");
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

        // 1. Extract metadata
        const templateName = json[0]?.[1] as string;
        const scoreRangeStr = json[1]?.[1] as string;
        const scoreRange = scoreRangeStr?.match(/(\d+\.?\d*)\s*to\s*(\d+\.?\d*)/);
        const minScore = scoreRange ? parseFloat(scoreRange[1]) : 0;
        const maxScore = scoreRange ? parseFloat(scoreRange[2]) : 4;
        const templateId = json[2]?.[1] as string;

        if (!templateName || !scoreRange) {
          throw new Error("فایل اکسل معتبر نیست. متادیتا (نام قالب و بازه نمره) یافت نشد.");
        }

        const templateInfo: Partial<NamedChecklistTemplate> = { id: templateId, name: templateName, minScore, maxScore };

        // 2. Extract skills data
        const categoriesMap = new Map<string, SkillItem[]>();
        // Data starts from row 6 (index 5)
        for (let i = 5; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length < 3) continue;

          const categoryName = (row[0] as string)?.trim();
          const description = (row[1] as string)?.trim();
          const scoreStr = row[2] as string;

          if (!categoryName || !description) continue;
          
          if (scoreStr === null || scoreStr === undefined || String(scoreStr).trim() === '') {
            reject(new Error(`نمره‌ای برای مهارت "${description}" وارد نشده است. لطفاً تمام نمرات را تکمیل کنید.`));
            return;
          }

          const score = parseFloat(scoreStr);
          
          if (isNaN(score) || score < minScore || score > maxScore) {
              reject(new Error(`نمره نامعتبر برای مهارت "${description}". نمره باید بین ${minScore} و ${maxScore} باشد.`));
              return;
          }

          if (!categoriesMap.has(categoryName)) {
            categoriesMap.set(categoryName, []);
          }
          categoriesMap.get(categoryName)!.push({ description, score });
        }

        if (categoriesMap.size === 0) {
            throw new Error("هیچ مهارتی با نمره معتبر در فایل یافت نشد.");
        }

        const skills: SkillCategory[] = Array.from(categoriesMap.entries()).map(([name, items]) => ({
            name,
            items
        }));

        resolve({ skills, templateInfo });

      } catch (error) {
        console.error("Error parsing filled checklist:", error);
        reject(error instanceof Error ? error : new Error("خطا در پردازش فایل چک‌لیست."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};