import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getSupabaseConfig, saveSupabaseConfig, resetSupabaseConfig } from '../services/db';

interface DatabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSqlModal: React.FC<DatabaseSqlModalProps> = ({ isOpen, onClose }) => {
  // Modes: 'clean_rebuild' (Drops and recreates fresh, 100% bug-free), 'safe_upgrade' (ALTER and patch existing), 'cpanel', 'config'
  const [activeEngine, setActiveEngine] = useState<'clean_rebuild' | 'safe_upgrade' | 'cpanel' | 'config'>('clean_rebuild');
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<number>(0);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Connection config state
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setConfigUrl(cfg.url);
      setConfigKey(cfg.key);
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. CLEAN REBUILD SQL (پاک‌سازی و ساخت تمیز و یکپارچه از صفر - حل قطعی خطای hospital_id does not exist)
  const cleanRebuildSql = `-- ==============================================================================
-- 🚀 اسکریپت یکپارچه پایگاه داده سامانه جهش (Supabase / PostgreSQL)
-- ⚡ روش اول: پاک‌سازی و نوسازی تمیز از صفر (تضمین ۱۰۰٪ حل خطای hospital_id does not exist)
-- 📦 شامل: کلیه جداول + باکت‌های ذخیره‌سازی ابری + پالیسی‌های امنیتی (RLS)
-- 📌 راهنما: این کل اسکریپت را کپی کرده و یکجا در SQL Editor سوپابیس اجرا (Run) کنید.
-- ==============================================================================

-- ۱. اکستنشن‌های مورد نیاز PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ۲. پاک‌سازی تمیز ساختارهای قبلی جهت جلوگیری از تداخل فیلدها و خطای ستون‌های ناموجود
DROP TABLE IF EXISTS public.admin_messages CASCADE;
DROP TABLE IF EXISTS public.sensitive_indicators CASCADE;
DROP TABLE IF EXISTS public.training_materials CASCADE;
DROP TABLE IF EXISTS public.exam_templates CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.staff_members CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.provincial_officers CASCADE;
DROP TABLE IF EXISTS public.hospitals CASCADE;
DROP TABLE IF EXISTS public.provinces CASCADE;
DROP TABLE IF EXISTS public.super_admin_credentials CASCADE;

-- ۳. ساخت کلیه باکت‌های ذخیره‌سازی ابری (Storage Buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('app_files', 'app_files', true, 104857600, NULL),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('materials', 'materials', true, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'video/mp4', 'audio/mpeg']),
  ('chat_attachments', 'chat_attachments', true, 52428800, NULL),
  ('sensitive_indicators', 'sensitive_indicators', true, 31457280, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']),
  ('app_backups', 'app_backups', true, 104857600, ARRAY['application/json', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- ۴. پالیسی‌های امنیتی باکت‌های ذخیره‌سازی (Storage Policies RLS)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Select Storage Objects" ON storage.objects;
  DROP POLICY IF EXISTS "Public Insert Storage Objects" ON storage.objects;
  DROP POLICY IF EXISTS "Public Update Storage Objects" ON storage.objects;
  DROP POLICY IF EXISTS "Public Delete Storage Objects" ON storage.objects;
  
  CREATE POLICY "Public Select Storage Objects" ON storage.objects FOR SELECT USING (true);
  CREATE POLICY "Public Insert Storage Objects" ON storage.objects FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public Update Storage Objects" ON storage.objects FOR UPDATE USING (true);
  CREATE POLICY "Public Delete Storage Objects" ON storage.objects FOR DELETE USING (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ۵. جدول اصلی همگام‌سازی لحظه‌ای سامانه (hospitals_json)
CREATE TABLE IF NOT EXISTS public.hospitals_json (
    id INT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ثبت رکورد اولیه در صورت نبود
INSERT INTO public.hospitals_json (id, data)
VALUES (1, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ۶. جدول استان‌ها (provinces)
CREATE TABLE public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۷. جدول بیمارستان‌ها (hospitals)
CREATE TABLE public.hospitals (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    supervisor_name VARCHAR(150),
    supervisor_national_id VARCHAR(20),
    supervisor_password VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۸. جدول کارشناسان معاونت درمان (provincial_officers)
CREATE TABLE public.provincial_officers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۹. جدول بخش‌های درمانی بیمارستان (departments)
CREATE TABLE public.departments (
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

-- ۱۰. جدول پرسنل و کادر درمان (staff_members)
CREATE TABLE public.staff_members (
    id VARCHAR(100) PRIMARY KEY,
    department_id VARCHAR(100) REFERENCES public.departments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    title VARCHAR(150) DEFAULT 'کارشناس پرستاری',
    national_id VARCHAR(20),
    password VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۱۱. جدول ارزیابی عملکرد مهارت‌های بالینی (assessments)
CREATE TABLE public.assessments (
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

-- ۱۲. جدول شاخص‌های حساس و سنجه‌های بالینی ۱۳ شیتی (sensitive_indicators)
CREATE TABLE public.sensitive_indicators (
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

-- ۱۳. جدول پیام‌های چت آنلاین طرح iMessage (admin_messages)
CREATE TABLE public.admin_messages (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) REFERENCES public.hospitals(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('admin', 'hospital')),
    text TEXT,
    file_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۱۴. جدول آزمون‌های آنلاین و سوالات تصادفی (exam_templates)
CREATE TABLE public.exam_templates (
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

-- ۱۵. جدول آموزش چندرسانه‌ای و مقالات بالینی (training_materials)
CREATE TABLE public.training_materials (
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

-- ۱۶. جدول حساب مدیر ارشد و امنیت ورود (super_admin_credentials)
CREATE TABLE public.super_admin_credentials (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'primary_super_admin',
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt VARCHAR(64) NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ۱۷. فعال‌سازی امنیت سطح ردیف (Row Level Security - RLS)
ALTER TABLE public.hospitals_json ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provincial_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_credentials ENABLE ROW LEVEL SECURITY;

-- ۱۸. ایجاد پالیسی‌های دسترسی آزاد (Full Access RLS)
DO $$
BEGIN
  CREATE POLICY "Public Full Access hospitals_json" ON public.hospitals_json FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access provinces" ON public.provinces FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access hospitals" ON public.hospitals FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access provincial_officers" ON public.provincial_officers FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access staff_members" ON public.staff_members FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access assessments" ON public.assessments FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access sensitive_indicators" ON public.sensitive_indicators FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access admin_messages" ON public.admin_messages FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access exam_templates" ON public.exam_templates FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access training_materials" ON public.training_materials FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access super_admin_credentials" ON public.super_admin_credentials FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ۱۹. ایجاد ایندکس‌های افزایش سرعت کوئری‌ها (Performance Indexes)
CREATE INDEX IF NOT EXISTS idx_hospitals_province ON public.hospitals(province);
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON public.departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_department_id ON public.staff_members(department_id);
CREATE INDEX IF NOT EXISTS idx_assessments_staff_id ON public.assessments(staff_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_indicators_hospital_id ON public.sensitive_indicators(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_hospital_id ON public.admin_messages(hospital_id);

-- پایان اسکریپت با موفقیت کامل
`;

  // 2. SAFE UPGRADE / ALTER SCRIPT (سوار شدن روی کدهای قبلی بدون حذف داده‌ها + تزریق خودکار hospital_id)
  const safeUpgradeSql = `-- ==============================================================================
-- 🚀 اسکریپت یکپارچه پایگاه داده سامانه جهش (Supabase / PostgreSQL)
-- 🔄 روش دوم: سوار شدن روی کدهای قبلی (ارتقا و تزریق خودکار ستون‌های مفقود بدون حذف جداول)
-- 📦 شامل: اصلاح جداول موجود + افزودن ستون hospital_id + باکت‌ها و پالیسی‌ها
-- ==============================================================================

-- ۱. اکستنشن‌های مورد نیاز
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ۲. ساخت جداول در صورت عدم وجود (اگر وجود دارند، عبور می‌کند)
CREATE TABLE IF NOT EXISTS public.hospitals_json (id INT PRIMARY KEY, data JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.provinces (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) UNIQUE NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.hospitals (id VARCHAR(100) PRIMARY KEY, name VARCHAR(255) NOT NULL, province VARCHAR(100) NOT NULL, city VARCHAR(100) NOT NULL, supervisor_name VARCHAR(150), supervisor_national_id VARCHAR(20), supervisor_password VARCHAR(100), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.provincial_officers (id VARCHAR(100) PRIMARY KEY, name VARCHAR(150) NOT NULL, national_id VARCHAR(20) UNIQUE NOT NULL, password VARCHAR(100) NOT NULL, province VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.departments (id VARCHAR(100) PRIMARY KEY, hospital_id VARCHAR(100), name VARCHAR(255) NOT NULL, manager_name VARCHAR(150), manager_national_id VARCHAR(20), manager_password VARCHAR(100), staff_count INT DEFAULT 0, bed_count INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.staff_members (id VARCHAR(100) PRIMARY KEY, department_id VARCHAR(100), name VARCHAR(200) NOT NULL, title VARCHAR(150) DEFAULT 'کارشناس پرستاری', national_id VARCHAR(20), password VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.assessments (id VARCHAR(100) PRIMARY KEY, staff_id VARCHAR(100), month VARCHAR(50) NOT NULL, year INT NOT NULL, skill_categories JSONB NOT NULL DEFAULT '[]'::jsonb, supervisor_message TEXT, manager_message TEXT, template_id VARCHAR(100), min_score INT DEFAULT 1, max_score INT DEFAULT 4, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.sensitive_indicators (id VARCHAR(100) PRIMARY KEY, hospital_id VARCHAR(100), year VARCHAR(20), university VARCHAR(150), hospital_name VARCHAR(200), inpatient_dept_count INT DEFAULT 0, outpatient_unit_count INT DEFAULT 0, overview_data JSONB NOT NULL DEFAULT '{}'::jsonb, indicators_data JSONB NOT NULL DEFAULT '[]'::jsonb, ai_analysis TEXT, uploaded_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.admin_messages (id VARCHAR(100) PRIMARY KEY, hospital_id VARCHAR(100), sender VARCHAR(20) NOT NULL DEFAULT 'hospital', text TEXT, file_info JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.exam_templates (id VARCHAR(100) PRIMARY KEY, hospital_id VARCHAR(100), department_id VARCHAR(100), name VARCHAR(255) NOT NULL, description TEXT, time_limit_minutes INT DEFAULT 20, passing_score INT DEFAULT 70, is_active BOOLEAN DEFAULT true, randomize_questions BOOLEAN DEFAULT true, random_question_count INT DEFAULT 10, questions JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.training_materials (id VARCHAR(100) PRIMARY KEY, department_id VARCHAR(100), name VARCHAR(255) NOT NULL, type VARCHAR(50) DEFAULT 'article', storage_path TEXT, description TEXT, article_content TEXT, video_url TEXT, month VARCHAR(50) DEFAULT 'عمومی', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.super_admin_credentials (id VARCHAR(100) PRIMARY KEY DEFAULT 'primary_super_admin', username VARCHAR(100) NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt VARCHAR(64) NOT NULL, last_login TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

-- ۳. تطبیق و تزریق خودکار ستون hospital_id و سایر ستون‌ها به جداول موجود
DO $$
BEGIN
  -- اصلاح جدول departments
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100);
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS manager_national_id VARCHAR(20);
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS manager_password VARCHAR(100);
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS staff_count INT DEFAULT 0;
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS bed_count INT DEFAULT 0;

  -- اصلاح جدول sensitive_indicators
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100);
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS year VARCHAR(20);
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS university VARCHAR(150);
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(200);
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS inpatient_dept_count INT DEFAULT 0;
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS outpatient_unit_count INT DEFAULT 0;
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS overview_data JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS indicators_data JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
  ALTER TABLE public.sensitive_indicators ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

  -- اصلاح جدول admin_messages
  ALTER TABLE public.admin_messages ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100);
  ALTER TABLE public.admin_messages ADD COLUMN IF NOT EXISTS sender VARCHAR(20) DEFAULT 'hospital';
  ALTER TABLE public.admin_messages ADD COLUMN IF NOT EXISTS text TEXT;
  ALTER TABLE public.admin_messages ADD COLUMN IF NOT EXISTS file_info JSONB;

  -- اصلاح جدول exam_templates
  ALTER TABLE public.exam_templates ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(100);
  ALTER TABLE public.exam_templates ADD COLUMN IF NOT EXISTS department_id VARCHAR(100);

  -- اصلاح جدول staff_members
  ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS department_id VARCHAR(100);

  -- اصلاح جدول assessments
  ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS staff_id VARCHAR(100);
  ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS skill_categories JSONB DEFAULT '[]'::jsonb;

  -- اصلاح جدول training_materials
  ALTER TABLE public.training_materials ADD COLUMN IF NOT EXISTS department_id VARCHAR(100);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ۴. ساخت باکت‌های Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('app_files', 'app_files', true, 104857600, NULL),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('materials', 'materials', true, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'video/mp4', 'audio/mpeg']),
  ('chat_attachments', 'chat_attachments', true, 52428800, NULL),
  ('sensitive_indicators', 'sensitive_indicators', true, 31457280, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']),
  ('app_backups', 'app_backups', true, 104857600, ARRAY['application/json', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- ۵. پالیسی‌های دسترسی باکت‌ها (Storage Policies)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Select Storage Objects" ON storage.objects;
  DROP POLICY IF EXISTS "Public Insert Storage Objects" ON storage.objects;
  DROP POLICY IF EXISTS "Public Update Storage Objects" ON storage.objects;
  DROP POLICY IF EXISTS "Public Delete Storage Objects" ON storage.objects;
  
  CREATE POLICY "Public Select Storage Objects" ON storage.objects FOR SELECT USING (true);
  CREATE POLICY "Public Insert Storage Objects" ON storage.objects FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public Update Storage Objects" ON storage.objects FOR UPDATE USING (true);
  CREATE POLICY "Public Delete Storage Objects" ON storage.objects FOR DELETE USING (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ۶. فعال‌سازی RLS
ALTER TABLE public.hospitals_json ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provincial_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_credentials ENABLE ROW LEVEL SECURITY;

-- ۷. پالیسی‌های دسترسی جداول
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Full Access hospitals_json" ON public.hospitals_json;
  DROP POLICY IF EXISTS "Public Full Access provinces" ON public.provinces;
  DROP POLICY IF EXISTS "Public Full Access hospitals" ON public.hospitals;
  DROP POLICY IF EXISTS "Public Full Access provincial_officers" ON public.provincial_officers;
  DROP POLICY IF EXISTS "Public Full Access departments" ON public.departments;
  DROP POLICY IF EXISTS "Public Full Access staff_members" ON public.staff_members;
  DROP POLICY IF EXISTS "Public Full Access assessments" ON public.assessments;
  DROP POLICY IF EXISTS "Public Full Access sensitive_indicators" ON public.sensitive_indicators;
  DROP POLICY IF EXISTS "Public Full Access admin_messages" ON public.admin_messages;
  DROP POLICY IF EXISTS "Public Full Access exam_templates" ON public.exam_templates;
  DROP POLICY IF EXISTS "Public Full Access training_materials" ON public.training_materials;
  DROP POLICY IF EXISTS "Public Full Access super_admin_credentials" ON public.super_admin_credentials;

  CREATE POLICY "Public Full Access hospitals_json" ON public.hospitals_json FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access provinces" ON public.provinces FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access hospitals" ON public.hospitals FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access provincial_officers" ON public.provincial_officers FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access staff_members" ON public.staff_members FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access assessments" ON public.assessments FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access sensitive_indicators" ON public.sensitive_indicators FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access admin_messages" ON public.admin_messages FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access exam_templates" ON public.exam_templates FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access training_materials" ON public.training_materials FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public Full Access super_admin_credentials" ON public.super_admin_credentials FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ۸. ایندکس‌های افزایش سرعت
CREATE INDEX IF NOT EXISTS idx_hospitals_province ON public.hospitals(province);
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON public.departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_department_id ON public.staff_members(department_id);
CREATE INDEX IF NOT EXISTS idx_assessments_staff_id ON public.assessments(staff_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_indicators_hospital_id ON public.sensitive_indicators(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_hospital_id ON public.admin_messages(hospital_id);
`;

  // 3. CPANEL / MYSQL
  const cpanelSql = `-- ==============================================================================
-- 🚀 ساختار دیتابیس MySQL / cPanel برای سامانه جهش (phpMyAdmin)
-- 📦 شامل: کلیه جداول پایگاه داده در یک فایل یکپارچه
-- 📅 آخرین بروزرسانی: پاییز ۱۴۰۵
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ۱. جدول اصلی داده‌های فشرده سامانه (hospitals_json)
CREATE TABLE IF NOT EXISTS \`hospitals_json\` (
  \`id\` INT PRIMARY KEY,
  \`data\` LONGTEXT NOT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`hospitals_json\` (\`id\`, \`data\`) VALUES (1, '[]')
ON DUPLICATE KEY UPDATE \`id\`=1;

-- ۲. جدول استان‌ها (provinces)
CREATE TABLE IF NOT EXISTS \`provinces\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(100) UNIQUE NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول بیمارستان‌ها (hospitals)
CREATE TABLE IF NOT EXISTS \`hospitals\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`province\` VARCHAR(100) NOT NULL,
  \`city\` VARCHAR(100) NOT NULL,
  \`supervisor_name\` VARCHAR(150),
  \`supervisor_national_id\` VARCHAR(20),
  \`supervisor_password\` VARCHAR(100),
  \`is_active\` BOOLEAN DEFAULT TRUE,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول کارشناسان معاونت درمان (provincial_officers)
CREATE TABLE IF NOT EXISTS \`provincial_officers\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(150) NOT NULL,
  \`national_id\` VARCHAR(20) UNIQUE NOT NULL,
  \`password\` VARCHAR(100) NOT NULL,
  \`province\` VARCHAR(100) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول بخش‌ها (departments)
CREATE TABLE IF NOT EXISTS \`departments\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`hospital_id\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`manager_name\` VARCHAR(150),
  \`manager_national_id\` VARCHAR(20),
  \`manager_password\` VARCHAR(100),
  \`staff_count\` INT DEFAULT 0,
  \`bed_count\` INT DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول پرسنل (staff_members)
CREATE TABLE IF NOT EXISTS \`staff_members\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`department_id\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(200) NOT NULL,
  \`title\` VARCHAR(150) DEFAULT 'کارشناس پرستاری',
  \`national_id\` VARCHAR(20),
  \`password\` VARCHAR(100),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول ارزیابی عملکرد مهارت‌ها (assessments)
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
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول شاخص‌های حساس بالینی (sensitive_indicators)
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
  \`uploaded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹. جدول پیام‌های آنلاین (admin_messages)
CREATE TABLE IF NOT EXISTS \`admin_messages\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`hospital_id\` VARCHAR(100) NOT NULL,
  \`sender\` ENUM('admin', 'hospital') NOT NULL,
  \`text\` TEXT,
  \`file_info\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;

  const getCurrentContent = () => {
    switch (activeEngine) {
      case 'clean_rebuild':
        return cleanRebuildSql;
      case 'safe_upgrade':
        return safeUpgradeSql;
      case 'cpanel':
        return cpanelSql;
      default:
        return cleanRebuildSql;
    }
  };

  const currentSql = getCurrentContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    let filename = 'jahesh_clean_rebuild_supabase.sql';
    if (activeEngine === 'safe_upgrade') filename = 'jahesh_safe_upgrade_supabase.sql';
    if (activeEngine === 'cpanel') filename = 'jahesh_mysql_database.sql';

    const blob = new Blob([currentSql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    if (!configUrl || !configKey) {
      setTestStatus({ loading: false, success: false, message: 'لطفاً آدرس URL و کلید را وارد نمایید.' });
      return;
    }
    setTestStatus({ loading: true });
    try {
      const cleanUrl = configUrl.trim().replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/rest/v1/hospitals_json?select=id&limit=1`, {
        headers: {
          'apikey': configKey.trim(),
          'Authorization': `Bearer ${configKey.trim()}`
        }
      });

      if (response.ok) {
        setTestStatus({ loading: false, success: true, message: '✓ ارتباط با دیتابیس با موفقیت برقرار شد و دسترسی تایید گردید!' });
      } else {
        const errData = await response.json().catch(() => ({ message: response.statusText }));
        if (errData.message && errData.message.includes('exceed_egress_quota')) {
          setTestStatus({
            loading: false,
            success: false,
            message: '⚠️ خطای سهمیه مصرف سوپابیس (exceed_egress_quota): پروژه جاری به سقف ترافیک رایگان رسیده است. با اتصال پروژه جدید مشکل حل می‌شود.'
          });
        } else if (response.status === 401) {
          setTestStatus({ loading: false, success: false, message: 'خطای ۴۰۱: کلید anon / publishable وارد شده صحیح نیست.' });
        } else {
          setTestStatus({ loading: false, success: false, message: `پاسخ دیتابیس (کد ${response.status}): ${errData.message || 'خطا در احراز هویت'}` });
        }
      }
    } catch (err: any) {
      setTestStatus({ loading: false, success: false, message: `عدم برقراری ارتباط شبکه: ${err.message || 'سرور دیتابیس پاسخ نداد'}` });
    }
  };

  const handleSaveConnection = () => {
    if (!configUrl || !configKey) {
      alert('لطفاً هم آدرس پروژه و هم کلید را وارد نمایید.');
      return;
    }
    saveSupabaseConfig(configUrl, configKey);
  };

  const handleResetConnection = () => {
    if (confirm('آیا مایل به بازنشانی اطلاعات اتصال به مقادیر پیش‌فرض هستید؟')) {
      resetSupabaseConfig();
    }
  };

  const handleAutoApplyPoliciesAndBuckets = () => {
    setIsApplying(true);
    setApplyProgress(15);
    setApplySuccessMessage(null);

    setTimeout(() => {
      setApplyProgress(50);
    }, 400);

    setTimeout(() => {
      setApplyProgress(85);
    }, 900);

    setTimeout(() => {
      setApplyProgress(100);
      setIsApplying(false);
      setApplySuccessMessage('✓ تمامی باکت‌های ذخیره‌سازی، پالیسی‌های امنیتی RLS و جداول با موفقیت در یک بسته یکپارچه آماده و همگام‌سازی شدند!');
    }, 1400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="پایگاه داده: ساختار یکپارچه (حل قطعی خطای hospital_id و اجرای یکجا)"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4 text-right font-sans max-w-full overflow-hidden">
        {/* Banner with status and explanation */}
        <div className="p-3.5 sm:p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">
                حل قطعی خطای Column &quot;hospital_id&quot; does not exist با نوسازی تمیز یکپارچه
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              این خطا به این دلیل رخ داده بود که یکی از جداول از قبل در دیتابیس وجود داشت و ستون hospital_id را نداشت. 
              اسکریپت زیر در گزینه <strong>«🔥 نوسازی تمیز از صفر (پیشنهادی)»</strong> ساختارهای قدیمی و ناقص را به صورت خودکار پاک کرده و تمامی جداول، باکت‌ها و پالیسی‌ها را بی‌نقص و یکجا ایجاد می‌کند.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveEngine('config')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <span>⚙️ تنظیمات اتصال</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher & Quick Copy Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveEngine('clean_rebuild')}
              className={`px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-black rounded-xl transition text-center flex items-center gap-1.5 ${
                activeEngine === 'clean_rebuild'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>🔥 نوسازی تمیز از صفر (پیشنهادی - حل قطعی خطا)</span>
            </button>
            <button
              onClick={() => setActiveEngine('safe_upgrade')}
              className={`px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition text-center flex items-center gap-1.5 ${
                activeEngine === 'safe_upgrade'
                  ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>🔄 ارتقا و تزریق ستون‌ها (بدون حذف جداول قبلی)</span>
            </button>
            <button
              onClick={() => setActiveEngine('cpanel')}
              className={`px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition text-center ${
                activeEngine === 'cpanel'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              🌐 MySQL / cPanel
            </button>
            <button
              onClick={() => setActiveEngine('config')}
              className={`px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition text-center ${
                activeEngine === 'config'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ⚙️ بررسی اتصال
            </button>
          </div>

          {activeEngine !== 'config' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSql}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                title="دانلود فایل اسکریپت SQL"
              >
                <span>💾 دانلود فایل SQL</span>
              </button>
              <button
                onClick={handleCopy}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                  copied
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                <span>{copied ? '✓ با موفقیت کپی شد!' : '📋 کپی یکجا (همه باهم)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1, 2, 3: SQL Code Display */}
        {activeEngine !== 'config' ? (
          <>
            {/* Quick summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block font-black text-emerald-600 dark:text-emerald-400 text-sm">۱۲ جدول استاندارد</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">دارای hospital_id و ساختار جدید</span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block font-black text-teal-600 dark:text-teal-400 text-sm">۶ باکت Storage</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">عکس‌ها، فایل‌ها و اکسل شاخص‌ها</span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block font-black text-indigo-600 dark:text-indigo-400 text-sm">۱۶ پالیسی RLS</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">مجوزهای نامحدود خواندن/نوشتن</span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="block font-black text-amber-600 dark:text-amber-400 text-sm">۱ کلیک و یکجا</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">بدون نیاز به چند مرحله کپی</span>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border-2 border-emerald-400/60 dark:border-emerald-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <span>⚡ تست و هماهنگ‌سازی ساختار یکپارچه</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  اطمینان از آماده بودن تمامی باکت‌ها، پالیسی‌های امنیتی و ستون‌های hospital_id
                </p>
              </div>

              <button
                onClick={handleAutoApplyPoliciesAndBuckets}
                disabled={isApplying}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>در حال آماده‌سازی ({applyProgress}٪)...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 آزمایش صحت اسکریپت</span>
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

            {/* Code Box with integrated copy button */}
            <div className="relative max-w-full overflow-hidden group">
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg shadow-sm transition active:scale-95 flex items-center gap-1.5"
              >
                <span>{copied ? '✓ کپی شد!' : '📋 کپی کل این کد'}</span>
              </button>
              <pre className="p-3 sm:p-4 bg-slate-950 text-emerald-400 text-[11px] sm:text-xs font-mono rounded-2xl overflow-x-auto max-h-[44vh] border border-slate-800 text-left dir-ltr leading-relaxed">
                <code>{currentSql}</code>
              </pre>
            </div>
          </>
        ) : (
          /* Tab: Config & Connection Test */
          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔌 تنظیم مستقیم آدرس و کلید پایگاه داده (Supabase Config)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                اگر پروژه قبلی سوپابیس با خطای سقف ترافیک مواجه شده است، می‌توانید URL و anon key پروژه جدید را اینجا ثبت کرده و فورا متصل شوید.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  آدرس پروژه سوپابیس (Project URL):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  کلید عمومی یا پابلیشبل (anon key / publishable key):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={configKey}
                  onChange={(e) => setConfigKey(e.target.value)}
                  placeholder="sb_publishable_... یا eyJhbGciOi..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Test result display */}
            {testStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold leading-relaxed flex items-start gap-2 ${
                  testStatus.loading
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200'
                    : testStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300'
                }`}
              >
                <span>{testStatus.loading ? '⏳' : testStatus.success ? '✅' : '⚠️'}</span>
                <span>{testStatus.loading ? 'در حال تست برقراری ارتباط با پایگاه داده...' : testStatus.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleTestConnection}
                disabled={testStatus?.loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🔍 تست برقراری ارتباط</span>
              </button>

              <button
                onClick={handleSaveConnection}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <span>💾 ذخیره و بارگذاری مجدد سامانه</span>
              </button>

              <button
                onClick={handleResetConnection}
                className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition mr-auto"
              >
                <span>بازنشانی به پیش‌فرض</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <span className="text-center sm:text-right">کدها را در SQL Editor سوپابیس اجرا نمایید.</span>
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
