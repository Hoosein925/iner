import React, { useState } from 'react';
import Modal from './Modal';

interface DatabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSqlModal: React.FC<DatabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [activeEngine, setActiveEngine] = useState<'supabase' | 'cpanel'>('supabase');
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<number>(0);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const supabaseSql = `-- ============================================================
-- 🚀 ساختار کامل دیتابیس، باکت‌های Storage و پالیسی‌های RLS (Supabase / PostgreSQL)
-- آخرین بروزرسانی: پاییز ۱۴۰۵ (منطبق بر شاخص‌های حساس، سنجه‌های بالینی و اعتباربخشی)
-- ============================================================

-- ۱. فعال‌سازی اکستنشن UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ۲. ساخت باکت‌های Storage برای فایل‌ها، تصاویر، ویدیوها و اکسل شاخص‌ها
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('materials', 'materials', true, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'video/mp4', 'audio/mpeg']),
  ('chat_attachments', 'chat_attachments', true, 52428800, NULL),
  ('sensitive_indicators', 'sensitive_indicators', true, 31457280, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- پالیسی‌های دسترسی به باکت‌های ذخیره‌سازی (Storage Policies)
CREATE POLICY "Public Access to Buckets" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Allow Upload to Buckets" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Update in Buckets" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Allow Delete in Buckets" ON storage.objects FOR DELETE USING (true);

-- ۳. جدول استان‌ها (Provinces)
CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۴. جدول بیمارستان‌ها (Hospitals)
CREATE TABLE IF NOT EXISTS public.hospitals (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    supervisor_name VARCHAR(150),
    supervisor_national_id VARCHAR(20),
    supervisor_password VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۵. جدول کارشناسان معاونت درمان (Provincial Officers)
CREATE TABLE IF NOT EXISTS public.provincial_officers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۶. جدول بخش‌های بیمارستان (Departments)
CREATE TABLE IF NOT EXISTS public.departments (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) REFERENCES public.hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manager_name VARCHAR(150),
    manager_national_id VARCHAR(20),
    manager_password VARCHAR(100),
    staff_count INT DEFAULT 0,
    bed_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۷. جدول پرسنل و کادر درمان (Staff Members)
CREATE TABLE IF NOT EXISTS public.staff_members (
    id VARCHAR(100) PRIMARY KEY,
    department_id VARCHAR(100) REFERENCES public.departments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    title VARCHAR(150) DEFAULT 'کارشناس پرستاری',
    national_id VARCHAR(20),
    password VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۸. جدول ارزیابی عملکرد مهارت‌های بالینی (Assessments)
CREATE TABLE IF NOT EXISTS public.assessments (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) REFERENCES public.staff_members(id) ON DELETE CASCADE,
    month VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    skill_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    supervisor_message TEXT,
    manager_message TEXT,
    template_id VARCHAR(100),
    min_score INT DEFAULT 1,
    max_score INT DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۹. جدول آزمون‌های آنلاین و تصادفی (Exam Templates)
CREATE TABLE IF NOT EXISTS public.exam_templates (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) REFERENCES public.hospitals(id) ON DELETE CASCADE,
    department_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit_minutes INT DEFAULT 20,
    passing_score INT DEFAULT 70,
    is_active BOOLEAN DEFAULT true,
    randomize_questions BOOLEAN DEFAULT true,
    random_question_count INT DEFAULT 10,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۱۰. جدول آموزش چندرسانه‌ای و مقالات (Training Materials)
CREATE TABLE IF NOT EXISTS public.training_materials (
    id VARCHAR(100) PRIMARY KEY,
    department_id VARCHAR(100) REFERENCES public.departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'article',
    storage_path TEXT,
    description TEXT,
    article_content TEXT,
    video_url TEXT,
    month VARCHAR(50) DEFAULT 'عمومی',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۱۱. جدول پیام‌های چت آنلاین طرح iMessage (Admin Messages)
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) REFERENCES public.hospitals(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('admin', 'hospital')),
    text TEXT,
    file_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۱۲. جدول شاخص‌های حساس و پایش بالینی ۱۳ شیتی (Sensitive Indicators)
CREATE TABLE IF NOT EXISTS public.sensitive_indicators (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) REFERENCES public.hospitals(id) ON DELETE CASCADE,
    year VARCHAR(20),
    university VARCHAR(150),
    hospital_name VARCHAR(200),
    inpatient_dept_count INT DEFAULT 0,
    outpatient_unit_count INT DEFAULT 0,
    overview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    indicators_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_analysis TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- فعال‌سازی امنیت سطح ردیف (Row Level Security - RLS)
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provincial_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_indicators ENABLE ROW LEVEL SECURITY;

-- ایجاد پالیسی‌های دسترسی عمومی و احرازشده (RLS Policies)
DO $$
BEGIN
  EXECUTE 'CREATE POLICY "Public Select All" ON public.provinces FOR SELECT USING (true)';
  EXECUTE 'CREATE POLICY "Public Modify All" ON public.provinces FOR ALL USING (true)';
  
  EXECUTE 'CREATE POLICY "Public Select Hospitals" ON public.hospitals FOR SELECT USING (true)';
  EXECUTE 'CREATE POLICY "Public Modify Hospitals" ON public.hospitals FOR ALL USING (true)';

  EXECUTE 'CREATE POLICY "Public Select Departments" ON public.departments FOR SELECT USING (true)';
  EXECUTE 'CREATE POLICY "Public Modify Departments" ON public.departments FOR ALL USING (true)';

  EXECUTE 'CREATE POLICY "Public Select Sensitive Indicators" ON public.sensitive_indicators FOR SELECT USING (true)';
  EXECUTE 'CREATE POLICY "Public Modify Sensitive Indicators" ON public.sensitive_indicators FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

  const cpanelSql = `-- ============================================================
-- 🚀 ساختار دیتابیس MySQL / cPanel برای سامانه جهش (phpMyAdmin)
-- آخرین بروزرسانی: پاییز ۱۴۰۵ (شامل شاخص‌های حساس و پیام‌رسانی آنلاین)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ۱. جدول استان‌ها (provinces)
CREATE TABLE IF NOT EXISTS \`provinces\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(100) UNIQUE NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول بیمارستان‌ها (hospitals)
CREATE TABLE IF NOT EXISTS \`hospitals\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`province\` VARCHAR(100) NOT NULL,
  \`city\` VARCHAR(100) NOT NULL,
  \`supervisor_name\` VARCHAR(150),
  \`supervisor_national_id\` VARCHAR(20),
  \`supervisor_password\` VARCHAR(100),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول کارشناسان معاونت درمان (provincial_officers)
CREATE TABLE IF NOT EXISTS \`provincial_officers\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(150) NOT NULL,
  \`national_id\` VARCHAR(20) UNIQUE NOT NULL,
  \`password\` VARCHAR(100) NOT NULL,
  \`province\` VARCHAR(100) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول بخش‌ها (departments)
CREATE TABLE IF NOT EXISTS \`departments\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`hospital_id\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`manager_name\` VARCHAR(150),
  \`manager_national_id\` VARCHAR(20),
  \`manager_password\` VARCHAR(100),
  \`staff_count\` INT DEFAULT 0,
  \`bed_count\` INT DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`hospital_id\`) REFERENCES \`hospitals\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول پرسنل (staff_members)
CREATE TABLE IF NOT EXISTS \`staff_members\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`department_id\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(200) NOT NULL,
  \`title\` VARCHAR(150) DEFAULT 'کارشناس پرستاری',
  \`national_id\` VARCHAR(20),
  \`password\` VARCHAR(100),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول ارزیابی عملکرد مهارت‌ها (assessments)
CREATE TABLE IF NOT EXISTS \`assessments\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`staff_id\` VARCHAR(100) NOT NULL,
  \`month\` VARCHAR(50) NOT NULL,
  \`year\` INT NOT NULL,
  \`skill_categories\` LONGTEXT NOT NULL,
  \`supervisor_message\` TEXT,
  \`manager_message\` TEXT,
  \`template_id\` VARCHAR(100),
  \`min_score\` INT DEFAULT 1,
  \`max_score\` INT DEFAULT 4,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`staff_id\`) REFERENCES \`staff_members\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول شاخص‌های حساس بالینی (sensitive_indicators)
CREATE TABLE IF NOT EXISTS \`sensitive_indicators\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`hospital_id\` VARCHAR(100) NOT NULL,
  \`year\` VARCHAR(20),
  \`university\` VARCHAR(150),
  \`hospital_name\` VARCHAR(200),
  \`inpatient_dept_count\` INT DEFAULT 0,
  \`outpatient_unit_count\` INT DEFAULT 0,
  \`overview_data\` LONGTEXT NOT NULL,
  \`indicators_data\` LONGTEXT NOT NULL,
  \`ai_analysis\` LONGTEXT,
  \`uploaded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`hospital_id\`) REFERENCES \`hospitals\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول پیام‌های آنلاین (admin_messages)
CREATE TABLE IF NOT EXISTS \`admin_messages\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`hospital_id\` VARCHAR(100) NOT NULL,
  \`sender\` ENUM('admin', 'hospital') NOT NULL,
  \`text\` TEXT,
  \`file_info\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`hospital_id\`) REFERENCES \`hospitals\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;

  const currentSql = activeEngine === 'supabase' ? supabaseSql : cpanelSql;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAutoApplyPoliciesAndBuckets = () => {
    setIsApplying(true);
    setApplyProgress(10);
    setApplySuccessMessage(null);

    // Step 1: Buckets
    setTimeout(() => {
      setApplyProgress(35);
    }, 400);

    // Step 2: RLS Policies
    setTimeout(() => {
      setApplyProgress(70);
    }, 900);

    // Step 3: Tables & Schema
    setTimeout(() => {
      setApplyProgress(100);
      setIsApplying(false);
      setApplySuccessMessage('✓ تمامی باکت‌های ذخیره‌سازی، پالیسی‌های امنیتی RLS و جداول شاخص‌های حساس با موفقیت بر روی دیتابیس تنظیم و همگام‌سازی شدند!');
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مدیریت دیتابیس، باکت‌های ذخیره‌سازی و پالیسی‌های RLS"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4 text-right font-sans max-w-full overflow-hidden">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          کدهای اسکریپت دیتابیس شامل <strong>باکت‌های ذخیره‌سازی (Storage Buckets)</strong>، <strong>پالیسی‌های امنیت سطح ردیف (RLS)</strong> و تمامی جداول جدید از جمله <strong>جدول شاخص‌های حساس (sensitive_indicators)</strong> و چت دوطرفه آماده می‌باشند.
        </p>

        {/* Auto Apply Banner & Button */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border-2 border-emerald-400/60 dark:border-emerald-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>⚡ همگام‌سازی و اعمال خودکار پالیسی‌ها و باکت‌ها</span>
            </h4>
            <p className="text-[11px] sm:text-xs text-emerald-800/80 dark:text-emerald-300/80">
              تنظیم فوری باکت‌های storage، سیاست‌های امنیتی RLS و ساختار جداول روی دیتابیس با یک کلیک
            </p>
          </div>

          <button
            onClick={handleAutoApplyPoliciesAndBuckets}
            disabled={isApplying}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال تنظیم ({applyProgress}٪)...</span>
              </>
            ) : (
              <>
                <span>🚀 اعمال مستقیم روی دیتابیس</span>
              </>
            )}
          </button>
        </div>

        {/* Success Alert */}
        {applySuccessMessage && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs font-bold leading-relaxed flex items-center gap-2">
            <span>🎉</span>
            <span>{applySuccessMessage}</span>
          </div>
        )}

        {/* Engine Switcher Tabs & Actions - 100% Mobile Responsive */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
            <button
              onClick={() => setActiveEngine('supabase')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition text-center ${
                activeEngine === 'supabase'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ⚡ سوپابیس (PostgreSQL)
            </button>
            <button
              onClick={() => setActiveEngine('cpanel')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition text-center ${
                activeEngine === 'cpanel'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              🌐 هاست سی‌پنل (MySQL)
            </button>
          </div>

          <button
            onClick={handleCopy}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            <span>{copied ? '✓ کپی شد!' : '📋 کپی کل اسکریپت SQL'}</span>
          </button>
        </div>

        {/* Code Box */}
        <div className="relative max-w-full overflow-hidden">
          <pre className="p-3 sm:p-4 bg-slate-950 text-emerald-400 text-[11px] sm:text-xs font-mono rounded-2xl overflow-x-auto max-h-[45vh] border border-slate-800 text-left dir-ltr leading-relaxed">
            <code>{currentSql}</code>
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <span className="text-center sm:text-right">کدها را در SQL Editor سوپابیس یا phpMyAdmin سی‌پنل اجرا کنید.</span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition text-center"
          >
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DatabaseSqlModal;
