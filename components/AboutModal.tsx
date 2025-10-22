import React from 'react';
import Modal from './Modal';
import { AparatIcon } from './icons/AparatIcon';
import { EmailIcon } from './icons/EmailIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="درباره سامانه بیمارستان من" maxWidthClass="max-w-3xl">
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-right leading-relaxed">
        <p>
          سامانه بیمارستان من یک پلتفرم پیشرفته و یکپارچه برای مدیریت هوشمند عملکرد و توانمندسازی پرسنل مراکز درمانی است. این سامانه با هدف دیجیتالی کردن فرآیندهای ارزیابی، آموزش و بهبود مستمر طراحی شده تا به مدیران در تصمیم‌گیری‌های مبتنی بر داده و به پرسنل در مسیر رشد حرفه‌ای خود کمک کند.
        </p>

        <div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">قابلیت‌های برجسته سامانه:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>مدیریت جامع:</strong> تعریف و مدیریت همزمان چندین بیمارستان، بخش و پرسنل با سطوح دسترسی مختلف (ادمین، سوپروایزر، مسئول بخش).</li>
            <li><strong>ارزیابی عملکرد:</strong> امکان بارگذاری چک‌لیست‌های عملکردی از طریق فایل اکسل یا ساخت قالب‌های سفارشی‌سازی‌شده درون برنامه برای ارزیابی دقیق مهارت‌ها.</li>
            <li><strong>آزمون‌های آنلاین:</strong> طراحی و برگزاری آزمون‌های تئوری (چهارگزینه‌ای و تشریحی) برای سنجش دانش پرسنل و مشاهده آنی نتایج.</li>
            <li><strong>مدیریت آموزش:</strong> بارگذاری و آرشیو محتواهای آموزشی (ویدئو، PDF، تصویر و...) به تفکیک ماه برای دسترسی آسان پرسنل.</li>
            <li><strong>تحلیل و گزارش‌دهی:</strong> مشاهده روند پیشرفت فردی و گروهی با نمودارهای تحلیلی و بصری.</li>
            <li><strong>برنامه بهبود هوشمند:</strong> ارائه خودکار برنامه مطالعاتی ۳۰ روزه بر اساس نقاط ضعف شناسایی‌شده در ارزیابی‌ها جهت توانمندسازی هدفمند.</li>
            <li><strong>ذخیره‌سازی و امنیت داده:</strong> قابلیت پشتیبان‌گیری و بازیابی اطلاعات در سطوح مختلف (بخش، بیمارستان یا کل داده‌ها) و عملکرد آفلاین برای دسترسی پایدار.</li>
          </ul>
        </div>
        
        <div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">سخن پایانی</h4>
            <blockquote className="text-center italic font-serif text-slate-500 dark:text-slate-400 border-r-4 border-slate-200 dark:border-slate-700 pr-4">
                <p>ستایش خداوندِ بخشنده را</p>
                <p>که موجود کرد از عدم بنده را</p>
            </blockquote>
        </div>

      </div>
      <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>سازنده: حسین نصاری</span>
          <a href="mailto:ho3in.n12@gmail.com" className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" aria-label="Email the creator">
            <EmailIcon className="w-5 h-5"/>
            <span>ho3in.n12@gmail.com</span>
          </a>
        </div>
        <div className="flex items-center gap-3">
            <span>جهت مشاهده کلیپ های آموزشی وارد کانال آپارات شوید :</span>
            <a href="https://www.aparat.com/Amazing.Nurse/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors" aria-label="Visit Aparat channel">
                <AparatIcon className="w-5 h-5"/>
                <span>کانال آپارات</span>
            </a>
        </div>
      </footer>
    </Modal>
  );
};

export default AboutModal;
