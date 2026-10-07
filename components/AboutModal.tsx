import React from 'react';
import Modal from './Modal';
import { AparatIcon } from './icons/AparatIcon';
import { EmailIcon } from './icons/EmailIcon';
import { AppAboutInfo } from '../types';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  aboutInfo?: AppAboutInfo;
}

const DEFAULT_ABOUT_INFO: AppAboutInfo = {
  title: 'درباره سامانه جهش',
  description:
    'سامانه جهش یک پلتفرم پیشرفته و یکپارچه برای مدیریت هوشمند عملکرد و توانمندسازی پرسنل مراکز درمانی است. این سامانه با هدف دیجیتالی کردن فرآیندهای ارزیابی، آموزش و بهبود مستمر طراحی شده تا به مدیران در تصمیم‌گیری‌های مبتنی بر داده و به پرسنل در مسیر رشد حرفه‌ای خود کمک کند.',
  features: [
    'مدیریت جامع: تعریف و مدیریت همزمان چندین بیمارستان، بخش و پرسنل با سطوح دسترسی مختلف (ادمین، معاونت درمان، سوپروایزر، مسئول بخش).',
    'ارزیابی عملکرد: امکان بارگذاری چک‌لیست‌های عملکردی از طریق فایل اکسل یا ساخت قالب‌های سفارشی‌سازی‌شده درون برنامه برای ارزیابی دقیق مهارت‌ها.',
    'آزمون‌های آنلاین با سوالات تصادفی: طراحی و برگزاری آزمون‌های تئوری با گزینش رندوم سوالات و گزینه‌ها جهت ممانعت از تقلب.',
    'مدیریت آموزش چندرسانه‌ای: نگارش مقالات غنی آموزشی با امکانات Word و درج تصویر و فیلم با پلیر واکنش‌گرا.',
    'برنامه راهبردی و بهبود هوشمند: تدوین خودکار اکشن پلن‌های ۱، ۳، ۶ و ۱۲ ماهه مبتنی بر ۵ رفرنس بالینی و خروجی Word.',
    'تحلیل و گزارش‌دهی: مشاهده روند پیشرفت فردی و گروهی با نمودارهای تحلیلی و بصری.',
    'ذخیره‌سازی و امنیت داده: پشتیبانی از ذخیره‌سازی ابری و دیتابیس سوپابیس و سی‌پنل.',
  ],
  closingPoem: 'ستایش خداوندِ بخشنده را\nکه موجود کرد از عدم بنده را',
  creatorName: 'حسین نصاری',
  creatorEmail: 'ho3in.n12@gmail.com',
  aparatUrl: 'https://www.aparat.com/Amazing.Nurse/',
  version: 'نسخه ۲.۵ (پاییز ۱۴۰۵)',
};

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, aboutInfo }) => {
  const current = aboutInfo || DEFAULT_ABOUT_INFO;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={current.title} maxWidthClass="max-w-3xl">
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-right leading-relaxed font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold">
            {current.version}
          </span>
        </div>

        <p className="text-sm sm:text-base leading-relaxed">{current.description}</p>

        <div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
            قابلیت‌های برجسته سامانه:
          </h4>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm">
            {current.features.map((feat, idx) => (
              <li key={idx} className="leading-relaxed">
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {current.closingPoem && (
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
              سخن پایانی
            </h4>
            <blockquote className="text-center italic font-serif text-slate-500 dark:text-slate-400 border-r-4 border-slate-200 dark:border-slate-700 pr-4 whitespace-pre-line text-sm">
              {current.closingPoem}
            </blockquote>
          </div>
        )}
      </div>

      <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>سازنده و مدیر سامانه: {current.creatorName}</span>
          {current.creatorEmail && (
            <a
              href={`mailto:${current.creatorEmail}`}
              className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors font-mono"
            >
              <EmailIcon className="w-4 h-4" />
              <span>{current.creatorEmail}</span>
            </a>
          )}
        </div>
        {current.aparatUrl && (
          <div className="flex items-center gap-3">
            <span>جهت مشاهده کلیپ‌های آموزشی وارد کانال آپارات شوید:</span>
            <a
              href={current.aparatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <AparatIcon className="w-4 h-4" />
              <span>کانال آپارات</span>
            </a>
          </div>
        )}
      </footer>
    </Modal>
  );
};

export default AboutModal;

