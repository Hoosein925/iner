import React, { useState } from 'react';
import Modal from './Modal';
import { AppAboutInfo } from '../types';

interface EditAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  aboutInfo: AppAboutInfo;
  onSaveAboutInfo: (info: AppAboutInfo) => void;
}

export const EditAboutModal: React.FC<EditAboutModalProps> = ({
  isOpen,
  onClose,
  aboutInfo,
  onSaveAboutInfo,
}) => {
  const [title, setTitle] = useState(aboutInfo.title);
  const [description, setDescription] = useState(aboutInfo.description);
  const [featuresText, setFeaturesText] = useState(aboutInfo.features.join('\n'));
  const [closingPoem, setClosingPoem] = useState(aboutInfo.closingPoem || '');
  const [creatorName, setCreatorName] = useState(aboutInfo.creatorName);
  const [creatorEmail, setCreatorEmail] = useState(aboutInfo.creatorEmail);
  const [aparatUrl, setAparatUrl] = useState(aboutInfo.aparatUrl);
  const [version, setVersion] = useState(aboutInfo.version || '۲.۵');

  if (!isOpen) return null;

  const handleSave = () => {
    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    onSaveAboutInfo({
      title: title.trim(),
      description: description.trim(),
      features,
      closingPoem: closingPoem.trim(),
      creatorName: creatorName.trim(),
      creatorEmail: creatorEmail.trim(),
      aparatUrl: aparatUrl.trim(),
      version: version.trim(),
    });

    alert('اطلاعات بخش درباره سامانه با موفقیت به‌روزرسانی شد.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ویرایش و شخصی‌سازی بخش درباره سامانه (About Us)"
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4 text-right font-sans">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          متون و مشخصات وارد شده در این فرم مستقیماً در پنجره «درباره سامانه» و فوتر برنامه نمایش داده می‌شوند.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              عنوان سامانه:
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نسخه نرم‌افزار:
            </label>
            <input
              type="text"
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="مثال: پاییز ۱۴۰۵ - نسخه ۲.۵"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            متن معرفی و چشم‌انداز سامانه:
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            قابلیت‌های برجسته سامانه (هر ویژگی در یک خط):
          </label>
          <textarea
            value={featuresText}
            onChange={e => setFeaturesText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            سخن پایانی یا بیت شعر:
          </label>
          <textarea
            value={closingPoem}
            onChange={e => setClosingPoem(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نام پدیدآورنده / سازنده:
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={e => setCreatorName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ایمیل پشتیبانی:
            </label>
            <input
              type="email"
              value={creatorEmail}
              onChange={e => setCreatorEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              آدرس کانال آپارات:
            </label>
            <input
              type="text"
              value={aparatUrl}
              onChange={e => setAparatUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            انصراف
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
          >
            ✓ ذخیره تغییرات درباره سامانه
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditAboutModal;
