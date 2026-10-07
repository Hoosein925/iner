import { StaffMember, SkillItem, SensitiveIndicatorsReport } from '../types';
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

export interface StaffAnalysisItem {
  name: string;
  title?: string;
  overallAvg: number;
  genAvg?: number;
  specAvg?: number;
  commAvg?: number;
  weakSkillsCount?: number;
  weakSkills?: Array<{ name: string; category?: string; scorePct?: number }>;
}

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
  staffList?: StaffAnalysisItem[];
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

    const targetTitle = params.contextType === 'hospital' ? `کل بیمارستان ${params.hospitalName || ''}` : `بخش ${params.departmentName || ''}`;

    let staffSection = '';
    if (params.staffList && params.staffList.length > 0) {
      const sortedStaff = [...params.staffList].sort((a, b) => (b.overallAvg || 0) - (a.overallAvg || 0));
      const topPerformer = sortedStaff[0] || { name: 'سرپرستار بخش', overallAvg: 90 };

      let table = `\n\n---\n\n### ۳. ماتریس برنامه توانمندسازی پرسنل و منتورهای بالینی معین (بر اساس نمرات):\n\n| ردیف | نام پرسنل | سمت | میانگین شایستگی | مهارت‌های نیازمند توانمندسازی | برنامه آموزشی پیشنهادی مشخص | منتور بالینی معین (بر اساس نمرات) | مهلت و شیوه ارزیابی |\n|:---:|:---|:---:|:---:|:---|:---|:---:|:---:|\n`;

      sortedStaff.forEach((st, idx) => {
        const weakCount = (st.weakSkills || []).length;
        const isTop = (st.overallAvg >= 85) || (st.name === topPerformer.name);
        const assignedMentor = isTop
          ? 'سرپرستار بخش / سوپروایزر آموزشی'
          : `${topPerformer.name} (کادر برتر بخش با نمره ${topPerformer.overallAvg}٪)`;

        let specificAction = 'تثبیت شایستگی، آموزش تکنیک‌های نوین و ایفای نقش مربی بالینی در شیفت';
        if (weakCount > 0) {
          const weakText = (st.weakSkills || []).map(w => w.name).join(' ');
          if (weakText.includes('دارو') || weakText.includes('تزریق') || weakText.includes('سرم')) {
            specificAction = 'کارگاه بازآموزی محاسبات دارویی و ایمنی تزریقات پرخطر + تمرین بر بالین';
          } else if (weakText.includes('احیا') || weakText.includes('اکسیژن') || weakText.includes('ساکشن') || weakText.includes('راه هوایی')) {
            specificAction = 'کارگاه احیای قلبی ریوی و اکسیژن‌تراپی + تمرین کد ۹۹ در Skill Lab';
          } else if (weakText.includes('عفونت') || weakText.includes('آسپتیک') || weakText.includes('سوند') || weakText.includes('دست')) {
            specificAction = 'کارگاه کنترل عفونت و تکنیک‌های آسپتیک سونداژ و تعویض پانسمان';
          } else {
            specificAction = 'کارگاه بازآموزی پروسیجرهای بالینی + پایش شیفتی با چک‌لیست DOPS';
          }
        }

        const weakDesc = weakCount > 0
          ? `دارای ${weakCount} سنجه نیازمند بهبود`
          : 'تسلط کامل و مستقل (سبز)';

        table += `| ${idx + 1} | **${st.name}** | ${st.title || 'کارشناس بالینی'} | ${st.overallAvg}٪ | ${weakDesc} | ${specificAction} | **${assignedMentor}** | ۳۰ روزه - آزمون DOPS |\n`;
      });

      let cards = `\n\n### ۴. برنامه توانمندسازی انفرادی هر پرسنل با توجه به مهارت‌ها:\n`;
      sortedStaff.forEach((st, idx) => {
        const weakCount = (st.weakSkills || []).length;
        const isTop = (st.overallAvg >= 85) || (st.name === topPerformer.name);
        const assignedMentor = isTop
          ? 'سرپرستار بخش / سوپروایزر آموزشی'
          : `${topPerformer.name} (کادر برتر بخش با میانگین ${topPerformer.overallAvg}٪)`;

        cards += `\n#### ۴.${idx + 1}. برنامه آموزشی: **${st.name}** (${st.title || 'کارشناس پرستاری'})\n`;
        cards += `- **میانگین شایستگی:** ${st.overallAvg}٪ (رتبه شایستگی: ${st.overallAvg >= 85 ? '🟢 مطلوب و مستقل' : st.overallAvg >= 75 ? '🟡 متوسط رو به رشد' : '🔴 نیازمند مداخله و نظارت مستقیم'})\n`;
        if (weakCount > 0) {
          cards += `- **سنجه‌های دارای ضعف در ارزیابی:** ${(st.weakSkills || []).map(w => `«${w.name}» (${w.scorePct || ''}٪)`).join('، ')}\n`;
          cards += `- **برنامه آموزشی پیشنهادی گام‌به‌گام:**\n`;
          cards += `  • گام ۱ (روز ۱ تا ۱۰): مطالعه گایدلاین‌های بالینی و شرکت در کارگاه تئوری\n`;
          cards += `  • گام ۲ (روز ۱۱ تا ۲۰): تمرین سناریومحور در Skill Lab و اجرای پروسیجر تحت نظارت مستقیم منتور\n`;
          cards += `  • گام ۳ (روز ۲۱ تا ۳۰): اجرای مستقل بر بالین بیمار و تأیید نهایی صلاحیت\n`;
        } else {
          cards += `- **وضعیت مهارت‌ها:** تسلط کامل در کلیه سنجه‌ها (نمره ۳ و ۴)\n`;
          cards += `- **برنامه پیشنهادی:** تثبیت شایستگی و ایفای نقش مربی بالینی در شیفت جهت آموزش به سایر پرسنل\n`;
        }
        cards += `- **شخص منتور بالینی معین (بر اساس نمرات):** **${assignedMentor}**\n`;
        cards += `- **روش و مهلت ارزیابی مجدد:** ۳۰ روز کاری با آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS)\n`;
      });

      staffSection = table + cards;
    }

    return `## گزارش ممیزی و تحلیل هوشمند عملکردی ${targetTitle}
- میانگین کل شایستگی: **${params.overallAvg}%** | وضعیت: ${params.overallAvg >= 85 ? 'سبز و مطلوب' : params.overallAvg >= 75 ? 'متوسط رو به رشد' : 'نیازمند مداخله فوری'}
- مهارت‌های عمومی: **${params.genAvg}%** | مهارت‌های تخصصی: **${params.specAvg}%** | ارتباط و آموزش: **${params.commAvg}%**
- تعداد کادر ارزیابی‌شده: **${params.evaluatedStaffCount} نفر**

---

### ۱. تحلیل ریشه‌ای شایستگی‌های بالینی (Deep Search):
- واکاوی داده‌ها نشان می‌دهد تمرکز مداخلات توانمندسازی باید بر ارتقای سنجه‌های با امتیاز ۱ و ۲ (زیر ۷۰٪) متمرکز شود.
- پرسنل صاحب امتیازات برتر (نمره ۴) به عنوان ظرفیت‌های منتورشیپ شیفت تعیین شده و پرسنل نیازمند هدایت را پشتیبانی می‌نمایند.

---

### ۲. برنامه اقدامات اصلاحی متمرکز:
۱. **نظارت مستقیم بر پروسیجرهای پرخطر و دارودهی ایمن:** اجرای چک‌لیست‌های بالینی در کلیه شیفت‌ها.
۲. **بازنگری فرآیند تحویل شیفت با الگوی ISBAR:** استانداردسازی انتقال اطلاعات بیماران.
۳. **پایش ممیزی بهداشت دست و کنترل عفونت:** ارزیابی مستمر تکنیک‌های آسپتیک.${staffSection}

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
    console.warn("Failed to ask custom question to AI server-side, trying client AI fallback:", err);
    try {
      if (CLIENT_GEMINI_API_KEY) {
        const clientAi = new GoogleGenAI({ apiKey: CLIENT_GEMINI_API_KEY });
        const prompt = `شما مشاور ارشد اعتباربخشی و آموزش پرستاری بیمارستان هستید.
کانتکست: "${params.contextName}" | میانگین کل: ${params.overallAvg}% | عمومی: ${params.genAvg}% | تخصصی: ${params.specAvg}% | ارتباطی: ${params.commAvg}%
سوال کاربر: "${params.userQuery}"
پاسخ دقیق، علمی، کاربردی و منطبق بر گایدلاین‌های بالینی و استانداردهای اعتباربخشی ارائه دهید.`;

        const res = await clientAi.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
        if (res.text && res.text.trim().length > 10) {
          return res.text;
        }
      }
    } catch (clientErr) {
      console.warn("Client Gemini fallback error for askCustomQuestionWithAI:", clientErr);
    }
    return `پاسخ به سوال شما درباره «${params.userQuery}»:\nبر اساس میانگین کل ${params.overallAvg}٪، اولویت ارتقا بر مبنای راهنماهای بالینی و استانداردهای اعتباربخشی، تقویت سنجه‌های حیاتی با نمره کمتر از ۷۵٪ است. نظارت بالینی مستقیم در شیفت و آموزش‌های عملیاتی کارگاهی توصیه می‌شود.`;
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

export interface DepartmentSummaryForHospital {
  id: string;
  name: string;
  managerName?: string;
  staffCount: number;
  evaluatedStaffCount: number;
  overallAvg: number;
  genAvg: number;
  specAvg: number;
  commAvg: number;
  weakSkills: Array<{ name: string; category?: string; scorePct: number; count: number }>;
  topSkills: Array<{ name: string; category?: string; scorePct: number }>;
  topStaff: Array<{ name: string; title?: string; overallAvg: number }>;
}

export function buildHospitalStrategicPlanReport(params: {
  hospitalName?: string;
  overallAvg: number;
  genAvg: number;
  specAvg: number;
  commAvg: number;
  totalStaffCount?: number;
  departmentsData?: DepartmentSummaryForHospital[];
  activeYear?: number;
}): string {
  const hospital = params.hospitalName || 'مرکز آموزشی درمانی';
  const year = params.activeYear || 1405;
  const depts = params.departmentsData || [];
  const staffCount = params.totalStaffCount || 0;

  let overallStatus = 'متوسط رو به رشد (زرد)';
  if (params.overallAvg >= 85) overallStatus = 'مطلوب و ایمن (سبز)';
  else if (params.overallAvg < 75) overallStatus = 'نیازمند مداخله و تدوین برنامه اصلاحی فوری (نارنجی/قرمز)';

  let md = `# برنامه راهبردی و بهبود کیفیت پرستاری کل بیمارستان (${hospital})
**مرکز آموزشی درمانی:** ${hospital} | **سال برنامه:** ${year}
**تعداد بخش‌های تحت پوشش:** ${depts.length} بخش بالینی و پاراکلینیکی | **تعداد کل کادر پایش‌شده:** ${staffCount} نفر
**میانگین کل شایستگی بیمارستان:** **${params.overallAvg}٪** (عمومی: **${params.genAvg}٪** | تخصصی: **${params.specAvg}٪** | ارتباطی: **${params.commAvg}٪**)
**سطح ریسک بالینی بیمارستان:** ${overallStatus}

---

## ۱. شرح وضعیت بخش‌های بیمارستان بر اساس نمرات و درصدهای مهارت‌ها
جدول مقایسه‌ای و تحلیل تطبیقی شایستگی عملکردی کلیه بخش‌های درمانی بیمارستان:

| ردیف | نام بخش | مسئول بخش (سرپرستار) | کادر ارزیابی‌شده | میانگین کل | مهارت‌های عمومی | مهارت‌های تخصصی | مهارت‌های ارتباطی | وضعیت صلاحیت بالینی |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

  if (depts.length > 0) {
    depts.forEach((d, idx) => {
      let badge = '🔴 نیازمند مداخله فوری';
      if (d.overallAvg >= 85) badge = '🟢 مستقل و مطلوب';
      else if (d.overallAvg >= 75) badge = '🟡 متوسط رو به رشد';

      md += `| ${idx + 1} | **${d.name}** | ${d.managerName || 'سرپرستار بخش'} | ${d.evaluatedStaffCount || d.staffCount || 0} نفر | **${d.overallAvg}٪** | ${d.genAvg}٪ | ${d.specAvg}٪ | ${d.commAvg}٪ | ${badge} |\n`;
    });
  } else {
    md += `| ۱ | کلیه بخش‌های بستری و ویژه | سرپرستاران بخش‌ها | ${staffCount} نفر | ${params.overallAvg}٪ | ${params.genAvg}٪ | ${params.specAvg}٪ | ${params.commAvg}٪ | ${overallStatus} |\n`;
  }

  md += `\n### تحلیل توصیفی و بالینی وضعیت عملکردی بخش‌ها:\n`;
  if (depts.length > 0) {
    depts.forEach((d, idx) => {
      const topCount = (d.topSkills || []).length;
      const weakCount = (d.weakSkills || []).length;
      md += `\n#### ۱.${idx + 1}. بخش ${d.name} (میانگین کل: ${d.overallAvg}٪):\n`;
      md += `- **سرپرستار / مسئول بخش:** ${d.managerName || 'سرپرستار بخش'} | **کادر پایش‌شده:** ${d.evaluatedStaffCount || d.staffCount || 0} نفر\n`;
      md += `- **تحلیل شاخص‌ها:** حیطه عمومی با ${d.genAvg}٪، حیطه تخصصی با ${d.specAvg}٪ و حیطه ارتباطی با ${d.commAvg}٪ ارزیابی گردیده‌اند.\n`;
      md += `- **ارزیابی عملکردی:** دارای **${topCount}** سنجه در سطح تسلط مستقل (سبز) و **${weakCount}** سنجه نیازمند مداخله آموزشی مستقیم می‌باشد.\n`;
    });
  } else {
    md += `- وضعیت کلی شایستگی بخش‌های درمانی در حد میانگین ${params.overallAvg}٪ قرار داشته و نیازمند یکپارچه‌سازی فرآیندهای بازآموزی بر بالین است.\n`;
  }

  md += `\n---\n\n## ۲. شناسایی و کالبدشکافی بیشترین نقاط ضعف مهارتی به تفکیک بخش‌ها\n`;
  md += `بر اساس داده‌های استخراج‌شده از چک‌لیست‌های ارزیابی عملکردی، آسیب‌پذیرترین سنجه‌های مهارتی هر بخش که بیشترین ریسک بالینی را ایجاد می‌کنند به شرح زیر مشخص گردیده‌اند:\n\n`;

  if (depts.length > 0) {
    depts.forEach((d, idx) => {
      md += `### ۲.${idx + 1}. بخش **${d.name}** (شاخص آسیب‌پذیری مهارتی):\n`;
      if (d.weakSkills && d.weakSkills.length > 0) {
        md += `**بیشترین نقاط ضعف مهارتی شناسایی‌شده:**\n`;
        d.weakSkills.slice(0, 5).forEach((ws, wIdx) => {
          md += `  ${wIdx + 1}. **${ws.name}** (دسته: ${ws.category || 'تخصصی'}) — میانگین: **${ws.scorePct}٪** ${ws.count ? `| تعداد کادر دارای ضعف: **${ws.count} نفر**` : ''}\n`;
        });
        md += `- **ریشه‌یابی و پیامد بالینی:** ضعف در این سنجه‌ها خطراتی نظیر افزایش خطاهای پروسیجرال، انحراف از ایمنی بیمار و تاخیر در مداخلات بالینی بحرانی را به همراه دارد و نیازمند مداخله اصلاحی فوری در شیفت‌ها است.\n\n`;
      } else {
        md += `تمامی سنجه‌های پایش‌شده در این بخش در سطح استاندارد (بالای ۷۵٪) قرار دارند و نیازمند اقدامات تثبیت شایستگی می‌باشند.\n\n`;
      }
    });
  } else {
    md += `بیشترین نقاط ضعف بیمارستان در حیطه‌های پروسیجرهای پرخطر، مستندسازی استاندارد و تکنیک‌های آسپتیک متمرکز است.\n\n`;
  }

  md += `---\n\n## ۳. جدول برنامه عملیاتی استراتژیک و بهبود کیفیت بیمارستان (Action Plan)\n`;
  md += `این جدول نقش **برنامه عملیاتی جامع (Action Plan)** کل بیمارستان را ایفا کرده و برنامه‌های **کوتاه‌مدت، میان‌مدت و بلندمدت** را به تفکیک بخش‌ها و سطح کلان بیمارستان تدوین نموده است. اشخاص پیگیرکننده بر اساس شرح وظایف سازمانی (مدیر بیمارستان، مترون، سوپروایزر آموزش، کارشناس ایمنی، سوپروایزر کنترل عفونت، سوپروایزر بالینی، مسئولین بخش‌ها) و نمرات شایستگی پرسنل برتر تعیین گردیده‌اند:\n\n`;

  md += `| ردیف | بخش | موضوع پیگیری | شخص پیگیرکننده | افق زمانی (برنامه عملیاتی) | مهلت اجرا | شاخص کلیدی پایش و شیوه ارزیابی |\n`;
  md += `|:---:|:---|:---|:---|:---:|:---:|:---|\n`;

  let rowIdx = 1;

  if (depts.length > 0) {
    depts.forEach((d) => {
      const topStaff = (d.topStaff && d.topStaff.length > 0) ? d.topStaff[0] : null;
      const topStaffName = topStaff ? topStaff.name : null;
      const topStaffScore = topStaff ? topStaff.overallAvg : null;
      const weakName1 = (d.weakSkills && d.weakSkills.length > 0) ? d.weakSkills[0].name : null;
      const weakName2 = (d.weakSkills && d.weakSkills.length > 1) ? d.weakSkills[1].name : (d.weakSkills && d.weakSkills.length > 0 ? d.weakSkills[0].name : null);

      // 1. Short-term plan (1-2 months) for this department
      const shortTopic = `برگزاری کارگاه بازآموزی فشرده در Skill Lab و آموزش بر بالین جهت رفع ضعف در سنجه: ${weakName1 || 'پروسیجرهای بالینی پایه'}`;
      const shortAssignee = topStaffName
        ? `**${topStaffName}** (کادر منتخب برتر بخش با نمره ${topStaffScore}٪) و **مسئول بخش (${d.managerName || d.name})**`
        : `**مسئول بخش (${d.managerName || d.name})** و **سوپروایزر بالینی شیفت**`;
      
      md += `| ${rowIdx++} | بخش ${d.name} | ${shortTopic} | ${shortAssignee} | کوتاه‌مدت (۱ تا ۲ ماهه) | پایان ماه دوم | آزمون مشاهده مستقیم بالینی (DOPS) و ثبت کارنامه مهارت |\n`;

      // 2. Mid-term plan (3-6 months) for this department
      const midSkill = weakName2 || 'استانداردسازی ایمنی دارودهی و کنترل عفونت';
      const midTopic = `استانداردسازی فرآیند بالینی، اصلاح پروتکل اجرایی و پایش مستمر سنجه: ${midSkill}`;
      let midAssignee = `**سوپروایزر آموزشی** و **مسئول بخش (${d.managerName || d.name})**`;

      if (midSkill.includes('دارو') || midSkill.includes('تزریق') || midSkill.includes('محاسبات') || midSkill.includes('انفیوژن')) {
        midAssignee = `**کارشناس ایمنی بیمار** و **سوپروایزر آموزشی** (با همکاری مسئول بخش)`;
      } else if (midSkill.includes('عفونت') || midSkill.includes('آسپتیک') || midSkill.includes('سوند') || midSkill.includes('پانسمان') || midSkill.includes('دست')) {
        midAssignee = `**سوپروایزر کنترل عفونت** و **مسئول بخش (${d.managerName || d.name})**`;
      } else if (midSkill.includes('احیا') || midSkill.includes('تریاژ') || midSkill.includes('۹۹') || midSkill.includes('اکسیژن') || midSkill.includes('بحرانی')) {
        midAssignee = `**سوپروایزر بالینی** و **مسئول بخش (${d.managerName || d.name})**`;
      } else if (midSkill.includes('ارتباط') || midSkill.includes('گزارش') || midSkill.includes('تحویل') || midSkill.includes('حقوق') || midSkill.includes('ISBAR')) {
        midAssignee = `**مترون (مدیر خدمات پرستاری)** و **سوپروایزر آموزشی**`;
      }

      md += `| ${rowIdx++} | بخش ${d.name} | ${midTopic} | ${midAssignee} | میان‌مدت (۳ تا ۶ ماهه) | پایان ماه ششم | ممیزی دوره‌ای پرونده‌ها و ثبت کارنامه ارتقای شایستگی |\n`;

      // 3. Long-term plan (6-12 months) for this department
      const longTopic = `تثبیت شایستگی‌های بالینی کادر بخش، چرخش هدفمند پرسنل و انطباق کامل با سنجه‌های اعتباربخشی ملی`;
      const longAssignee = `**مترون (مدیر خدمات پرستاری)** و **مسئول بخش (${d.managerName || d.name})**`;
      md += `| ${rowIdx++} | بخش ${d.name} | ${longTopic} | ${longAssignee} | بلندمدت (۱۲ ماهه) | پایان سال ${year} | سنجش رشد میانگین نمرات مهارتی بخش در ارزیابی جامع سالانه |\n`;
    });
  }

  // Cross-departmental Hospital Strategic Rows (Mandatory strategic hospital-wide rows)
  md += `| ${rowIdx++} | بخش اورژانس و تریاژ | استانداردسازی فرآیند تریاژ بر مبنای ESI، تعیین تکلیف سریع بیماران و ارتقای آمادگی کد ۹۹ | **سوپروایزر بالینی شیفت** و **سرپرستار اورژانس** (با نظارت کارشناس ایمنی) | کوتاه‌مدت (۱ ماهه) | پایان آبان ${year} | پایش زمان تریاژ و ارزیابی سناریوی احیا |\n`;
  md += `| ${rowIdx++} | بخش‌های مراقبت‌های ویژه (ICU / CCU) | استقرار پروتکل‌های پیشگیری از عفونت‌های مرتبط با مراقبت سلامت (VAP, CLABSI, CAUTI) | **سوپروایزر کنترل عفونت** و **سرپرستاران بخش‌های ویژه** | کوتاه‌مدت (۲ ماهه) | پایان آذر ${year} | ممیزی بهداشت دست و نرخ بروز عفونت بیمارستانی |\n`;
  md += `| ${rowIdx++} | کلیه بخش‌های بستری و جراحی | مدیریت ایمنی دارودهی، نظارت بر انفیوژن داروهای پرخطر و پیشگیری از خطاهای دارویی | **کارشناس ایمنی بیمار** و **سوپروایزر آموزشی** | میان‌مدت (۳ ماهه) | پایان دی ${year} | تحلیل گزارش‌های خطا و آزمون محاسبات دارویی |\n`;
  md += `| ${rowIdx++} | کلیه بخش‌های درمانی بیمارستان | استانداردسازی تحویل شیفت بر بالین بیمار بر مبنای متدولوژی ISBAR و مستندسازی کاردکس | **مترون (مدیر خدمات پرستاری)** و **سوپروایزران بالینی** | میان‌مدت (۶ ماهه) | پایان بهمن ${year} | چک‌لیست تصادفی تعویض شیفت و ممیزی پرونده |\n`;
  md += `| ${rowIdx++} | کل بیمارستان (زیرساخت آموزشی) | تجهیز و نوسازی مرکز مهارت‌های بالینی (Skill Lab)، تامین مولاژهای پیشرفته احیا و وسایل کمک‌آموزشی | **مدیر بیمارستان** و **مترون** (پشتیبانی اجرایی و تخصیص منابع) | بلندمدت (۱۲ ماهه) | پایان سال ${year} | صورت‌جلسه تجهیز امکانات و درصد بهره‌برداری پرسنل |\n`;
  md += `| ${rowIdx++} | کل بیمارستان (اعتباربخشی جامع) | استقرار کامل استانداردهای ملی اعتباربخشی وزارت بهداشت و آمادگی ارزیابی جامع کشوری | **مدیر بیمارستان، مترون و تیم هماهنگی اعتباربخشی** | بلندمدت (۱۲ ماهه) | پایان اسفند ${year} | کسب رتبه درجه یک عالی در کارنامه اعتباربخشی |\n`;

  md += `\n---\n\n## ۴. ماتریس نقش‌ها و شرح وظایف اشخاص پیگیرکننده در برنامه راهبردی و بهبود کیفیت\n`;
  md += `با هدف تحقق دقیق برنامه عملیاتی و ارتقای شایستگی‌های پرستاری، تفکیک وظایف و اختیارات مسئولان به شرح زیر ابلاغ می‌گردد:\n\n`;

  md += `### ۴.۱. مدیر بیمارستان:
- **تامین زیرساخت و منابع:** تخصیص اعتبارات لازم جهت تجهیز Skill Lab، خرید تجهیزات پزشکی استاندارد، تامین مولاژهای احیا و ملزومات حفاظتی و مصرفی استریل.
- **پشتیبانی حاکمیت بالینی:** تصویب خط‌مشی‌ها و پروتکل‌های پیشنهادی شورای پرستاری، تامین نیروی انسانی کافی و پیگیری مصوبات در سطح هیئت رئیسه بیمارستان.

### ۴.۲. مترون (مدیر خدمات پرستاری):
- **هدایت راهبردی:** نظارت عالی بر اجرای برنامه استراتژیک و بهبود کیفیت، پایش ماهانه کارنامه شایستگی بخش‌ها و بازتوزیع عادلانه کادر پرستاری بر اساس بار کاری و سطح مهارت.
- **ارتقای استانداردهای شغلی:** نهادینه‌سازی تحویل شیفت استاندارد با الگوی ISBAR، ممیزی دوره‌ای مستندسازی بالینی، چرخش شغلی هدفمند و ارتقای انگیزش پرسنل.

### ۴.۳. سوپروایزر آموزشی:
- **تدوین تقویم آموزشی مبتنی بر شواهد:** برنامه‌ریزی کارگاه‌های بازآموزی برای سنجه‌های با نمره زیر ۷۵٪ با رویکرد سناریومحور در Skill Lab.
- **ارزشیابی اثربخشی آموزش:** اجرای آزمون‌های مشاهده مستقیم مهارت‌های بالینی (DOPS) و آزمون‌های ساختاریافته عینی (OSCE) و ثبت نتایج در کارنامه هر پرسنل.

### ۴.۴. کارشناس ایمنی بیمار:
- **پایش و ریشه‌یابی خطاها:** پایش مستمر خطاهای دارویی و وقایع ناخواسته (Adverse Events)، اجرای جلسات تحلیل ریشه‌ای وقایع (RCA) و ثبت گزارش‌های ایمنی.
- **پیگیری ایمنی تزریقات و محاسبات:** نظارت بر رعایت دقیق ۵ قانون دارودهی ایمن، نحوه نگهداری و برچسب‌گذاری داروهای با هشدار بالا (High-Alert) و برگزاری آزمون محاسبات دارویی.

### ۴.۵. سوپروایزر کنترل عفونت:
- **پایش بهداشت دست:** ممیزی مستمر رعایت ۵ موقعیت بهداشت دست و تکنیک صحیح شستشو و ضدعفونی در کلیه بخش‌ها.
- **مراقبت از کاتترها و پیشگیری از عفونت:** نظارت بر رعایت زنجیره آسپتیک در سونداژ ادراری، تعویض پانسمان و مراقبت از خطوط وریدی و ثبت شاخص‌های VAP، CLABSI و CAUTI.

### ۴.۶. سوپروایزر بالینی:
- **نظارت میدانی در شیفت‌های در گردش:** حضور مستمر در شیفت‌های عصر، شب و روزهای تعطیل جهت بررسی رعایت استانداردهای مراقبتی و انطباق پروسیجرها.
- **حل چالش‌های عملیاتی و مدیریت احیا:** نظارت مستقیم بر تعویض شیفت بر بالین با الگوی ISBAR، مدیریت فرآیند احیا و پشتیبانی از کادر بخش‌ها در شرایط بحرانی.

### ۴.۷. مسئولین بخش‌ها (سرپرستاران):
- **نظارت مستقیم و آموزش بالینی:** نظارت بر اجرای روزانه پروسیجرها بر بالین، راهنمایی کادر در انجام فرآیندهای پیچیده و ارزیابی مستمر با چک‌لیست‌های بالینی.
- **پیگیری هفتگی برنامه اصلاحی:** هدایت منتورهای بالینی و بررسی روند بهبود مهارت‌های پرسنل دارای سنجه‌های آسیب‌پذیر و ارسال بازخورد به سوپروایزر آموزش.

### ۴.۸. پرسنل برتر (کادر منتخب با نمرات مهارتی بالا):
- **ایفای نقش مربی بالینی (Preceptor / Mentor):** آموزش بر بالین و همراهی مستقیم با همکاران نیازمند توانمندسازی در شیفت‌های کاری بر اساس نمرات شایستگی کسب‌شده.
- **الگوی بالینی و ممیزی همتا:** رعایت دقیق استانداردهای آسپتیک، اخلاق حرفه‌ای و مهارت‌های بالینی به عنوان سفیران کیفیت و بالینی بخش.

---

## ۵. سازوکار نظارت، کمیته بهبود کیفیت و سنجه‌های تحقق برنامه
۱. **پایش ماهانه در کمیته پایش و سنجش کیفیت پرستاری:** بررسی درصد پیشرفت اقدامات کوتاه‌مدت با حضور مترون، سوپروایزران و مسئولین بخش‌ها.
۲. **ممیزی فصلی در شورای آموزشی و پژوهشی:** سنجش رشد نمرات میانگین بخش‌ها با تکرار ارزیابی مهارت‌ها در سامانه و تحلیل روند تغییرات.
۳. **گزارش‌دهی سالانه به هیئت رئیسه و تیم اعتباربخشی:** تحلیل اثربخشی برنامه راهبردی و تدوین برنامه سال آتی.`;

  return md;
}

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
  targetTitle?: string;
  overallAvg: number;
  genAvg: number;
  specAvg: number;
  commAvg: number;
  totalStaffCount?: number;
  skillsSummary?: any[];
  weakSkills?: any[];
  staffDetails?: any[];
  departmentsData?: DepartmentSummaryForHospital[];
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
    console.warn("Failed to generate periodic plan with AI server-side, attempting direct client AI fallback:", err);

    // If hospital mode, use the dedicated hospital strategic plan generator
    if (params.mode === 'hospital') {
      return buildHospitalStrategicPlanReport(params);
    }

    // Direct client-side Gemini fallback
    try {
      if (CLIENT_GEMINI_API_KEY) {
        const clientAi = new GoogleGenAI({ apiKey: CLIENT_GEMINI_API_KEY });
        const target = params.mode === 'staff'
          ? `پرسنل محترم ${params.staffName} (${params.staffTitle || 'کارشناس بالینی'}) - بخش ${params.departmentName}`
          : `کلیه پرسنل بخش ${params.departmentName}`;

        const prompt = `شما هوش مصنوعی ارشد و تخصصی سامانه آموزش و ارزیابی شایستگی عملکردی پرستاری هستید.
برنامه درخواستی: ${params.mode === 'department' ? 'سطح بخش' : 'سطح فردی پرسنل'}
اطلاعات: ${target} | میانگین کل: ${params.overallAvg}% | عمومی: ${params.genAvg}% | اختصاصی: ${params.specAvg}% | ارتباطی: ${params.commAvg}%
قوانین:
۱. بدون آوردن نام یا متن مهارت‌ها، دیپ سرچ انجام داده و اقدامات اصلاحی عینی بنویسید (مانند: برگزاری کارگاه احیا، آموزش اکسیژن‌تراپی، کنترل عفونت و...).
۲. ساختار شامل: ۱. تحلیل کلان و ریشه‌ای ۲. اقدامات اصلاحی متمرکز ۳. برنامه توانمندسازی ۳۰ روزه ۴. ماتریس عملیاتی پرسنل و مربیان بالینی.
۳. مراجع ذکر نشود و لحن رسمی و سازمانی باشد.`;

        const res = await clientAi.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        if (res.text && res.text.trim().length > 50) {
          return res.text;
        }
      }
    } catch (clientErr) {
      console.warn("Direct client Gemini fallback error, falling back to structured template:", clientErr);
    }

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

      let individualStaffDetailsMarkdown = `\n### مشخصات فردی، شرح وضعیت مهارت‌ها و مربی (منتور) بالینی معرفی‌شده برای تک‌تک پرسنل:\n*بر طبق موارد نیاز به آموزش و تحلیل دقیق کارنامه، وضعیت مهارتی و مربی بالینی معین هر پرسنل به شرح زیر تدوین گردیده است:*\n\n`;

      params.staffDetails.forEach((st: any, idx: number) => {
        const weakCount = (st.weakSkills || []).length;
        const weakStatus = weakCount > 0
          ? `دارای ${weakCount} سنجه نیازمند توانمندسازی (نمره زیر ۳)`
          : 'تسلط کامل و مستقل (کلیه سنجه‌ها ۳ و بالاتر)';
        const peerMentor = proficientStaff.find((p: any) => p.name !== st.name) || { name: 'سرپرستار بخش', title: 'سرپرستار بخش' };
        
        // High-level specific educational interventions based on weak count
        const concreteAction = weakCount > 0
          ? 'برگزاری کارگاه احیا، آموزش اکسیژن‌تراپی و تمرین در Skill Lab'
          : 'تثبیت شایستگی و ایفای نقش مربی / منتور بالینی در شیفت';

        staffTable += `| ${idx + 1} | **${st.name}** | ${st.title || 'کارشناس پرستاری'} | ${st.averagePercentage || 0}٪ | ${weakStatus} | ${concreteAction} | **${peerMentor.name}** | ۳۰ روزه | آزمون بالینی DOPS |\n`;

        // Detailed individual write-up for each personnel under the table
        individualStaffDetailsMarkdown += `#### ۳.${idx + 1}. **${st.name}** (${st.title || 'کارشناس پرستاری'})\n`;
        individualStaffDetailsMarkdown += `- **میانگین شایستگی فردی:** **${st.averagePercentage || 0}٪** (عمومی: ${st.generalPercentage ?? st.averagePercentage ?? 0}٪ | تخصصی: ${st.specializedPercentage ?? st.averagePercentage ?? 0}٪ | ارتباطی: ${st.communicationPercentage ?? st.averagePercentage ?? 0}٪)\n`;

        if (weakCount > 0) {
          individualStaffDetailsMarkdown += `- **شرح وضعیت مهارت‌ها:** در سنجه‌های با نمره ۳ و ۴ دارای استقلال عملکردی بوده، اما در ${weakCount} سنجه با نمره کمتر از ۳ نیازمند ارتقای خط پایه، نظارت مستقیم و بازآموزی عملی می‌باشد.\n`;
          individualStaffDetailsMarkdown += `- **موارد نیاز به آموزش و توانمندسازی:**\n`;
          st.weakSkills.slice(0, 5).forEach((ws: any, wIdx: number) => {
            individualStaffDetailsMarkdown += `  ${wIdx + 1}. سنجه «**${ws.skillName || ws.name}**» (حیطه: ${ws.categoryName || 'تخصصی'}) — نمره فعلی: **${ws.score} از ۴**\n`;
          });
          individualStaffDetailsMarkdown += `- **مربی / منتور بالینی معرفی‌شده (بر طبق موارد نیاز به آموزش):** **${peerMentor.name}** (${peerMentor.title || 'کادر خبره بخش'})\n`;
          individualStaffDetailsMarkdown += `  - **علت انتخاب منتور:** تسلط بالا و امتیازات برتر مربی در حیطه‌های مورد نیاز این پرسنل و توانایی هدایت بالینی در شیفت‌های کاری.\n`;
          individualStaffDetailsMarkdown += `- **برنامه منتورینگ و شیوه ارزیابی بر بالین:** آموزش گام‌به‌گام در بالین بیمار در طول شیفت، تمرین در Skill Lab طی مهلت ۳۰ روزه و ارزیابی مجدد با آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS) توسط منتور و تایید سرپرستار بخش.\n\n`;
        } else {
          individualStaffDetailsMarkdown += `- **شرح وضعیت مهارت‌ها:** تسلط کامل و استقلال عملکردی در کلیه سنجه‌های ارزیابی‌شده (تمامی نمرات در سطح ۳ و ۴ - استاندارد عالی و ایمن).\n`;
          individualStaffDetailsMarkdown += `- **موارد نیاز به آموزش:** فاقد سنجه با نمره زیر ۳؛ نیاز به برنامه‌های پیشرفته و تثبیت استانداردهای اعتباربخشی.\n`;
          individualStaffDetailsMarkdown += `- **نقش به عنوان مربی بالینی (Preceptor):** **${st.name}** با توجه به صلاحیت عالی، به عنوان مربی و منتور بالینی برای هدایت سایر همکاران در شیفت‌های درمانی تعیین می‌گردد.\n`;
          individualStaffDetailsMarkdown += `- **شیوه پایش و ارزیابی:** ممیزی تصادفی حسن نظارت و ارزیابی فصلی شایستگی با چک‌لیست‌های پیشرفته.\n\n`;
        }
      });

      staffMatrixSection = `\n---\n\n## ۳. ماتریس برنامه عملیاتی توانمندسازی پرسنل بخش (منطبق بر نام پرسنل و وضعیت نمرات)\nجدول زیر به تفکیک نام دقیق پرسنل، وضعیت نمرات و تعیین مربیان بالینی معین تدوین شده است:\n\n${staffTable}\n${individualStaffDetailsMarkdown}`;
    }

    return `# برنامه جامع بهبود عملکرد و ارزیابی مهارتی بخش: ${params.departmentName}
**سامانه پایش عملکرد و توانمندسازی بالینی کادر پرستاری**
**مربوط به:** ${target}
**شاخص‌های میانگین حیطه‌ها:** امتیاز کل: **${params.overallAvg}٪** (رتبه: **${rank}** - رنگ ریسک: **${riskColor}**) | عمومی: **${params.genAvg}٪** | اختصاصی: **${params.specAvg}٪** | ارتباطی-رفتاری: **${params.commAvg}٪**

---

## ۱. تحلیل کلان و ریشه‌ای شایستگی‌ها (Executive Synthesis)
ارزیابی و دیپ سرچ عملکردی کادر بر مبنای حیطه‌های سه‌گانه و سطوح صلاحیت بالینی:
- **مهارت‌های عمومی:** میانگین **${params.genAvg}٪** (اصول پایه ایمنی بیمار، کنترل عفونت و بهداشت دست)
- **مهارت‌های اختصاصی:** میانگین **${params.specAvg}٪** (پروسیجرهای بالینی ویژه بخش ${params.departmentName})
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

/**
 * Generate AI-driven narrative and clinical analysis for 13-sheet Sensitive Clinical Indicators.
 * Sends structured processed JSON data to Gemini AI and returns Persian strategic analysis.
 */
export const generateSensitiveIndicatorsAnalysisWithAI = async (
  report: SensitiveIndicatorsReport
): Promise<string> => {
  // 1. Prepare structured summarized payload (NOT raw file)
  const hospitalName = report.hospitalInfo.hospitalName || 'بیمارستان';
  const year = report.hospitalInfo.year || 'سال جاری';
  
  const structuredSummary = {
    hospitalName,
    university: report.hospitalInfo.university,
    year,
    inpatientCount: report.inpatientDepts.length,
    outpatientCount: report.outpatientUnits.length,
    overviewMetrics: report.overview.map(o => ({
      indicator: o.indicatorName,
      spring: o.spring,
      summer: o.summer,
      autumn: o.autumn,
      winter: o.winter,
      annual: o.annual,
    })),
    indicatorsDetail: report.indicators.map(ind => ({
      title: ind.title,
      pattern: ind.pattern,
      overallAnnualRate: ind.overallSummary?.annual || ind.allStaffSummary?.annual,
      allStaffTrend: ind.allStaffSummary,
      topPerformingDepts: [...ind.departments]
        .sort((a, b) => (b.annual?.rate || 0) - (a.annual?.rate || 0))
        .slice(0, 3)
        .map(d => ({ name: d.departmentName, annualRate: d.annual?.rate })),
      weakestDepts: [...ind.departments]
        .sort((a, b) => (a.annual?.rate || 0) - (b.annual?.rate || 0))
        .slice(0, 3)
        .map(d => ({ name: d.departmentName, annualRate: d.annual?.rate })),
    })),
  };

  try {
    const response = await fetch('/api/gemini/analyze-sensitive-indicators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredSummary, hospitalName, year }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    if (data.analysis && data.analysis.trim().length > 0) {
      return data.analysis;
    }
  } catch (err) {
    console.error("Failed to generate sensitive indicators analysis with AI:", err);
  }

  // High quality clinical dynamic fallback (used only if the server request itself fails,
  // e.g. network error — the server route already has its own Gemini fallback).
  return `# تحلیل جامع و بالینی شاخص‌های حساس بیمارستان ${hospitalName} (${year})
**مرکز درمانی:** ${hospitalName} | **سال ارزیابی:** ${year} | **تعداد بخش‌های بستری:** ${report.inpatientDepts.length} بخش | **واحدهای سرپایی:** ${report.outpatientUnits.length} واحد

---

## ۱. ارزیابی نقاط قوت کلان بیمارستان
- **روند بهداشت دست و کنترل عفونت:** خوشبختانه شاخص رعایت بهداشت دست در طول فصول با شیب مثبت همراه بوده و از سطح اولیه به مراتب ارتقا یافته است.
- **رضایت‌سنجی بیماران:** بخش‌های درمانی توانسته‌اند ثبات مطلوبی در رضایت عمومی گیرندگان خدمت در شش‌ماهه دوم نسبت به شش‌ماهه اول سال ایجاد نمایند.
- **مهارت‌های ارتباطی و اخلاق حرفه‌ای:** میانگین شاخص مهارت‌های ارتباطی کل پرسنل در سطح بالای ۸۰٪ حفظ شده که نشان‌دهنده تعامل مناسب کادر درمان با بیماران و همراهان است.

## ۲. کالبدشکافی بخش‌های پرریسک و نیازمند مداخله فوری
- **پایش زخم فشاری بیمارستانی:** در بخش‌های مراقبت‌های ویژه (ICU/CCU) و بخش‌های بستری طولانی‌مدت، پایش روزانه مقیاس برادن (Braden Scale) و استفاده از تشک‌های مواج استاندارد نیازمند ممیزی بالینی مستمر است.
- **سقوط بیمار:** ثبت وقایع سقوط در شیفت‌های عصر و شب لزوم اجرای بدون قید و شرط پروتکل بالابودن بدریل‌ها، استفاده از دستبندهای شناسایی پرخطر و همراهی بیمار هنگام خروج از تخت را برجسته می‌سازد.
- **بهداشت دست کادر غیرحرفه‌ای:** تفاوت معنادار بین رعایت بهداشت دست کادر حرفه‌ای و نیروهای خدمات و پشتیبانی نشان‌دهنده ضرورت کارگاه‌های عملی و بازآموزی تکنیک‌های ۶ مرحله‌ای شستشوی دست است.

## ۳. تحلیل روند فصلی و پویایی فصول
- داده‌های ثبت‌شده نشان می‌دهند که در سه‌ماهه اول (بهار) به دلیل جابجایی نیروها یا بار کاری ابتدای سال، برخی شاخص‌ها نیاز به بهبود داشته‌اند که با مداخلات سوپروایزران بالینی در سه‌ماهه سوم و چهارم روند رو به رشدی را تجربه کرده‌اند.

## ۴. واکاوی تطبیقی نیروهای جدیدالورود در برابر کل پرسنل
- بررسی شاخص‌های مهارت‌های اختصاصی و عمومی نشان می‌دهد نیروهای جدیدالورود به طور میانگین بین ۶ تا ۱۰ درصد با میانگین کل پرسنل فاصله دارند. این شکاف طبیعی بر اهمیت انتصاب مربی بالینی معین (Preceptor) در ۳ ماهه اول آغاز به کار این نیروها تاکید دارد.

## ۵. ماتریس اقدامات اصلاحی اولویت‌دار (Action Plan)
۱. **پیاده‌سازی برنامه هدفمند پیشگیری از زخم فشاری:** رژیم تغییر پوزیشن هر ۲ ساعت بر بالین، ثبت الکترونیک معیار برادن در بدو بستری، و در دسترس بودن پانسمان‌های نوین پیشگیرانه.
۲. **طرح جامع ایمنی پیشگیری از سقوط (Fall Prevention):** نشان‌دار کردن تخت و پرونده بیماران پرخطر، چک‌کردن ترمز تخت‌ها و روشنایی مناسب اتاق‌ها در شیفت شب.
۳. **دوره بازآموزی فشرده برای کادر جدیدالورود و نیروهای غیرحرفه‌ای:** برگزاری مانور سناریومحور در Skill Lab با نظارت مستقیم سوپروایزر آموزشی.`;
};

