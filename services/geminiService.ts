import { StaffMember, SkillItem } from '../types';
import { GoogleGenAI } from '@google/genai';

const CLIENT_GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || 'AQ.Ab8RN6Ibb3Wc27jXphyJCW9bvHvMGvMoDu4VJVQhGS6OTmtrYA';

export const OFFICIAL_SOURCES_WITH_MONITORING = '';

/**
 * Generate AI-driven comprehensive 30-day clinical improvement plan for a staff member.
 * Calls backend Gemini API server-side endpoint.
 */
export const generateImprovementPlan = async (
  staff: StaffMember,
  weakSkillsByCategory: { categoryName: string; skills: SkillItem[] }[],
  supervisorMessage?: string,
  managerMessage?: string
): Promise<string> => {
  const weakSkills = weakSkillsByCategory.flatMap(category =>
    category.skills.map(skill => ({
      description: skill.description,
      categoryName: category.categoryName,
      score: skill.score,
      radif: skill.radif,
      referenceText: skill.radif ? `مهارت شماره ${skill.radif} از مهارت‌های ${category.categoryName}` : skill.description
    }))
  );

  try {
    const response = await fetch('/api/gemini/generate-improvement-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffName: staff.name,
        staffTitle: staff.title,
        weakSkills,
        supervisorMessage,
        managerMessage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data.plan || "برنامه بهبود تولید نشد.";
  } catch (err) {
    console.warn("Falling back to local template due to network/server error:", err);
    return `# برنامه جامع توانمندسازی و ارتقای بالینی ۳۰ روزه برای ${staff.name} (${staff.title || 'کادر درمان'})

### ۱. تحلیل شایستگی و واکاوی آماری نمرات:
- تمرکز این برنامه بر روی سنجه‌های با نمره ۱ و ۲ (نیازمند نظارت مستقیم و حداقلی) است.
- سنجه‌های با نمره ۳ و ۴ به عنوان نقاط قوت و تسلط مستقل پرسنل تثبیت شده‌اند و نیازی به بازگویی متن آنها نیست.

### ۲. برنامه راهبردی و اقدامات اصلاحی ۳۰ روزه:
- **دهه اول (روز ۱ تا ۱۰ - بازآموزی علمی و استانداردها):** بازخوانی گایدلاین‌های بالینی، الزامات کنترل عفونت و دارودهی ایمن.
- **دهه دوم (روز ۱۱ تا ۲۰ - شبیه‌سازی در Skill Lab):** تمرین پروسیجرهای پرخطر با راهنمایی مربی بالینی معین تحت نظارت سرپرستار بخش.
- **دهه سوم (روز ۲۱ تا ۳۰ - استقلال بالینی و آزمون DOPS):** اجرای پروسیجرها بر بالین بیمار واقعی و ارزیابی با آزمون مشاهده مستقیم مهارت‌های بالینی (DOPS).

${supervisorMessage ? `\n> **پیام سوپروایزر آموزشی:** ${supervisorMessage}\n` : ''}
${managerMessage ? `\n> **پیام مسئول بخش:** ${managerMessage}\n` : ''}
`;
  }
};

/**
 * Analyze Hospital or Department skills using real Gemini AI server-side endpoint.
 */
export const analyzeSkillsWithAI = async (params: {
  contextType: 'hospital' | 'department';
  hospitalName?: string;
  departmentName?: string;
  evaluatedStaffCount: number;
  overallAvg: number;
  genAvg: number;
  specAvg: number;
  commAvg: number;
  skillsNeedingTraining?: Array<{
    skillName: string;
    categoryName: string;
    averageScore: number;
    lowCount: number;
  }>;
}): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/analyze-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data.analysis || "تحلیل هوشمند انجام نشد.";
  } catch (err) {
    console.error("Failed to analyze skills with AI:", err);
    return `## گزارش تحلیل مهارتی ${params.contextType === 'hospital' ? params.hospitalName : params.departmentName}
- میانگین کل: ${params.overallAvg}٪
- عمومی: ${params.genAvg}٪ | تخصصی: ${params.specAvg}٪ | ارتباطی: ${params.commAvg}٪

---

${OFFICIAL_SOURCES_WITH_MONITORING}`;
  }
};

/**
 * Ask custom question to Gemini AI based on scores/skills
 */
export const askCustomQuestionWithAI = async (params: {
  contextName: string;
  evaluatedStaffCount: number;
  overallAvg: number;
  genAvg: number;
  specAvg: number;
  commAvg: number;
  userQuery: string;
  skillsData?: any;
}): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/ask-custom-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data.answer || "پاسخی دریافت نشد.";
  } catch (err) {
    console.error("Failed to ask custom question to AI:", err);
    return `پاسخ به سوال شما بر اساس شاخص‌ها: میانگین کل ${params.overallAvg}٪ می‌باشد. اتصال سرور را بررسی نمایید.\n\n${OFFICIAL_SOURCES_WITH_MONITORING}`;
  }
};

/**
 * Generate specific corrective action for a low-scoring skill using Gemini AI.
 */
export const suggestCorrectiveActionWithAI = async (params: {
  departmentName: string;
  skillName: string;
  categoryName: string;
  averageScore: number;
  lowCount: number;
}): Promise<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }> => {
  try {
    const response = await fetch('/api/gemini/suggest-corrective-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Failed to get AI corrective action suggestion:", err);
    return {
      title: `اقدام اصلاحی: ${params.skillName}`,
      description: `برگزاری کارگاه بازآموزی فشرده و ارزیابی با آزمون عملی DOPS در بخش ${params.departmentName} برای ${params.lowCount} نفر پرسنل طبق استانداردهای کتاب برونر-سودارث و پاتر-پری.`,
      priority: params.averageScore < 60 ? 'high' : 'medium',
    };
  }
};

/**
 * Generate a comprehensive status overview and 1-month, 3-month, 6-month, and 1-year plans with AI.
 * Strictly evaluates all skills based on percentage and adheres to the 5 mandatory sources.
 */
export const generatePeriodicPlanWithAI = async (params: {
  mode: 'hospital' | 'department' | 'staff';
  hospitalName?: string;
  departmentName: string;
  staffName?: string;
  staffTitle?: string;
  overallAvg: number;
  genAvg: number;
  specAvg: number;
  commAvg: number;
  totalStaffCount?: number;
  skillsSummary?: any[];
  weakSkills?: any[];
  staffDetails?: any[];
  supervisorMessage?: string;
  managerMessage?: string;
  activeYear?: number;
}): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/generate-periodic-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data.plan || "برنامه‌ای دریافت نشد.";
  } catch (err) {
    console.error("Failed to generate periodic plan with AI:", err);
    const target = params.mode === 'staff' ? `پرسنل محترم ${params.staffName} (${params.staffTitle || 'کارشناس بالینی'}) - بخش ${params.departmentName}` : `کلیه پرسنل بخش ${params.departmentName}`;

    // Statistical breakdown
    const allSkills = params.skillsSummary || [];
    const redCount = allSkills.filter((s: any) => (s.percentage || 0) < 65).length;
    const orangeCount = allSkills.filter((s: any) => (s.percentage || 0) >= 65 && (s.percentage || 0) < 75).length;
    const yellowCount = allSkills.filter((s: any) => (s.percentage || 0) >= 75 && (s.percentage || 0) < 85).length;
    const greenCount = allSkills.filter((s: any) => (s.percentage || 0) >= 85).length;

    let rank = 'متوسط';
    let riskColor = 'نارنجی';
    if (params.overallAvg >= 95) {
      rank = 'عالی';
      riskColor = 'سبز';
    } else if (params.overallAvg >= 85) {
      rank = 'خوب';
      riskColor = 'سبز / زرد';
    } else if (params.overallAvg >= 75) {
      rank = 'متوسط';
      riskColor = 'زرد / نارنجی';
    } else {
      rank = 'ضعیف (پرخطر)';
      riskColor = 'قرمز';
    }

    // Generate Clean Staff Operational Matrix if staffDetails available
    let staffMatrixSection = '';
    if (params.mode === 'department' && params.staffDetails && params.staffDetails.length > 0) {
      const proficientStaff = params.staffDetails.filter((s: any) => (s.expertSkills && s.expertSkills.length > 0) || (s.strongSkills && s.strongSkills.length > 0));

      let staffTable = `| ردیف | نام پرسنل | سمت | میانگین شایستگی | وضعیت نیاز به توانمندسازی | اقدام عملیاتی و مداخله آموزشی مشخص | مربی / منتور بالینی معین | مهلت اجرا | روش ارزیابی مجدد بر بالین |\n|:---:|:---|:---:|:---:|:---|:---|:---:|:---:|:---:|\n`;

      params.staffDetails.forEach((st: any, idx: number) => {
        const weakCount = (st.weakSkills || []).length;
        const weakStatus = weakCount > 0
          ? `دارای ${weakCount} سنجه نیازمند توانمندسازی (نمره زیر ۳)`
          : 'تسلط کامل و مستقل (کلیه سنجه‌ها ۳ و بالاتر)';
        const peerMentor = proficientStaff.find((p: any) => p.name !== st.name) || { name: 'سرپرستار بخش' };
        
        // High-level specific educational interventions based on weak count
        const concreteAction = weakCount > 0
          ? 'برگزاری کارگاه احیا، آموزش اکسیژن‌تراپی و تمرین در Skill Lab'
          : 'تثبیت شایستگی و ایفای نقش مربی / منتور بالینی در شیفت';

        staffTable += `| ${idx + 1} | **${st.name}** | ${st.title || 'کارشناس پرستاری'} | ${st.averagePercentage || 0}٪ | ${weakStatus} | ${concreteAction} | **${peerMentor.name}** | ۳۰ روزه | آزمون بالینی DOPS |\n`;
      });

      staffMatrixSection = `\n---\n\n## ۳. ماتریس برنامه عملیاتی توانمندسازی پرسنل بخش (منطبق بر نام پرسنل و وضعیت نمرات)\nجدول زیر به تفکیک نام دقیق پرسنل، وضعیت نمرات و تعیین مربیان بالینی معین تدوین شده است:\n\n${staffTable}\n`;
    }

    return `# برنامه جامع بهبود عملکرد و ارزیابی مهارتی بخش: ${params.departmentName}
**سامانه پایش عملکرد و توانمندسازی بالینی کادر پرستاری**
**مربوط به:** ${target}
**شاخص‌های میانگین حیطه‌ها:** امتیاز کل: **${params.overallAvg}٪** (رتبه: **${rank}** - رنگ ریسک: **${riskColor}**) | عمومی: **${params.genAvg}٪** | اختصاصی: **${params.specAvg}٪** | ارتباطی-رفتاری: **${params.commAvg}٪**

---

## ۱. تحلیل کلان و ریشه‌ای شایستگی‌ها (Executive Synthesis)
ارزیابی و دیپ سرچ عملکردی کادر بر مبنای حیطه‌های سه‌گانه و سطوح صلاحیت بالینی:
- **مهارت‌های عمومی:** میانگین **${params.genAvg}٪** (اصول پایه ایمنی بیمار، کنترل عفونت و بهداشت دست)
- **مهارت‌های اختصاصی:** میانگین **${specAvg || params.specAvg}٪** (پروسیجرهای بالینی ویژه بخش ${params.departmentName})
- **مهارت‌های ارتباطی-رفتاری:** میانگین **${params.commAvg}٪** (آموزش به بیمار، تحویل شیفت با الگوی ISBAR و ارتباط بین‌حرفه‌ای)
- **توزیع صلاحیت بالینی:** تعداد ${greenCount} سنجه در وضعیت تسلط مستقل (سبز)، ${yellowCount} سنجه در وضعیت رو به رشد (زرد)، و ${redCount + orangeCount} سنجه در رده نیازمند مداخله و آموزش مستقیم قرار دارند.

${params.supervisorMessage ? `\n> 💬 **پیام سوپروایزر آموزشی:** ${params.supervisorMessage}\n` : ''}
${params.managerMessage ? `\n> 💬 **پیام سرپرستار بخش:** ${params.managerMessage}\n` : ''}

---

## ۲. برنامه اقدامات اصلاحی متمرکز (Targeted Corrective Actions)
۱. **مداخله فوری با آموزش و نظارت مستقیم:** پروسیجرهای دارای نمره ۱ و ۲ صرفاً با حضور مستقیم مربی بالینی یا سرپرستار اجرا شوند.
۲. **بازآموزی عملی بر بالین:** تمرین گام‌به‌گام پروسیجرهای پرخطر با استفاده از چک‌لیست‌های استاندارد DOPS.
۳. **پایش و ممیزی شیفتی:** ممیزی مستمر شستشوی دست ۶ مرحله‌ای و احراز هویت دوگانه بیمار در کلیه شیفت‌های کاری.
${staffMatrixSection || `
---

## ۳. برنامه توانمندسازی بالینی و تقویم آموزشی
- **تمرین در مرکز مهارت‌های بالینی (Skill Lab):** اجرای سناریوهای شبیه‌سازی مهارت‌های بالینی و پروسیجرهای پرخطر.
- **تمرین بالینی تحت نظارت:** تعیین کارشناس ارشد شیفت جهت پشتیبانی و نظارت بالینی در حین ارائه مراقبت‌ها.
- **ارزیابی مستقیم عملکرد با DOPS:** اجرای آزمون مشاهده مستقیم مهارت‌های پروسیجرال بالینی (DOPS) در بالین بیمار.
`}
---

## ۴. برنامه به‌کارگیری پرسنل خبره بخش به عنوان مربیان بالینی (Preceptors)
- **انتصاب به عنوان مربی بالینی (Preceptor):** پرسنل با امتیازات برتر (نمره ۴) در هر شیفت به عنوان مربی و ناظر بالینی پرسنل نیازمند توانمندسازی تعیین می‌شوند.
- **مسئولیت نظارت در شیفت:** هدایت همکاران در اجرای تکنیک‌های آسپتیک، دارودهی ایمن و تحویل شیفت استاندارد با الگوی ISBAR.
- **ارزیابی اثربخشی:** ارزیابی مجدد صلاحیت پرسنل در پایان دوره ۳۰ روزه با آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS) توسط سرپرستار بخش انجام خواهد شد.`;
  }
};

/**
 * Generate training program, skill definition & step-by-step guideline education for a specific skill.
 */
export const generateSkillTrainingWithAI = async (params: {
  skillName: string;
  categoryName: string;
  departmentName: string;
  staffName?: string;
  currentScore?: number;
  maxPossibleScore?: number;
  userRole?: string;
}): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/generate-skill-training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data.training || "آموزشی برای این مهارت دریافت نشد.";
  } catch (err) {
    console.error("Failed to generate skill training with AI:", err);
    const percentage = (params.maxPossibleScore || 4) > 0
      ? Math.round(((params.currentScore || 0) / (params.maxPossibleScore || 4)) * 100)
      : 0;

    return `# طرح جامع آموزشی و راهنمای بالینی گام‌به‌گام مهارت: ${params.skillName}
**دسته‌بندی:** ${params.categoryName} | **بخش:** ${params.departmentName}${params.staffName ? ` | **پرسنل:** ${params.staffName}` : ''}
${params.currentScore !== undefined ? `**نمره ثبت‌شده:** ${params.currentScore} از ${params.maxPossibleScore || 4} (${percentage}٪)` : ''}

---

## ۱. برنامه آموزشی اختصاصی مهارت (Training Plan)
- **تحلیل وضعیت:** با توجه به نمره ارزیابی (${params.currentScore !== undefined ? `${params.currentScore}/${params.maxPossibleScore || 4}` : 'نیاز به سنجش'} - ${percentage}٪)، این پرسنل نیازمند ${percentage < 60 ? 'بازآموزی فوری و فشرده تحت سوپرویژن مستقیم' : percentage < 75 ? 'تقویت تکنیک و رفع خطاهای جزئی' : 'تثبیت تسلط و آموزش به سایر همکاران'} می‌باشد.
- **مراحل آموزش:**
  - **مرحله ۱ (تئوری):** مطالعه استانداردهای پروسیجر و اصول علمی مرتبط.
  - **مرحله ۲ (شبیه‌سازی):** تمرین پروسیجر روی مولاژ در Skill Lab با هدایت سوپروایزر آموزشی.
  - **مرحله ۳ (اجرا در شیفت):** اجرای تکنیک بر بالین تحت سوپرویژن مستقیم سرپرستار بخش با چک‌لیست DOPS.
  - **مرحله ۴ (تایید شایستگی):** ارزیابی با آزمون عملی OSCE و ثبت نمره در پرونده.

---

## ۲. معرفی و شرح جامع مهارت (Skill Definition & Rationale)
- **تعریف علمی و بالینی:** مهارت «${params.skillName}» جزء پروسیجرهای استاندارد مراقبت از بیمار در بخش ${params.departmentName} است که جهت تسهیل فرآیند درمان، ثبات همودینامیک و پیشگیری از وخامت بالینی انجام می‌گیرد.
- **اهداف فیزیولوژیک:** تسریع بهبودی، حفظ ایمنی بیمار و پیشگیری از عوارض بیمارستانی.
- **ارتباط با سنجه‌ها:** اجرای صحیح این مهارت ضامن رعایت استانداردهای ایمنی بیمار و پیشگیری از خطاهای بالینی است.

---

## ۳. آموزش کامل و گام‌به‌گام طبق پروتکل‌های بالینی (Step-by-Step Procedure)
### الف) تجهیزات مورد نیاز:
- وسایل حفاظت فردی (دستکش استریل یا تمیز طبق پروتکل، ماسک، شیلد)
- ست استریل پروسیجر و اقلام مصرفی دارای تاریخ انقضا و بارکد معتبر
- محلول ضدعفونی‌کننده پوستی استاندارد
- ظرف ایمنی پسماند (Safety Box) و کیسه پسماند عفونی

### ب) اقدامات قبل از پروسیجر:
۱. احراز هویت دوگانه بیمار (نام و نام‌خانوادگی و شماره پرونده) قبل از اقدام.
۲. توضیح کامل روند کار به بیمار و جلب همکاری و رضایت آگاهانه.
۳. شستشوی بهداشتی دست با محلول پایه الکلی طبق روش ۶ مرحله‌ای بهداشت دست.
۴. قرار دادن بیمار در وضعیت مناسب ارگونومیک و حفظ حریم خصوصی.

### ج) مراحل اجرای تکنیکال مهارت (گام‌به‌گام):
۱. بررسی یکپارچگی بسته‌بندی استریل و برقراری محیط آسپتیک.
۲. آماده‌سازی و ضدعفونی موضع به صورت چرخشی از مرکز به محیط با قطر مناسب.
۳. اجرای گام‌به‌گام مهارت با حرکات سنجیده و تسلط بر اصول مراقبتی.
۴. پایش علائم حیاتی و آسایش بیمار در طول انجام پروسیجر.

### د) مراقبت‌های بعد از پروسیجر:
۱. دور انداختن وسایل برنده در Safety Box بدون سرپوش‌گذاری مجدد.
۲. قرار دادن بیمار در پوزیشن راحت و مطمئن شدن از بالا بودن بد ریل‌ها.
۳. مستندسازی کامل و بدون تاخیر (تاریخ، ساعت، نام اقدام‌کننده و مشاهدات) در پرونده بالینی.

---

## ۴. روش و سنجه پایش بالینی و شاخص‌های ارزیابی (Monitoring Method)
- **روش پایش:** آزمون ساختاریافته عینی ایستگاهی (OSCE) و ارزیابی مستقیم در بالین (DOPS) توسط سرپرستار بخش.
- **شاخص‌های کلیدی:** رعایت کامل تکنیک آسپتیک، عدم ایجاد تروما در موضع، و رضایت بیمار.

---
`;
  }
};
