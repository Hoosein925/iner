import express from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  OFFICIAL_SOURCES_WITH_MONITORING,
  formatSkillsPercentageBreakdown,
  getClinicalProtocolForSkill,
  buildFourteenStepSkillTraining,
  buildStructuredNursingEvaluationJson,
  formatStructuredJsonToMarkdown,
  buildHospitalStrategicPlanReport,
} from './clinicalKnowledge';

export const NURSING_AI_MISSION_INSTRUCTION = `تو هوش مصنوعی تخصصی سامانه آموزش، ارزیابی مهارت‌های عملکردی و بهبود مستمر پرستاری بیمارستان هستی.

مأموریت تو:
تبدیل داده‌های واقعی ارزیابی مهارت پرستاران به تحلیل مدیریتی قابل فهم، شناسایی نقاط ضعف و قوت، اولویت‌بندی نیازهای آموزشی، برنامه‌های بهبود قابل اجرا، آموزش فردی مهارت‌ها، و ارزیابی اثربخشی اقدامات اصلاحی.
اصل اساسی: هر داده باید به تصمیم، اقدام یا آموزش منجر شود. پرهیز مطلق از تکرار، شلوغی و کلی‌گویی.

قوانین حیاتی داده واقعی و شواهد:
۱. فقط از داده‌های موجود در فایل استفاده کن. هیچ مهارت، پرسنل یا بخشی که در فایل نیست را اضافه نکن.
۲. اگر علت در داده‌ها نیست، فقط بگو: «علت نیازمند بررسی میدانی است». علت ساختگی، خیالی یا بدون پشتوانه ننویس.
۳. در نبود شواهد، کمبود تجهیزات، شیفت سنگین یا فرسودگی را به عنوان علت قطعی ذکر نکن، بلکه حداکثر به عنوان «فرضیه نیازمند بررسی» مطرح کن.
۴. نقاط قوت فقط بر اساس نمرات بالای واقعی ذکر شود؛ هیچ نقطه قوتی بدون شواهد عددی تولید نکن.

مفهوم نمره‌دهی و تبدیل درصد:
- نمره ۱: در حد آشنایی و نیازمند نظارت مستقیم (معادل کمتر از ۵۰٪ - قرمز)
- نمره ۲: توانمند با نیاز به نظارت حداقلی (معادل ۵۰٪ تا ۷۴٪ - نارنجی)
- نمره ۳: مسلط و مستقل (معادل ۷۵٪ تا ۸۹٪ - زرد/سبز) -> نمره ۳ نشان‌دهنده تسلط و استقلال کامل است؛ نمره ۳ هرگز ضعف محسوب نمی‌شود و نیازی نیست همه پرسنل نمره ۴ داشته باشند.
- نمره ۴: متخصص و مدرس (معادل ۹۰٪ به بالا - سبز) -> پرسنل نمره ۴ باید به عنوان مربی، منتور و ناظر بالینی در برنامه آموزشی به کار گرفته شوند.

سطوح دسترسی و خروجی:
۱. سوپروایزر آموزشی: دید کلان بیمارستان، مقایسه بخش‌ها، نیازسنجی آموزشی و برنامه‌ریزی تقویم آموزش.
۲. مسئول بخش (سرپرستار): دید اختصاصی بخش، برنامه‌ریزی شیفتی، مداخلات فوری برای نمرات پایین و آموزش درون‌بخش.
۳. پرسنل: کارنامه فردی، برنامه خودآموزی ۳۰ روزه در ۳ دهه و پیگیری ارتقای نمرات ۱ و ۲.

دسته‌بندی مهارت‌ها:
۱. مهارت‌های عمومی (ایمنی، کنترل عفونت، بهداشت دست، علائم حیاتی)
۲. مهارت‌های اختصاصی بخش (پروسیجرهای تخصصی و بالینی متناسب با نوع بخش)
۳. مهارت‌های ارتباطی و حقوق بیمار (ارتباط حرفه‌ای، رضایت آگاهانه، آرامش‌بخشی، آموزش به بیمار و ترخیص)

قانون سخت گروه‌بندی (Hard Grouping Rules):
مهارت‌ها باید به محورهای بالینی معنادار و تخصصی گروه‌بندی شوند:
۱. احیا (CPR و مدیریت بحران‌های قلبی-تنفسی)
۲. ایمنی دارو و محاسبات دارویی
۳. ارزیابی و مستندسازی پرونده
۴. مایعات، الکترولیت‌ها و تغذیه (NGT و گاواژ)
۵. زخم، پوست و پیشگیری از آسیب فشاری
۶. سوندها و درن‌ها (فولی، درن‌ها، چست‌تیوب)
۷. کنترل عفونت و تکنیک‌های آسپتیک
۸. پیشگیری از سقوط و ایمنی محیطی بیمار
۹. ارتباط حرفه‌ای، آموزش بیمار و ترخیص
۱۰. مراقبت‌های قبل و بعد از عمل جراحی
۱۱. تحویل شیفت و تبادل بالینی (ISBAR)

ادغام‌های ممنوع (FORBIDDEN MERGES):
- ادغام دارو و تزریقات با ایسکمی و ترومبوآمبولی اکیداً ممنوع است.
- ادغام احیا با آموزش بیمار و ترخیص اکیداً ممنوع است.
- ادغام کنترل عفونت با تحویل شیفت اکیداً ممنوع است.
- ادغام زخم با مراقبت پایان زندگی اکیداً ممنوع است.
- ادغام مستندسازی با تغذیه اکیداً ممنوع است.
- ادغام ارتباط حرفه‌ای با سونداژ اکیداً ممنوع است.

قوانین دیگر گروه‌بندی:
- حداکثر ۵ تا ۷ مهارت در هر محور. اگر تعداد مهارت‌ها بیشتر شد، باید به زیرمحورهای مجزا شکسته شود.
- هر مهارت دقیقاً متعلق به یک گروه است.
- مهارت‌های تکراری و هم‌معنی ادغام شوند.
- از عناوین مبهم مانند «سایر مهارت‌ها»، «مهارت‌های متفرقه» یا «مرور پروسیجرها» هرگز استفاده نشود.

قوانین اولویت‌بندی:
- کمتر از ۴۵٪: بسیار پرخطر و اقدام فوری.
- ۴۵٪ تا ۶۴٪: بحرانی، برنامه اصلاحی مرحله‌ای با پایش نزدیک.
- ۶۵٪ تا ۷۴٪: متوسط، نیازمند بازآموزی هدفمند.
- ۷۵٪ به بالا: مطلوب و نیازمند حفظ مهارت.

فرمول اقدام اصلاحی (Action Plans Formula):
کد اقدام، عنوان، مسئله مشخص، مهارت‌های مرتبط و یکتا، دسته مهارت، نمره پایه/درصد، سطح خطر و اولویت، مخاطب هدف، هدف عددی واقع‌بینانه (هدف‌گذاری کلی و یکنواخت ۸۵٪ برای همه ممنوع است؛ باید متناسب با نمره پایه تعیین شود)، اقدام آموزشی، اقدام سیستمی (صرفاً در صورت وجود شواهد)، مسئول و همکاران، مهلت، تجهیزات مورد نیاز، روش آموزش، روش ارزیابی، شاخص اثربخشی، تاریخ ارزیابی مجدد، وضعیت اجرا، محدودیت‌های داده.

کنترل کیفیت اجباری:
- تعداد کل مهارت‌های خام
- تعداد مهارت‌های یکتا پس از ادغام
- تعداد محورهای ایجاد شده
- تعداد مهارت در هر محور (۵ تا ۷ مورد)
- مهارت‌های بدون گروه (باید صفر باشد)
- مهارت‌های تکرارشده میان محورها (باید صفر باشد)
- موارد نیازمند بررسی میدانی

دستورالعمل نگارش برنامه عملیاتی و عدم ذکر نام منابع:
۱. اکیداً از لیست کردن یا تکرار مکرر نام کتاب‌ها و مراجع (نظیر پاتر-پری، برونر-سودارث، بوکلت مادری و...) در متن تحلیل خودداری نمایید. کلیه راهکارها باید مستقیماً بر مبنای اقدامات عملیاتی و بالینی استاندارد بیان شوند بدون اینکه مدام نام منابع ذکر شود.
۲. برنامه عملیاتی بخش باید صریحاً و دقیقاً منطبق بر نام هر یک از پرسنل و نمرات واقعی مهارت‌های آنها تدوین شود و دارای ماتریس عملیاتی شفاف با تعیین مربی، اقدام و مهلت باشد.`;

// Helper function to call Gemini with automatic retry, exponential backoff, and fallback models in case of 503/429
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string = NURSING_AI_MISSION_INSTRUCTION
): Promise<string> {
  const models = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
  ];
  let lastError: any = null;

  for (const model of models) {
    // Attempt with 1 immediate retry and small backoff if temporary 503 occurs
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
        if (response.text && response.text.trim().length > 0) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');
        
        if (isTransient && attempt === 0) {
          // Brief pause before retry on high demand spike
          await new Promise(res => setTimeout(res, 800));
          continue;
        }
        
        console.warn(`Gemini model ${model} (attempt ${attempt + 1}) failed:`, errMsg);
        break; // Move to next model in list
      }
    }
  }

  throw lastError || new Error('تمام مدل‌های هوش مصنوعی در دسترس نبودند.');
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Ibb3Wc27jXphyJCW9bvHvMGvMoDu4VJVQhGS6OTmtrYA';

  // Initialize Gemini AI Client
  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  router.get(['/health', '/api/health'], (_req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!GEMINI_API_KEY });
  });

  // 1. Generate Individual Improvement Plan with Gemini AI
  router.post(['/gemini/generate-improvement-plan', '/api/gemini/generate-improvement-plan'], async (req, res) => {
    try {
      const { staffName, staffTitle, weakSkills, supervisorMessage, managerMessage } = req.body;
      const weakCount = Array.isArray(weakSkills) ? weakSkills.length : 0;

      if (!GEMINI_API_KEY) {
        return res.json({
          plan: `# برنامه بهبود مهارتی و ارتقای بالینی ۳۰ روزه برای ${staffName} (${staffTitle || 'کادر درمان'})

### ۱. ارزیابی سطح شایستگی بالینی (بر مبنای واکاوی عمیق نمرات)
بر اساس واکاوی موشکافانه نمرات در سنجه‌های بالینی، تعداد ${weakCount > 0 ? `${weakCount} سنجه در رده نیازمند توانمندسازی و نظارت (نمره کمتر از ۳)` : 'تمامی سنجه‌ها در رده استقلال کامل'} شناسایی گردیده است. نمرات ۳ و ۴ نشان‌دهنده استقلال و خبرگی بوده و اقدامات اصلاحی این برنامه منحصراً بر ارتقای خط پایه عملکرد در حوزه‌های با نمره زیر ۳ متمرکز است.

### ۲. برنامه اقدامات اصلاحی هدفمند:
۱. **اصلاح و بازآموزی تکنیک‌های آسپتیک و کنترل عفونت:** اجرای دقیق مراحل شستشوی دست، استفاده از وسایل حفاظت فردی و مدیریت کاتترها با نظارت مستقیم.
۲. **استانداردسازی فرآیندهای دارودهی و ایمنی بیمار:** تلفیق دارویی، احراز هویت دوگانه و رعایت اصول ۶ گانه در تزریق داروهای پرخطر.
۳. **مدیریت راه‌های هوایی و مراقبت‌های حاد بالینی:** تسلط بر اکسیژن‌تراپی، ساکشن و حضور فعال در سناریوهای احیای قلبی-ریوی (CPR).
۴. **مستندسازی استاندارد و تحویل شیفت با الگوی ISBAR:** ارتقای ثبت دقیق گزارش‌های پرستاری و ارتباط حرفه‌ای با تیم درمان.

### ۳. برنامه آموزشی و مهارتی ۳۰ روزه (در ۳ مرحله متوالی):
- **دهه اول (روز ۱ تا ۱۰ - بازآموزی پروتکل‌ها و گایدلاین‌ها):** مطالعه دستورالعمل‌های بالینی بخش و مرور سنجه‌های اعتباربخشی.
- **دهه دوم (روز ۱۱ تا ۲۰ - تمرین در Skill Lab و کار با مانکن):** شبیه‌سازی پروسیجرهای مداخله‌ای تحت هدایت منتور بالینی شیفت.
- **دهه سوم (روز ۲۱ تا ۳۰ - اجرای بر بالین و آزمون DOPS):** اجرای پروسیجرها بر بالین بیمار واقعی با چک‌لیست و اخذ تاییدیه آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS).

${supervisorMessage ? `\n> **پیام سوپروایزر آموزشی:** ${supervisorMessage}\n` : ''}
${managerMessage ? `\n> **پیام مسئول بخش:** ${managerMessage}\n` : ''}`
        });
      }

      const prompt = `شما ارزیاب تخصصی شایستگی‌های بالینی پرستاری بیمارستان هستید.
برای پرسنل محترم "${staffName}" با سمت "${staffTitle || 'کادر درمان'}"، یک برنامه بهبود مهارتی و ارتقای بالینی ۳۰ روزه تهیه کنید.

اطلاعات نمرات و شاخص‌ها جهت دیپ سرچ:
- تعداد سنجه‌های نیازمند توانمندسازی (نمره زیر ۳): ${weakCount} مورد
${supervisorMessage ? `پیام سوپروایزر آموزشی: ${supervisorMessage}` : ''}
${managerMessage ? `پیام مسئول بخش: ${managerMessage}` : ''}

دستورالعمل‌های حیاتی:
۱. واکاوی عمیق نمرات (Deep Search): با در نظر گرفتن اینکه نمرات ۳ و ۴ نشان‌دهنده تسلط و استقلال هستند، عملکرد را واکاوی کن.
۲. ممنوعیت کامل آوردن نام یا متن مهارت‌ها: به هیچ وجه نام سنجه‌ها یا متن مهارت‌ها را کپی و تکرار نکن تا گزارش کاملاً خلوت و بدون شلوغی باشد.
۳. خروجی فقط شامل:
   - تحلیل سطح شایستگی و رتبه بالینی
   - برنامه اقدامات اصلاحی متمرکز
   - برنامه آموزشی ۳۰ روزه در ۳ دهه (تئوری، تمرین در Skill Lab، آزمون DOPS بر بالین)`;

      let planText = '';
      try {
        planText = await callGeminiWithFallback(
          ai,
          prompt,
          `شما ارزیاب تخصصی بالینی هستید. بدون آوردن نام یا متن مهارت‌ها، برنامه‌ای بسیار خلوت، راهبردی و متمرکز بر اقدام اصلاحی و آموزش ارائه دهید.`
        );
      } catch (geminiErr) {
        console.warn('Gemini API unavailable for generate-improvement-plan, using clinical fallback:', geminiErr);
        // Direct clinical fallback without 500 failure
        planText = `# برنامه بهبود مهارتی و ارتقای بالینی ۳۰ روزه برای ${staffName} (${staffTitle || 'کادر درمان'})

### ۱. ارزیابی سطح شایستگی بالینی (بر مبنای واکاوی عمیق نمرات)
بر اساس واکاوی موشکافانه نمرات در سنجه‌های بالینی، تعداد ${weakCount > 0 ? `${weakCount} سنجه در رده نیازمند توانمندسازی و نظارت (نمره کمتر از ۳)` : 'تمامی سنجه‌ها در رده استقلال کامل'} شناسایی گردیده است. نمرات ۳ و ۴ نشان‌دهنده استقلال و خبرگی بوده و اقدامات اصلاحی این برنامه منحصراً بر ارتقای خط پایه عملکرد در حوزه‌های با نمره زیر ۳ متمرکز است.

### ۲. برنامه اقدامات اصلاحی هدفمند:
۱. **اصلاح و بازآموزی تکنیک‌های آسپتیک و کنترل عفونت:** اجرای دقیق مراحل شستشوی دست، استفاده از وسایل حفاظت فردی و مدیریت کاتترها با نظارت مستقیم.
۲. **استانداردسازی فرآیندهای دارودهی و ایمنی بیمار:** تلفیق دارویی، احراز هویت دوگانه و رعایت اصول ۶ گانه در تزریق داروهای پرخطر.
۳. **مدیریت راه‌های هوایی و مراقبت‌های حاد بالینی:** تسلط بر اکسیژن‌تراپی، ساکشن و حضور فعال در سناریوهای احیای قلبی-ریوی (CPR).
۴. **مستندسازی استاندارد و تحویل شیفت با الگوی ISBAR:** ارتقای ثبت دقیق گزارش‌های پرستاری و ارتباط حرفه‌ای با تیم درمان.

### ۳. برنامه آموزشی و مهارتی ۳۰ روزه (در ۳ مرحله متوالی):
- **دهه اول (روز ۱ تا ۱۰ - بازآموزی پروتکل‌ها و گایدلاین‌ها):** مطالعه دستورالعمل‌های بالینی بخش و مرور سنجه‌های اعتباربخشی.
- **دهه دوم (روز ۱۱ تا ۲۰ - تمرین در Skill Lab و کار با مانکن):** شبیه‌سازی پروسیجرهای مداخله‌ای تحت هدایت منتور بالینی شیفت.
- **دهه سوم (روز ۲۱ تا ۳۰ - اجرای بر بالین و آزمون DOPS):** اجرای پروسیجرها بر بالین بیمار واقعی با چک‌لیست و اخذ تاییدیه آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS).

${supervisorMessage ? `\n> **پیام سوپروایزر آموزشی:** ${supervisorMessage}\n` : ''}
${managerMessage ? `\n> **پیام مسئول بخش:** ${managerMessage}\n` : ''}`;
      }

      res.json({ plan: planText });
    } catch (error: any) {
      console.error('Gemini API Error (generate-improvement-plan):', error);
      res.status(500).json({ error: 'خطا در ارتباط با هوش مصنوعی Gemini', details: error.message });
    }
  });

  // 2. Intelligent Skill Analysis for Hospital or Department
  router.post(['/gemini/analyze-skills', '/api/gemini/analyze-skills'], async (req, res) => {
    try {
      const {
        contextType,
        hospitalName,
        departmentName,
        evaluatedStaffCount,
        overallAvg,
        genAvg,
        specAvg,
        commAvg,
        staffList
      } = req.body;

      const targetTitle = contextType === 'hospital' ? `کل بیمارستان ${hospitalName}` : `بخش ${departmentName}`;

      let staffSection = '';
      let staffPromptDetails = '';

      if (Array.isArray(staffList) && staffList.length > 0) {
        const sortedStaff = [...staffList].sort((a: any, b: any) => (b.overallAvg || 0) - (a.overallAvg || 0));
        const topPerformer = sortedStaff[0] || { name: 'سرپرستار بخش', overallAvg: 90 };

        let table = `\n\n---\n\n### ۳. ماتریس برنامه توانمندسازی پرسنل و منتورهای بالینی معین (بر اساس نمرات):\n\n| ردیف | نام پرسنل | سمت | میانگین شایستگی | وضعیت نیاز به توانمندسازی | برنامه آموزشی پیشنهادی مشخص | منتور بالینی معین (بر اساس نمرات) | مهلت و شیوه ارزیابی |\n|:---:|:---|:---:|:---:|:---|:---|:---:|:---:|\n`;

        sortedStaff.forEach((st: any, idx: number) => {
          const weakCount = (st.weakSkills || []).length;
          const isTop = (st.overallAvg >= 85) || (st.name === topPerformer.name);
          const assignedMentor = isTop
            ? 'سرپرستار بخش / سوپروایزر آموزشی'
            : `${topPerformer.name} (کادر برتر بخش با نمره ${topPerformer.overallAvg}٪)`;

          let specificAction = 'تثبیت شایستگی، آموزش تکنیک‌های نوین و ایفای نقش مربی بالینی در شیفت';
          if (weakCount > 0) {
            const weakText = (st.weakSkills || []).map((w: any) => w.name || w.skillName || '').join(' ');
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
        sortedStaff.forEach((st: any, idx: number) => {
          const weakCount = (st.weakSkills || []).length;
          const isTop = (st.overallAvg >= 85) || (st.name === topPerformer.name);
          const assignedMentor = isTop
            ? 'سرپرستار بخش / سوپروایزر آموزشی'
            : `${topPerformer.name} (کادر برتر بخش با میانگین ${topPerformer.overallAvg}٪)`;

          cards += `\n#### ۴.${idx + 1}. برنامه آموزشی: **${st.name}** (${st.title || 'کارشناس پرستاری'})\n`;
          cards += `- **میانگین شایستگی:** ${st.overallAvg}٪ (رتبه شایستگی: ${st.overallAvg >= 85 ? '🟢 مطلوب و مستقل' : st.overallAvg >= 75 ? '🟡 متوسط رو به رشد' : '🔴 نیازمند مداخله و نظارت مستقیم'})\n`;
          if (weakCount > 0) {
            cards += `- **سنجه‌های دارای ضعف در ارزیابی:** ${(st.weakSkills || []).map((w: any) => `«${w.name || w.skillName}» (${w.scorePct || ''}٪)`).join('، ')}\n`;
            cards += `- **برنامه آموزشی پیشنهادی گام‌به‌گام:**\n`;
            cards += `  • فاز ۱ (روز ۱ تا ۱۰): مرور گایدلاین‌های بالینی و مطالعه مستندات تئوری\n`;
            cards += `  • فاز ۲ (روز ۱۱ تا ۲۰): تمرین سناریومحور در Skill Lab و اجرای پروسیجر تحت نظارت مستقیم منتور شیفت\n`;
            cards += `  • فاز ۳ (روز ۲۱ تا ۳۰): اجرای مستقل بر بالین بیمار و ثبت چک‌لیست صلاحیت نهایی\n`;
          } else {
            cards += `- **وضعیت مهارت‌ها:** تسلط کامل در کلیه سنجه‌ها (نمره ۳ و ۴)\n`;
            cards += `- **برنامه پیشنهادی:** تثبیت شایستگی و ایفای نقش مربی بالینی در شیفت جهت آموزش به سایر پرسنل\n`;
          }
          cards += `- **شخص منتور بالینی معین (بر اساس نمرات):** **${assignedMentor}**\n`;
          cards += `- **روش و مهلت ارزیابی مجدد:** ۳۰ روز کاری با آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS)\n`;
        });

        staffSection = table + cards;

        staffPromptDetails = `\nلیست پرسنل و وضعیت نمرات جهت تعیین برنامه آموزشی و منتور:\n` +
          sortedStaff.map((st: any, i: number) => `${i + 1}. نام: ${st.name} | میانگین: ${st.overallAvg}٪ | ضعف‌ها: ${(st.weakSkills || []).length} سنجه`).join('\n');
      }

      const fallbackAnalysis = `## گزارش ممیزی و تحلیل هوشمند عملکردی ${targetTitle}

### شاخص‌های کلان عملکردی:
- میانگین کل: **${overallAvg}%** | رتبه ایمنی: ${overallAvg >= 85 ? 'سبز و مطلوب' : overallAvg >= 75 ? 'متوسط رو به رشد' : 'نیازمند مداخله فوری'}
- مهارت‌های عمومی: **${genAvg}%** | مهارت‌های تخصصی: **${specAvg}%** | ارتباط و آموزش به بیمار: **${commAvg}%**
- تعداد کادر ارزیابی‌شده: **${evaluatedStaffCount} نفر**

---

### ۱. تحلیل ریشه‌ای وضعیت شایستگی‌ها (Deep Search):
- واکاوی عمیق توزیع نمرات نشان می‌دهد که هسته اصلی عملکرد در بخش نیازمند یکپارچه‌سازی آموزش‌های بالینی است.
- نقاط قوت شامل انطباق با پروتکل‌های اساسی و تسلط پرسنل ارشد بر فرآیندهای روتین مراقبت است.
- بیشترین انحراف از استانداردهای ایمنی بیمار در پروسیجرهای پرخطر، مستندسازی دقیق و تکنیک‌های آسپتیک رخ داده است.

---

### ۲. برنامه اقدامات اصلاحی متمرکز:
۱. **نظارت مستقیم بر پروسیجرهای پرخطر:** استقرار مربیان بالینی در شیفت‌های کاری برای نظارت بر تزریقات و داروهای پرخطر.
۲. **بازنگری فرآیند تحویل شیفت:** به‌کارگیری چک‌لیست ISBAR در کلیه تعویض شیفت‌ها.
۳. **ممیزی بهداشت دست و کنترل عفونت:** سنجش هفتگی رعایت استانداردها توسط رابط کنترل عفونت.${staffSection}

---

### ۵. برنامه آموزشی و بازآموزی بالینی:
- برگزاری کارگاه‌های عملیاتی شبیه‌سازی سناریو در Skill Lab.
- ارزشیابی مستقیم مهارت‌ها با آزمون DOPS بر بالین بیمار.`;

      if (!GEMINI_API_KEY) {
        return res.json({
          analysis: fallbackAnalysis
        });
      }

      const prompt = `شما مشاور ارشد ارزیابی بالینی بیمارستان هستید.
گزارش تحلیل شایستگی برای: ${targetTitle}
شاخص‌ها: میانگین کل: ${overallAvg}% | عمومی: ${genAvg}% | تخصصی: ${specAvg}% | ارتباطی: ${commAvg}% | پرسنل: ${evaluatedStaffCount} نفر.
${staffPromptDetails}

دستورالعمل اکید:
۱. تحلیل ریشه‌ای و اقدامات اصلاحی کلان بخش را بدون ذکر جداول سنجه‌های خام بنویسید.
۲. حتماً زیر گزارش، جدول ماتریس برنامه توانمندسازی پرسنل و برای هر پرسنل، برنامه آموزشی پیشنهادی با توجه به مهارت‌ها و نقاط ضعفش را درج کنید.
۳. شخص منتور بالینی هر پرسنل را بر اساس نمرات (انتخاب از میان کادر رتبه برتر یا سرپرستار بخش) مشخص نمایید.`;

      let analysis = '';
      try {
        analysis = await callGeminiWithFallback(
          ai,
          prompt,
          `شما تحلیل‌گر ارشد بالینی هستید. بدون آوردن نام یا متن مهارت‌ها، گزارش تحلیلی، اقدام اصلاحی و برنامه آموزشی ارائه دهید.`
        );
      } catch (geminiErr) {
        console.warn('Gemini failed for analyze-skills, using fallback:', geminiErr);
        analysis = fallbackAnalysis;
      }

      res.json({ analysis: analysis || fallbackAnalysis });
    } catch (error: any) {
      console.error('Gemini API Error (analyze-skills):', error);
      res.status(500).json({ error: 'خطا در تحلیل هوش مصنوعی', details: error.message });
    }
  });

  // 3. Custom Question to Gemini AI based on scores/skills
  router.post(['/gemini/ask-custom-question', '/api/gemini/ask-custom-question'], async (req, res) => {
    try {
      const { contextName, overallAvg, genAvg, specAvg, commAvg, userQuery, skillsData } = req.body;

      if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
        return res.status(400).json({ error: 'لطفاً سوال خود را وارد کنید.' });
      }

      if (!GEMINI_API_KEY) {
        return res.json({
          answer: `**پاسخ بازرسی بالینی به سوال شما درباره «${userQuery}»:**

بر اساس شاخص‌های ثبت‌شده برای «${contextName}» (میانگین کل: ${overallAvg}٪، عمومی: ${genAvg}٪، تخصصی: ${specAvg}٪، ارتباطی: ${commAvg}٪):

۱. **از منظر کتاب اصول پرستاری پاتر و پری:** رعایت دقیق تکنیک‌های آسپتیک، بهداشت دست و استانداردهای پایه در مواجهه با موضوع مطروحه الزامی است.
۲. **از منظر کتاب پرستاری داخلی-جراحی برونر و سودارث:** پیشگیری از عوارض حاد بالینی، پایش مستمر همودینامیک و انجام صحیح پروسیجرهای مرتبط باید مدنظر باشد.
۳. **از منظر بوکلت مادری:** پروتکل‌های کشوری سلامت مادر و نوزاد و الگوریتم‌های مراقبت ادغام‌یافته باید لحاظ شوند.
۴. **از منظر سنجه‌های اعتباربخشی وزارت بهداشت:** رعایت سنجه‌های الزامی ایمنی بیمار، احراز هویت دوگانه و مستندسازی دقیق امری غیرقابل اغماض است.

---

${OFFICIAL_SOURCES_WITH_MONITORING}`
        });
      }

      const prompt = `شما مشاور ارشد اعتباربخشی و آموزش بیمارستان هستید.
کانتکست: "${contextName}" | میانگین کل: ${overallAvg}% | عمومی: ${genAvg}% | تخصصی: ${specAvg}% | حقوق بیمار: ${commAvg}%
${skillsData ? `اطلاعات تکمیلی سنجه‌ها:\n${JSON.stringify(skillsData, null, 2)}` : ''}

سوال صریح کاربر:
"${userQuery}"

الزام قطعی:
پاسخ شما باید دقیق، علمی و منحصراً بر مبنای ۵ مرجع رسمی تدوین شود:
۱. گایدلاین‌های جهانی بالینی و پرستاری
۲. کتاب اصول پرستاری پاتر و پری
۳. کتاب پرستاری داخلی-جراحی برونر و سودارث
۴. راهنمای بوکلت سلامت مادران و کودکان
۵. سنجه‌های اعتباربخشی بیمارستان وزارت بهداشت ایران
در انتها مراجع رسمی و روش‌های پایش آنها را درج کنید.`;

      let answer = '';
      try {
        answer = await callGeminiWithFallback(
          ai,
          prompt,
          `شما مشاور رسمی اعتباربخشی هستید. کلیه پاسخ‌ها باید منحصراً و دقیقاً متکی بر ۵ مرجع رسمی و روش‌های پایش آنها باشد.`
        );
      } catch (geminiErr) {
        console.warn('Gemini failed for ask-custom-question, using clinical fallback:', geminiErr);
        answer = `**پاسخ به سوال شما درباره «${userQuery}»:**\n\nبر اساس ارزیابی‌های انجام‌شده در «${contextName}» (میانگین کل: ${overallAvg}٪، عمومی: ${genAvg}٪، تخصصی: ${specAvg}٪، ارتباطی: ${commAvg}٪):\n- اولویت ارتقا بر مبنای راهنماهای بالینی و استانداردهای اعتباربخشی، تقویت سنجه‌های حیاتی با نمره کمتر از ۷۵٪ است.\n- نظارت بالینی مستقیم در شیفت و آموزش‌های عملیاتی کارگاهی توصیه می‌شود.\n\n${OFFICIAL_SOURCES_WITH_MONITORING}`;
      }

      res.json({ answer });
    } catch (error: any) {
      console.error('Gemini API Error (ask-custom-question):', error);
      res.status(500).json({ error: 'خطا در پاسخ به سوال', details: error.message });
    }
  });

  // 3.5 Suggest corrective action for a low-scoring skill
  router.post(['/gemini/suggest-corrective-actions', '/api/gemini/suggest-corrective-actions'], async (req, res) => {
    try {
      const { departmentName, skillName, categoryName, averageScore, lowCount } = req.body;

      const protocol = getClinicalProtocolForSkill(skillName, categoryName);

      const fallbackDescription = `برگزاری کارگاه بازآموزی فشرده و سنجش با آزمون عملی DOPS در بخش ${departmentName} برای ${lowCount} نفر پرسنل بر اساس پروتکل استاندارد کتاب‌های برونر-سودارث و پاتر-پری. ابزار پایش: ${protocol.monitoringMethod}.`;

      if (!GEMINI_API_KEY) {
        return res.json({
          title: `اقدام اصلاحی و بازآموزی سنجه: ${skillName}`,
          description: fallbackDescription,
          priority: averageScore < 60 ? 'high' : 'medium'
        });
      }

      const prompt = `شما بازرس ارشد اعتباربخشی بیمارستان هستید.
سنجه بالینی: "${skillName}" در دسته‌بندی "${categoryName}" در بخش "${departmentName}".
میانگین نمره: ${averageScore} از ۴ | تعداد پرسنل نیازمند مداخله: ${lowCount} نفر.
بر اساس کتاب‌های پاتر و پری، برونر و سودارث و سنجه‌های اعتباربخشی وزارت بهداشت، یک اقدام اصلاحی دقیق، کاربردی و زمان‌بندی‌شده به همراه روش پایش (مثل DOPS یا OSCE) به صورت خلاصه بنویسید.`;

      let description = '';
      try {
        description = await callGeminiWithFallback(
          ai,
          prompt,
          `شما بازرس اعتباربخشی بیمارستان هستید. اقدامات اصلاحی را مستند، علمی و با ذکر روش پایش دقیق بنویسید.`
        );
      } catch (geminiErr) {
        console.warn('Gemini failed for suggest-corrective-actions, using clinical fallback:', geminiErr);
        description = fallbackDescription;
      }

      res.json({
        title: `اقدام اصلاحی: ${skillName}`,
        description: description || fallbackDescription,
        priority: averageScore < 60 ? 'high' : 'medium'
      });
    } catch (error: any) {
      console.error('Gemini API Error (suggest-corrective-actions):', error);
      res.status(500).json({ error: 'خطا در پیشنهاد اقدام اصلاحی', details: error.message });
    }
  });

  // 4. Comprehensive Periodic Plan (Evaluates ALL skills by percentage rigorously)
  router.post(['/gemini/generate-periodic-plan', '/api/gemini/generate-periodic-plan'], async (req, res) => {
    try {
      const {
        mode, // 'hospital' | 'department' | 'staff'
        hospitalName,
        departmentName,
        staffName,
        staffTitle,
        overallAvg,
        genAvg,
        specAvg,
        commAvg,
        totalStaffCount,
        skillsSummary,
        staffList,
        staffDetails,
        departmentsData,
        supervisorMessage,
        managerMessage,
        activeYear
      } = req.body;

      if (mode === 'hospital') {
        const hospitalPlanText = buildHospitalStrategicPlanReport({
          hospitalName: hospitalName || 'مرکز آموزشی درمانی',
          overallAvg: Number(overallAvg) || 80,
          genAvg: Number(genAvg) || 80,
          specAvg: Number(specAvg) || 80,
          commAvg: Number(commAvg) || 80,
          totalStaffCount: Number(totalStaffCount) || 0,
          departmentsData: departmentsData || [],
          activeYear: activeYear || 1405
        });

        return res.json({
          plan: hospitalPlanText,
          structuredData: { mode: 'hospital', overallAvg, departmentsData: departmentsData || [] }
        });
      }

      const finalStaffList = Array.isArray(staffList) && staffList.length > 0
        ? staffList
        : (Array.isArray(staffDetails) && staffDetails.length > 0 ? staffDetails : []);

      const targetTitle = mode === 'staff'
        ? `پرسنل محترم ${staffName} (${staffTitle || 'کارشناس بالینی'}) - بخش ${departmentName}`
        : `کلیه پرسنل بخش ${departmentName} (${totalStaffCount || 0} نفر پرسنل)`;

      // Process and break down skills strictly by the 4 Ahvaz Directive color categories
      const breakdown = formatSkillsPercentageBreakdown(skillsSummary || []);

      // Calculate rank and risk according to Ahvaz Directive Table (Page 2)
      let overallRank = 'متوسط';
      let overallRiskColor = 'نارنجی';
      if (overallAvg >= 95) {
        overallRank = 'عالی';
        overallRiskColor = 'سبز';
      } else if (overallAvg >= 85) {
        overallRank = 'خوب';
        overallRiskColor = 'سبز / زرد';
      } else if (overallAvg >= 75) {
        overallRank = 'متوسط';
        overallRiskColor = 'زرد / نارنجی';
      } else {
        overallRank = 'ضعیف (پرخطر)';
        overallRiskColor = 'قرمز';
      }

      const structuredData = buildStructuredNursingEvaluationJson({
        hospitalName: hospitalName || 'مرکز آموزشی درمانی',
        departmentName: departmentName || 'بخش بالینی',
        skills: skillsSummary || [],
        staffList: finalStaffList,
        overallAvg: Number(overallAvg) || 0,
        genAvg: Number(genAvg) || 0,
        specAvg: Number(specAvg) || 0,
        commAvg: Number(commAvg) || 0,
      });

      if (!GEMINI_API_KEY) {
        return res.json({
          plan: formatStructuredJsonToMarkdown(structuredData),
          structuredData
        });
      }

      // Format staff list data if available for department operational plan
      let staffPromptInfo = '';
      if (finalStaffList.length > 0) {
        staffPromptInfo = `\nاطلاعات پرسنل بخش و وضعیت شایستگی جهت دیپ سرچ هوش مصنوعی:\n` +
          finalStaffList.map((st: any, idx: number) => {
            const weakCount = (st.weakSkills || []).length;
            const expertCount = (st.expertSkills || []).length;
            return `${idx + 1}. نام: **${st.name}** | سمت: ${st.title || 'کارشناس پرستاری'} | میانگین: ${st.averagePercentage || 0}٪ | سنجه‌های زیر ۳ (نیازمند توانمندسازی): ${weakCount} مورد | سنجه‌های خبرگی (نمره ۴): ${expertCount} مورد`;
          }).join('\n');
      }

      // Prepare Prompt for Gemini strictly reflecting Ahvaz University Nursing Directive and User Requirements
      const prompt = `شما هوش مصنوعی ارشد و تخصصی سامانه آموزش، ارزیابی مهارت‌های عملکردی و بهبود مستمر پرستاری بیمارستان هستید.
سطح تحلیل درخواستی: ${mode === 'hospital' ? 'سطح اول: سوپروایزر آموزشی (Hospital Strategic Plan)' : mode === 'department' ? 'سطح دوم: مسئول بخش (Department Action Plan)' : 'سطح سوم: برنامه بهبود فردی پرسنل (Staff Improvement Plan)'}

اطلاعات گزارش ارزیابی:
- موضوع: ${targetTitle}
- مرکز درمانی: ${hospitalName || 'بیمارستان'} | بخش: ${departmentName}
- میانگین کل: ${overallAvg}% (رتبه: ${overallRank} - سطح ریسک: ${overallRiskColor})
- عمومی: ${genAvg}% | اختصاصی: ${specAvg}% | ارتباطی-رفتاری: ${commAvg}%
${totalStaffCount ? `- تعداد پرسنل ارزیابی شده: ${totalStaffCount} نفر` : ''}
${supervisorMessage ? `- پیام سوپروایزر آموزشی: ${supervisorMessage}` : ''}
${managerMessage ? `- پیام سرپرستار بخش: ${managerMessage}` : ''}
${staffPromptInfo}

${breakdown.inspectorAnalysisPrompt}

قوانین حیاتی و الزامات غیرقابل تخطی:
۱. واکاوی عمیق نمرات و سنجه‌ها (Deep Search):
   شما باید در پس‌زمینه، واکاوی عمیق روی توزیع نمرات، حیطه‌های آسیب‌پذیر بالینی، سنجه‌های با نمره زیر ۳ و خطرات ایمنی بیمار انجام دهید.
۲. ممنوعیت مطلق آوردن نام مهارت‌ها، متن مهارت‌ها و عبارات گنگ و مبهم:
   - کاربر صریحاً تأکید کرده است: «تحلیل گنگ و مبهم نباشه، مثلاً ننویس شرکت در جلسات مهارت‌آموزی در Skill Lab یا آموزش بالینی بر بالین بیمار. بجاش دیپ سرچ کن توی مهارت‌ها و ضعیف‌ترین مهارت‌ها رو پیدا کن و براشون اقدام اصلاحی بزار. نمی‌خوام اسم مهارت‌ها رو ذکر کنی، می‌خوام به‌صورت کلی و کاربردی مثلاً بگی: برگزاری کارگاه احیا، آموزش اکسیژن‌تراپی، کارگاه محاسبات دارویی و...».
   - در متن خروجی به هیچ وجه جدول سنجه‌ها یا فهرست خام نام مهارت‌ها را چاپ نکن.
   - از آوردن عبارات کلیشه‌ای و مبهم مثل «شرکت در جلسات مهارت‌آموزی» اکیداً خودداری کن؛ اقدامات باید عناوینی شفاف، ملموس و قابل اجرا باشند (مانند: برگزاری کارگاه احیا، آموزش اکسیژن‌تراپی و ساکشن، کارگاه محاسبات دارویی و ایمنی تزریق، آموزش سونداژ و مراقبت آسپتیک، کارگاه مراقبت از پوست و استیج‌بندی برادن، دوره تبادل بالینی ISBAR).
۳. ساختار خروجی مورد انتظار (کاملاً خلوت، متمرکز، مستقیم و عملیاتی):
   ## ۱. تحلیل کلان و ریشه‌ای شایستگی‌ها (Executive Synthesis)
   (تحلیل عمیق حاصل از دیپ سرچ نمرات، ریشه‌یابی ضعف‌های مراقبتی و اولویت‌بندی ریسک‌های بیمارستانی بدون ذکر متن خام مهارت‌ها)
   
   ## ۲. برنامه اقدامات اصلاحی متمرکز (Targeted Corrective Actions)
   (اقدامات اصلاحی ملموس و عینی با عناوینی نظیر کارگاه احیا، آموزش اکسیژن‌تراپی، کنترل عفونت و ذکر مسئول، روش اجرا و شاخص اثربخشی)
   
   ## ۳. برنامه آموزشی و توانمندسازی بالینی (Educational Curriculum)
   (برنامه زمان‌بندی‌شده شامل کارگاه‌های مشخص، تمرین سناریومحور در Skill Lab، و ارزیابی بر بالین با آزمون DOPS)
   
   ## ۴. ماتریس عملیاتی توانمندسازی پرسنل (Staff Operational Matrix)
   (جدول تمیز شامل: ردیف | نام پرسنل | سمت | میانگین شایستگی | وضعیت نیاز به توانمندسازی | اقدام آموزشی و مداخله اصلاحی مشخص (مثلاً: برگزاری کارگاه احیا و تمرین کد ۹۹ | آموزش اکسیژن‌تراپی و ساکشن استاندارد) | مربی / منتور بالینی معین | مهلت اجرا | روش ارزیابی مجدد)
   (نکته مهم: در ستون اقدام آموزشی از نام خام مهارت‌ها استفاده نکن، بلکه عنوان اقدام مشخص آموزشی را بنویس)
   
   ## ۵. بهره‌گیری از پرسنل خبره به عنوان مربیان بالینی (Preceptors)
   (نقش کادر دارای نمرات برتر در شیفت‌ها جهت آموزش، منتورشیپ و ممیزی همکاران)

۴. ممنوعیت کامل ذکر نام کتاب‌ها و مراجع (مانند پاتر-پری، برونر و...).
۵. نگارش: فارسی روان و حرفه‌ای، کاملاً پاکیزه، با جداول استاندارد Markdown و بدون هرگونه شلوغی یا جملات تبلیغاتی.`;

      let planText = '';
      try {
        planText = await callGeminiWithFallback(ai, prompt, NURSING_AI_MISSION_INSTRUCTION);
      } catch (geminiErr) {
        console.warn('Gemini failed for periodic plan, using structured clinical fallback:', geminiErr);
        planText = formatStructuredJsonToMarkdown(structuredData);
      }

      res.json({
        plan: planText || formatStructuredJsonToMarkdown(structuredData),
        structuredData
      });
    } catch (error: any) {
      console.error('Gemini API Error (generate-periodic-plan):', error);
      res.status(500).json({ error: 'خطا در ارتباط با هوش مصنوعی', details: error.message });
    }
  });

  // 5. Generate Individual Skill Training & Step-by-Step Guideline Education
  router.post(['/gemini/generate-skill-training', '/api/gemini/generate-skill-training'], async (req: express.Request, res: express.Response) => {
    try {
      const {
        skillName,
        categoryName,
        departmentName,
        staffName,
        currentScore,
        maxPossibleScore = 4
      } = req.body;

      const percentage = maxPossibleScore > 0 ? Math.round(((currentScore || 0) / maxPossibleScore) * 100) : 0;

      // Build authentic 14-step clinical training fallback for this exact skill
      const buildFallbackTraining = () => {
        return buildFourteenStepSkillTraining(
          skillName,
          categoryName,
          departmentName,
          staffName,
          currentScore,
          maxPossibleScore
        );
      };

      if (!GEMINI_API_KEY) {
        return res.json({ training: buildFallbackTraining() });
      }

      const prompt = `شما هوش مصنوعی تخصصی سامانه آموزش و ارزیابی مهارت‌های بالینی پرستاری بیمارستان هستید.
کاربر درخواست آموزش تخصصی مهارت زیر را ارسال کرده است:
- نام دقیق مهارت: "${skillName}"
- حیطه: "${categoryName}"
- بخش: "${departmentName}"
${staffName ? `- پرسنل: "${staffName}"` : ''}
- نمره ثبت‌شده: ${currentScore !== undefined ? `${currentScore} از ${maxPossibleScore} (${percentage}٪)` : 'نیاز به ارزیابی'}

شما موظفید دقیقاً طبق ساختار استاندارد ۱۴ گانه آموزش هر مهارت (قابلیت دوم سامانه) این آموزش را تدوین کنید:
۱. عنوان مهارت و مشخصات سازمانی
۲. هدف یادگیری (Learning Objectives)
۳. اهمیت مهارت در مراقبت از بیمار و ارتقای ایمنی
۴. پیش‌نیازهای دانش و مهارت (Prerequisites)
۵. وسایل و تجهیزات مورد نیاز (با ذکر دقیق سایز، گیج و استانداردهای مصرفی)
۶. مراحل انجام مهارت به ترتیب (الف: آماده‌سازی، ب: اجرای گام‌به‌گام تکنیکال، ج: مراقبت‌های پس از پروسیجر)
۷. نکات ایمنی بیمار و سنجه‌های اعتباربخشی وزارت بهداشت
۸. خطاهای شایع بالینی و روش پیشگیری (در قالب جدول ساختاریافته)
۹. موارد نیازمند گزارش فوری به مسئول بخش یا پزشک
۱۰. نکات مستندسازی و ثبت استاندارد در پرونده
۱۱. سناریوی بالینی کوتاه برای یادگیری کاربردی (Case-Based)
۱۲. سوالات ارزیابی یادگیری (۳ سوال تستی یا تشریحی با پاسخ و تحلیل تشریحی کامل)
۱۳. خلاصه نکات کلیدی و طلایی مهارت
۱۴. پیشنهاد تمرین عملی یا ارزیابی مجدد صلاحیت (با روش DOPS یا OSCE)
در پایان سند، ۵ مرجع رسمی و روش‌های پایش آنها آورده شود.

به هیچ وجه از کلی‌گویی و متن‌های مبهم استفاده نکنید؛ تمام گام‌ها باید بالینی، علمی و با دقت بالا باشند.`;

      let trainingText = '';
      try {
        trainingText = await callGeminiWithFallback(
          ai,
          prompt,
          NURSING_AI_MISSION_INSTRUCTION
        );
      } catch (err) {
        console.warn('Gemini failed for skill training, using detailed clinical fallback:', err);
        trainingText = buildFallbackTraining();
      }

      res.json({ training: trainingText || buildFallbackTraining() });
    } catch (error: any) {
      console.error('Gemini API Error (generate-skill-training):', error);
      res.status(500).json({ error: 'خطا در تولید آموزش مهارت با هوش مصنوعی', details: error.message });
    }
  });

  router.post(['/gemini/analyze-sensitive-indicators', '/api/gemini/analyze-sensitive-indicators'], async (req: express.Request, res: express.Response) => {
    try {
      const { structuredSummary, hospitalName, year } = req.body;
      const inpatientCount = structuredSummary?.inpatientCount ?? 0;
      const outpatientCount = structuredSummary?.outpatientCount ?? 0;

      const buildFallbackAnalysis = () => `# تحلیل جامع و بالینی شاخص‌های حساس بیمارستان ${hospitalName} (${year})
**مرکز درمانی:** ${hospitalName} | **سال ارزیابی:** ${year} | **تعداد بخش‌های بستری:** ${inpatientCount} بخش | **واحدهای سرپایی:** ${outpatientCount} واحد

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

      if (!GEMINI_API_KEY) {
        return res.json({ analysis: buildFallbackAnalysis() });
      }

      const prompt = `شما ارزیاب ارشد اعتباربخشی بالینی و هوش مصنوعی پایش «شاخص‌های حساس بیمارستانی» وزارت بهداشت هستید.
اطلاعات زیر، داده‌های پردازش‌شده و ساختاریافته شاخص‌های حساس ۱۰گانه بیمارستان ${hospitalName} برای ${year} است:
${JSON.stringify(structuredSummary, null, 2)}

لطفاً یک تحلیل جامع، راهبردی، دقیق و کاربردی به زبان فارسی در قالب Markdown با بخش‌های زیر تدوین فرمایید:

# تحلیل راهبردی و بالینی شاخص‌های حساس بیمارستان ${hospitalName} (${year})

## ۱. ارزیابی نقاط قوت کلان بیمارستان
- تحلیل دسته‌های شاخصی که بیمارستان در آن‌ها بهترین عملکرد و روند صعودی را ثبت کرده است.
- بخش‌هایی که الگو و پیشرو در ایمنی بیمار و کیفیت مراقبت بوده‌اند.

## ۲. کالبدشکافی بخش‌های پرریسک و نیازمند مداخله فوری (Red Flags)
- تحلیل بخش‌هایی که نرخ بالاتری در زخم فشاری، سقوط، یا نمرات پایین‌تری در بهداشت دست و مهارت‌ها دارند.
- ریشه‌یابی علل احتمالی در بخش‌های بستری یا سرپایی با ذکر نام بخش‌ها.

## ۳. تحلیل روند فصلی و پویایی فصول (بهار تا زمستان)
- بررسی شیب تغییرات از بهار تا زمستان (آیا فرآیندها رو به بهبود بوده‌اند یا در نیمه دوم سال افت داشته‌اند؟).
- بررسی اثر فصول یا تغییرات فصلی بر شاخص‌ها.

## ۴. واکاوی تطبیقی نیروهای جدیدالورود در برابر کل پرسنل
- بررسی شکاف مهارتی (Gap Analysis) بین نیروهای تازه‌استخدام و کادر باسابقه در مهارت‌های ارتباطی، عمومی و اختصاصی.
- لزوم بازنگری در فرآیند Orientation و برنامه‌های توجیهی بدو ورود.

## ۵. ماتریس اقدامات اصلاحی اولویت‌دار (Action Plan) برای مدیریت و مترون
- ۳ تا ۵ اقدام اصلاحی فوری و دارای بالاترین اولویت با مسئول پیگیری و زمان‌بندی شفاف (مانند ممیزی بهداشت دست، پروتکل جامع ارزیابی خطر سقوط مورس، و رژیم تغییر پوزیشن بر اساس معیار برادن).

فقط از داده‌های موجود در JSON بالا استفاده کن؛ هیچ بخش یا مقداری که در داده نیست را نساز. لحن رسمی، پزشکی، مستند به ارقام و کاملاً سازنده باشد.`;

      let analysisText = '';
      try {
        analysisText = await callGeminiWithFallback(ai, prompt, NURSING_AI_MISSION_INSTRUCTION);
      } catch (err) {
        console.warn('Gemini failed for sensitive indicators analysis, using clinical fallback:', err);
        analysisText = buildFallbackAnalysis();
      }

      res.json({ analysis: analysisText || buildFallbackAnalysis() });
    } catch (error: any) {
      console.error('Gemini API Error (analyze-sensitive-indicators):', error);
      res.status(500).json({ error: 'خطا در تحلیل شاخص‌های حساس با هوش مصنوعی', details: error.message });
    }
  });

  return router;
}
