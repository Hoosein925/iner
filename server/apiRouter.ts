import express from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  OFFICIAL_SOURCES_WITH_MONITORING,
  formatSkillsPercentageBreakdown,
  getClinicalProtocolForSkill,
  groupSkillsIntoActionAxes,
  buildFourteenStepSkillTraining,
  buildStructuredNursingEvaluationJson,
  formatStructuredJsonToMarkdown,
  deriveCorrectiveInterventionsFromSkills,
  StructuredNursingEvaluation,
  SkillSummaryItem,
  ActionAxisItem
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

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6KQFK6i005UzGLUkDlspec9H5XO9uK3OFvv8iM1K2CTDg';

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
  router.get(['/health', '/api/health'], (req, res) => {
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
        skillsNeedingTraining
      } = req.body;

      const targetTitle = contextType === 'hospital' ? `کل بیمارستان ${hospitalName}` : `بخش ${departmentName}`;

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
۳. **ممیزی بهداشت دست و کنترل عفونت:** سنجش هفتگی رعایت استانداردها توسط رابط کنترل عفونت.

---

### ۳. برنامه آموزشی و بازآموزی بالینی:
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

دستورالعمل اکید:
- با واکاوی عمیق نمرات (Deep Search)، تحلیل ریشه‌ای، اقدامات اصلاحی و برنامه آموزشی ارائه دهید.
- اکیداً از آوردن نام یا متن مهارت‌ها و ساخت جداول سنجه‌ها خودداری فرمایید تا خروجی خلوت و متمرکز بر اقدام اصلاحی باشد.`;

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
      const { contextName, evaluatedStaffCount, overallAvg, genAvg, specAvg, commAvg, userQuery, skillsData } = req.body;

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
        mode, // 'department' | 'staff'
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
        weakSkills,
        staffList,
        staffDetails,
        supervisorMessage,
        managerMessage
      } = req.body;

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

      const actionAxes = groupSkillsIntoActionAxes(skillsSummary || [], { departmentName, staffName, totalStaffCount });

      // Build personalized, data-driven fallback plan if AI key missing or models fail
      const buildFallbackPeriodicPlan = () => {
        const redNames = breakdown.redSkills.map(s => `«${s.skillName}» (${s.percentage}٪)`).join('، ');
        const orangeNames = breakdown.orangeSkills.map(s => `«${s.skillName}» (${s.percentage}٪)`).join('، ');
        const yellowNames = breakdown.yellowSkills.map(s => `«${s.skillName}» (${s.percentage}٪)`).join('، ');
        const greenNames = breakdown.greenSkills.map(s => `«${s.skillName}» (${s.percentage}٪)`).join('، ');

        // 1. Level 1: Educational Supervisor (Hospital Level)
        if (mode === 'hospital') {
          let axesTable = `| ردیف | اولویت | محور اصلاحی | مشکل شناسایی‌شده | گروه / بخش‌های درگیر | اقدام اجرایی یکپارچه | مسئول اجرا | زمان اجرا | شاخص اثربخشی | وضعیت پیگیری |\n|:---:|:---:|:---|:---|:---:|:---|:---:|:---:|:---|:---:|\n`;
          actionAxes.forEach((axis, idx) => {
            axesTable += `| ${idx + 1} | ${axis.priority} | ${axis.axisTitle} | ${axis.identifiedProblem} | ${axis.involvedDepartmentsOrStaff} | ${axis.integratedAction} | ${axis.responsibleRole} | ${axis.timeframe} | ${axis.effectivenessMetric} | 🟡 در حال اقدام |\n`;
          });

          return `# برنامه راهبردی و تحلیل هوش مصنوعی بیمارستان (سطح سوپروایزر آموزشی)
**سامانه آموزش، ارزیابی مهارت‌های عملکردی و بهبود مستمر پرستاری بیمارستان**
**مرکز درمانی:** ${hospitalName || 'بیمارستان'} | **میانگین کل شایستگی بیمارستان:** **${overallAvg}٪** (رتبه: **${overallRank}** - رنگ ریسک: **${overallRiskColor}**)
**حیطه‌ها:** عمومی: **${genAvg}٪** | اختصاصی: **${specAvg}٪** | ارتباطی-رفتاری: **${commAvg}٪** | پرسنل پایش‌شده: **${totalStaffCount || 'کلیه کادر بالینی'}**

---

## ۱. تحلیل کلان و ریشه‌ای بیمارستان (Executive Synthesis)
- **واکاوی داده‌های ارزیابی:** میانگین شایستگی عملکردی کل پرستاری به میزان **${overallAvg}٪** ثبت گردیده که حاکی از استقرار وضعیت شایستگی **${overallRank}** در سازمان است.
- **ظرفیت‌های منتورشیپ سازمانی:** کادر بالینی در ${breakdown.greenSkills.length} سنجه به سطح تسلط مستقل (سبز) دست یافته‌اند. پرسنل صاحب امتیاز ۳ و ۴ در این حیطه‌ها به عنوان سرمایه‌های آموزش بالینی بیمارستان عمل می‌نمایند.
- **نقاط نیازمند مداخله و اصلاح ریشه‌ای:** تعداد **${actionAxes.filter(a => a.priority === 1).length}** محور اصلاحی بحرانی (اولویت ۱) و **${actionAxes.filter(a => a.priority === 2).length}** محور اولویت ۲ شناسایی گردید که نیازمند مداخله آموزشی متمرکز هستند.

---

## ۲. اولویت‌های اصلی و برنامه‌های اصلاحی بیمارستان (Hospital Core Priorities)
${actionAxes.map((axis, i) => `### ۲.${i + 1}. ${axis.axisTitle} (${axis.priorityLabel})
- **دلیل انتخاب اولویت:** ${axis.identifiedProblem}
- **گروه و بخش‌های هدف:** ${axis.involvedDepartmentsOrStaff}
- **اقدام اصلاحی یکپارچه:** ${axis.integratedAction}
- **مسئول پیشنهادی و زمان‌بندی:** ${axis.responsibleRole} | مهلت: ${axis.timeframe}
- **شاخص اثربخشی:** ${axis.effectivenessMetric}
`).join('\n')}

---

## ۳. ماتریس برنامه اجرایی آموزشی بیمارستان (Action Plan Matrix)
جدول زیر بر اساس اصل تجمیع هوشمند حوزه‌های هم‌پوشان و پرهیز از تکرار سنجه‌ها تدوین شده است:

${axesTable}

---

## ۴. برنامه آموزشی و توانمندسازی دوره بعد (Hospital Educational Curriculum)
تقویم توانمندسازی سوپروایزر آموزشی منحصراً بر خوشه‌های مهارتی و محورهای اولویت‌دار زیر متمرکز است:
۱. **دوره جامع توانمندسازی احیای پیشرفته و مدیریت بحران بالینی:** ۴ ساعت تئوری + ۶ ساعت تمرین سناریومحور در Skill Lab بیمارستان.
۲. **کارگاه بازآموزی تزریقات ایمن و مدیریت داروهای پرخطر (High-Alert Medications):** ارزیابی قبل و بعد با آزمون کتبی و چک‌لیست عملی.
۳. **بوت‌کمپ استانداردهای کنترل عفونت، تکنیک‌های آسپتیک و مراقبت از کاتترها:** آموزش بر بالین همراه با ممیزی شیفتی توسط سرپرستاران.
۴. **سمینار مهارت‌های ارتباطی پیشرفته، تحویل شیفت ایمن (ISBAR) و مستندسازی پرونده:** بر اساس استانداردهای اعتباربخشی.

---

## ۵. اقدامات سیستمی و مدیریتی پشتیبان (Systemic & Structural Interventions)
- **تجهیزات و زیرساخت:** تقویت تجهیزات مرکز مهارت‌های بالینی (Skill Lab) به مولاژهای تخصصی تزریق و احیا و به‌روزرسانی ترالی‌های احیا.
- **تعدیل نیروی انسانی و چیدمان شیفت:** توزیع همگن پرسنل نمره ۴ (خبره) در کلیه شیفت‌های عصر و شب در کنار نیروهای نیازمند نظارت (نمره ۱ و ۲).
- **بازنگری فرآیندها و دستورالعمل‌ها:** استقرار چک‌لیست‌های بالینی DOPS در بخش‌ها و الصاق گایدلاین‌های بالینی مصوب بر بالین بیمار.`;
        }

        // 2. Level 2: Department Head (Department Level)
        if (mode === 'department') {
          let deptAxesTable = `| ردیف | اولویت | محور اصلاحی | مسئله شناسایی‌شده | پرسنل هدف | اقدام اصلاحی مشخص | روش اجرا | مسئول | مهلت | شاخص اثربخشی | روش ارزیابی مجدد |\n|:---:|:---:|:---|:---|:---:|:---|:---|:---:|:---:|:---|:---:|\n`;
          actionAxes.forEach((axis, idx) => {
            deptAxesTable += `| ${idx + 1} | ${axis.priority} | ${axis.axisTitle} | ${axis.identifiedProblem} | کادر بالینی بخش | ${axis.integratedAction} | کارگاه و منتورشیپ | ${axis.responsibleRole} | ${axis.timeframe} | ${axis.effectivenessMetric} | ${axis.reassessmentMethod} |\n`;
          });

          // Generate clean staff operational matrix without dumping raw skills
          let staffMatrixSection = '';
          if (finalStaffList && finalStaffList.length > 0) {
            let staffTable = `| ردیف | نام پرسنل | سمت | میانگین شایستگی | وضعیت نیاز به توانمندسازی | اقدام عملیاتی و مداخله آموزشی مشخص | مربی / منتور بالینی معین | مهلت اجرا | روش ارزیابی مجدد بر بالین |\n|:---:|:---|:---:|:---:|:---|:---|:---:|:---:|:---:|\n`;

            finalStaffList.forEach((st: any, idx: number) => {
              const weakSkills = st.weakSkills || [];
              const weakCount = weakSkills.length;
              const weakStatus = weakCount > 0
                ? `دارای ${weakCount} سنجه نیازمند توانمندسازی (نمره زیر ۳)`
                : 'تسلط کامل و مستقل (کلیه سنجه‌ها ۳ و بالاتر)';
              const peerMentor = finalStaffList.find((p: any) => p.name !== st.name && (p.averagePercentage || 0) >= 85) || { name: 'سرپرستار بخش' };
              
              // Deep search into staff weak skills for specific educational intervention
              const staffIntervention = deriveCorrectiveInterventionsFromSkills(weakSkills);
              const specificAction = weakCount > 0
                ? staffIntervention.actionsList[0] || staffIntervention.primaryAction
                : 'تثبیت شایستگی و ایفای نقش مربی / منتور بالینی در شیفت';

              staffTable += `| ${idx + 1} | **${st.name}** | ${st.title || 'کارشناس پرستاری'} | ${st.averagePercentage || 0}٪ | ${weakStatus} | ${specificAction} | **${peerMentor.name}** | ۳۰ روزه | آزمون بالینی DOPS |\n`;
            });

            staffMatrixSection = `\n---\n\n## ۳. ماتریس برنامه عملیاتی توانمندسازی پرسنل بخش (منطبق بر نام پرسنل و نمرات)\nجدول زیر بر اساس تفکیک نام دقیق پرسنل، وضعیت نمرات و تعیین مربیان بالینی معین تدوین شده است:\n\n${staffTable}\n`;
          }

          return `# برنامه جامع بهبود عملکرد و ارزیابی مهارتی بخش: ${departmentName}
**سامانه پایش عملکرد و توانمندسازی بالینی کادر پرستاری**
**شاخص‌های میانگین بخش:** میانگین کل: **${overallAvg}٪** (رتبه: **${overallRank}** - رنگ ریسک: **${overallRiskColor}**)
**حیطه‌های ارزیابی:** عمومی: **${genAvg}٪** | اختصاصی: **${specAvg}٪** | ارتباطی-رفتاری: **${commAvg}٪** | کادر پایش‌شده: **${totalStaffCount || 0} نفر**

---

## ۱. تحلیل کلان و ریشه‌ای وضعیت بخش (Executive Competency Overview)
- **مهارت‌های عمومی:** میانگین **${genAvg}٪** (عملکردهای پایه و الزامات ایمنی کادر)
- **مهارت‌های اختصاصی:** میانگین **${specAvg}٪** (پروسیجرهای بالینی ویژه بخش ${departmentName})
- **مهارت‌های ارتباطی-رفتاری:** میانگین **${commAvg}٪** (آموزش به بیمار، اخلاق حرفه‌ای و تحویل شیفت)
- **تحلیل کیفیت مراقبت:** واکاوی عمیق نمرات نشان می‌دهد که تمرکز مداخلات اصلاحی باید معطوف به ارتقای مهارت‌های با نمره ۱ و ۲ (نیازمند نظارت مستقیم و غیرمستقیم) باشد. نمرات ۳ و ۴ به عنوان نقاط قوت پایدار تلقی شده و از تکرار مجدد سنجه‌ها در گزارش پرهیز می‌گردد.

---

## ۲. برنامه اقدامات اصلاحی و محورهای توانمندسازی (Targeted Action Plans)
جهت جلوگیری از پراکندگی و اجرای اثربخش، اقدامات اصلاحی در محورهای جامع زیر تجمیع شده‌اند:

${deptAxesTable}
${staffMatrixSection}
---

## ۴. برنامه به‌کارگیری پرسنل خبره بخش به عنوان مربیان بالینی (Preceptors)
- **انتصاب به عنوان مربی بالینی (Preceptor):** پرسنل با امتیازات برتر (نمره ۴) در هر شیفت به عنوان مربی و ناظر بالینی پرسنل نیازمند توانمندسازی تعیین می‌شوند.
- **مسئولیت نظارت در شیفت:** هدایت همکاران در اجرای تکنیک‌های آسپتیک، دارودهی ایمن و تحویل شیفت استاندارد با الگوی ISBAR.
- **ارزیابی اثربخشی:** ارزیابی مجدد صلاحیت پرسنل در پایان دوره ۳۰ روزه با آزمون مشاهده مستقیم مهارت‌های پروسیجرال (DOPS) توسط سرپرستار بخش انجام خواهد شد.`;
        }

        // 3. Level 3: Individual Staff Improvement Plan (Staff Level)
        const weakCount = (skillsSummary || []).filter((s: any) => (s.percentage || 0) < 75).length;

        return `# برنامه جامع توانمندسازی و بهبود مهارتی پرسنل (سطح فردی)
**سامانه ارزیابی مهارت‌های عملکردی و بهبود مستمر پرستاری بیمارستان**
**نام پرسنل:** ${staffName || 'همکار محترم'} (${staffTitle || 'کارشناس بالینی'}) | **بخش:** ${departmentName}
**میانگین شایستگی فردی:** **${overallAvg}٪** (رتبه: **${overallRank}** - وضعیت ریسک: **${overallRiskColor}**)

---

## ۱. ارزیابی سطح شایستگی و تحلیل نمرات (Competency Assessment)
- **تحلیل صلاحیت بالینی:** 
  - نمره ۳ نشان‌دهنده **تسلط و استقلال کامل** در اجرای استاندارد مهارت است و ضعف محسوب نمی‌شود.
  - نمره ۴ نشان‌دهنده **خبرگی و توانایی تدریس مهارت** به سایر همکاران است.
  - تمرکز اصلی این برنامه منحصراً بر ارتقای سنجه‌های با **نمره ۱ و ۲ (یا زیر ۷۵٪)** است.
- **وضعیت آماری:** تعداد **${weakCount}** سنجه در رده نیازمند تقویت و تمرین تحت نظارت شناسایی شده است.

---

## ۲. برنامه اقدامات اصلاحی متمرکز
۱. **رعایت کامل زنجیره آسپتیک و اصول کنترل عفونت بر بالین بیمار.**
۲. **انطباق با گایدلاین‌های دارودهی ایمن و کنترل محاسبات دارویی.**
۳. **تسلط بر مدیریت راه‌های هوایی و تجهیزات مراقبت ویژه بخش.**
۴. **مستندسازی دقیق پرونده و گزارش‌نویسی پرستاری مبتنی بر استانداردها.**

---

## ۳. برنامه آموزشی و مهارتی ۳۰ روزه (۳۰-Day Training Program)
- **دهه اول (روز ۱ تا ۱۰ - تئوری و بازآموزی علمی):**
  مرور راهنماهای بالینی، سنجه‌های ایمنی بیمار و پروتکل‌های مصوب بخش.
- **دهه دوم (روز ۱۱ تا ۲۰ - شبیه‌سازی و تمرین در Skill Lab):**
  تمرین عملی پروسیجرها روی مولاژ در مرکز مهارت‌های بالینی و اجرای پروسیجر در بخش تحت نظارت مستقیم منتور شیفت.
- **دهه سوم (روز ۲۱ تا ۳۰ - استقلال بالینی و آزمون DOPS):**
  اجرای مستقل پروسیجرها بر بالین بیمار و شرکت در آزمون ارزیابی مستقیم مهارت‌های بالینی (DOPS) توسط سرپرستار بخش جهت اعطای صلاحیت مستقل.

---

## ۴. منتور بالینی، مهلت و شیوه ارزیابی مجدد
- **مربی بالینی معین:** سرپرستار بخش ${departmentName} و منتور ارشد شیفت.
- **مهلت اجرا:** ۳۰ روز کاری از تاریخ صدور برنامه.
- **روش ارزیابی اثربخشی:** آزمون بالینی DOPS بر بالین بیمار واقعی.`;
      };

      const structuredData = buildStructuredNursingEvaluationJson({
        hospitalName: hospitalName || 'مرکز آموزشی درمانی',
        departmentName: departmentName || 'بخش بالینی',
        targetTitle,
        mode: mode || 'department',
        totalStaffCount: totalStaffCount || 0,
        overallAvg: Number(overallAvg) || 0,
        genAvg: Number(genAvg) || 0,
        specAvg: Number(specAvg) || 0,
        commAvg: Number(commAvg) || 0,
        overallRank,
        overallRiskColor,
        skillsSummary: skillsSummary || [],
        staffList: finalStaffList,
        staffName,
        staffTitle
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
  router.post(['/gemini/generate-skill-training', '/api/gemini/generate-skill-training'], async (req, res) => {
    try {
      const {
        skillName,
        categoryName,
        departmentName,
        staffName,
        currentScore,
        maxPossibleScore = 4,
        userRole
      } = req.body;

      const percentage = maxPossibleScore > 0 ? Math.round(((currentScore || 0) / maxPossibleScore) * 100) : 0;
      const protocol = getClinicalProtocolForSkill(skillName, categoryName);

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

  return router;
}
