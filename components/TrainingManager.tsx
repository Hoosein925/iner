import React, { useState, useMemo } from 'react';
import { MonthlyTraining, TrainingMaterial } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon } from './icons/EditIcon';
import FileUploader from './FileUploader';
import PreviewModal from './PreviewModal';
import Modal from './Modal';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { AudioIcon } from './icons/AudioIcon';
import { PdfIcon } from './icons/PdfIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { BackIcon } from './icons/BackIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { PlusIcon } from './icons/PlusIcon';
import RichArticleEditor from './RichArticleEditor';

interface TrainingManagerProps {
  departmentId: string;
  monthlyTrainings: MonthlyTraining[];
  onAddMaterial: (departmentId: string, month: string, fileData: {
    name: string;
    type: string;
    dataUrl: string;
    description?: string;
    articleContent?: string;
    videoUrl?: string;
  }) => void;
  onDeleteMaterial: (departmentId: string, month: string, materialId: string) => void;
  onUpdateMaterialDescription: (departmentId: string, month: string, materialId: string, description: string) => void;
  onBack: () => void;
}

const PERSIAN_MONTHS = [
  'عمومی (همه ماه‌ها)',
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const getIconForMimeType = (type: string): { icon: React.ReactNode; color: string } => {
  if (type === 'article') return { icon: <DocumentIcon className="w-10 h-10" />, color: 'text-sky-500' };
  if (type.startsWith('image/')) return { icon: <ImageIcon className="w-10 h-10" />, color: 'text-blue-500' };
  if (type.startsWith('video/')) return { icon: <VideoIcon className="w-10 h-10" />, color: 'text-red-500' };
  if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-10 h-10" />, color: 'text-purple-500' };
  if (type === 'application/pdf') return { icon: <PdfIcon className="w-10 h-10" />, color: 'text-orange-500' };
  return { icon: <DocumentIcon className="w-10 h-10" />, color: 'text-slate-500' };
};

const formatMaterialDate = (material: TrainingMaterial): string => {
  if (material.createdAt) {
    try {
      return new Date(material.createdAt).toLocaleDateString('fa-IR');
    } catch {
      // fallback
    }
  }
  if (!isNaN(Number(material.id)) && material.id.length > 8) {
    try {
      return new Date(Number(material.id)).toLocaleDateString('fa-IR');
    } catch {
      // fallback
    }
  }
  return 'اخیراً بارگذاری شده';
};

const TrainingManager: React.FC<TrainingManagerProps> = ({
  departmentId,
  monthlyTrainings,
  onAddMaterial,
  onDeleteMaterial,
  onUpdateMaterialDescription,
  onBack,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Rich Article creation / editing state
  const [isWritingArticle, setIsWritingArticle] = useState(false);
  const [editingArticle, setEditingArticle] = useState<TrainingMaterial | null>(null);

  // Description modal for uploaded files
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<{ material: TrainingMaterial; month: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<{ file: File; dataUrl: string } | null>(null);
  const [materialDescription, setMaterialDescription] = useState('');

  // Flatten all materials with month tag and sort strictly by publication date priority (latest first)
  const allMaterialsWithMonth = useMemo(() => {
    const list: Array<{ material: TrainingMaterial; month: string }> = [];
    (monthlyTrainings || []).forEach(mt => {
      (mt.materials || []).forEach(mat => {
        list.push({ material: mat, month: mt.month || 'عمومی' });
      });
    });

    list.sort((a, b) => {
      const timeA = a.material.createdAt
        ? new Date(a.material.createdAt).getTime()
        : !isNaN(Number(a.material.id)) && a.material.id.length > 8
        ? Number(a.material.id)
        : 0;
      const timeB = b.material.createdAt
        ? new Date(b.material.createdAt).getTime()
        : !isNaN(Number(b.material.id)) && b.material.id.length > 8
        ? Number(b.material.id)
        : 0;
      return timeB - timeA;
    });

    return list;
  }, [monthlyTrainings]);

  const filteredMaterials = useMemo(() => {
    let result = allMaterialsWithMonth;
    if (filterType !== 'all') {
      if (filterType === 'article') {
        result = result.filter(item => item.material.type === 'article' || !!item.material.articleContent);
      } else if (filterType === 'video') {
        result = result.filter(item => item.material.type.startsWith('video/') || !!item.material.videoUrl);
      } else if (filterType === 'pdf') {
        result = result.filter(item => item.material.type === 'application/pdf');
      }
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        item =>
          item.material.name.toLowerCase().includes(q) ||
          (item.material.description && item.material.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allMaterialsWithMonth, filterType, searchTerm]);

  const handleFileUpload = (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) throw new Error('Failed to read file.');

        setPendingFile({ file, dataUrl });
        setMaterialDescription('');
        setDescriptionModalOpen(true);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'خطای ناشناخته در پردازش فایل.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('خطا در خواندن فایل.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveArticle = (data: {
    title: string;
    description: string;
    content: string;
    videoUrl?: string;
    month?: string;
  }) => {
    if (editingArticle) {
      const oldMonth = allMaterialsWithMonth.find(item => item.material.id === editingArticle.id)?.month || 'عمومی';
      onDeleteMaterial(departmentId, oldMonth, editingArticle.id);
    }

    onAddMaterial(departmentId, data.month || 'عمومی', {
      name: data.title,
      type: 'article',
      dataUrl: '',
      description: data.description,
      articleContent: data.content,
      videoUrl: data.videoUrl,
    });
    setIsWritingArticle(false);
    setEditingArticle(null);
  };

  const handleDeleteClick = (month: string, materialId: string, materialName: string) => {
    if (window.confirm(`آیا از حذف "${materialName}" مطمئن هستید؟`)) {
      onDeleteMaterial(departmentId, month, materialId);
    }
  };

  const handleSaveMaterialWithDescription = () => {
    if (pendingFile) {
      onAddMaterial(departmentId, 'عمومی', {
        name: pendingFile.file.name,
        type: pendingFile.file.type,
        dataUrl: pendingFile.dataUrl,
        description: materialDescription.trim() || undefined,
      });
    } else if (editingMaterial) {
      onUpdateMaterialDescription(
        departmentId,
        editingMaterial.month,
        editingMaterial.material.id,
        materialDescription.trim()
      );
    }

    setDescriptionModalOpen(false);
    setPendingFile(null);
    setEditingMaterial(null);
    setMaterialDescription('');
  };

  const handleOpenEditDescriptionModal = (material: TrainingMaterial, month: string) => {
    setPendingFile(null);
    setEditingMaterial({ material, month });
    setMaterialDescription(material.description || '');
    setDescriptionModalOpen(true);
  };

  const handleArchiveArticle = (material: TrainingMaterial) => {
    try {
      const raw = localStorage.getItem('archived_training_articles');
      const list = raw ? JSON.parse(raw) : [];
      if (list.some((a: any) => a.id === material.id || a.title === material.name)) {
        alert('این مطلب قبلاً در مخزن الگوهای ادمین کل ذخیره شده است.');
        return;
      }
      const newArchived = {
        id: material.id || Date.now().toString(),
        title: material.name,
        description: material.description,
        content: material.articleContent || '',
        videoUrl: material.videoUrl,
        createdAt: material.createdAt || new Date().toISOString(),
      };
      list.push(newArchived);
      localStorage.setItem('archived_training_articles', JSON.stringify(list));
      alert(`مطلب آموزشی "${material.name}" با موفقیت در مخزن الگوهای ادمین کل ذخیره شد و اکنون از پنل ادمین قابل تزریق به هر بیمارستان یا بخش دلخواه است.`);
    } catch (e) {
      alert('خطا در ذخیره‌سازی در مخزن الگوها.');
    }
  };

  // If currently writing an article
  if (isWritingArticle) {
    return (
      <div className="p-3 sm:p-6 lg:p-8">
        <RichArticleEditor
          initialTitle={editingArticle?.name || ''}
          initialDescription={editingArticle?.description || ''}
          initialContent={editingArticle?.articleContent || ''}
          initialVideoUrl={editingArticle?.videoUrl || ''}
          onSave={handleSaveArticle}
          onCancel={() => {
            setIsWritingArticle(false);
            setEditingArticle(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="بازگشت به بخش"
          >
            <BackIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>بازگشت به بخش</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AcademicCapIcon className="w-6 h-6 text-sky-600" />
              <span>مدیریت آموزش پرسنل بخش</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تولید مطالب چندرسانه‌ای با امکانات Word، بارگذاری فایل، درج عکس و فیلم با پلیر واکنش‌گرا
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingArticle(null);
            setIsWritingArticle(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md text-xs sm:text-sm transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          <span>ایجاد مطلب آموزشی چندرسانه‌ای (جدید)</span>
        </button>
      </div>

      {/* Upload & Content Creator Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              افزودن محتوای آموزشی به بخش
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              می‌توانید مستقیماً مقاله متنی با عکس و فیلم ایجاد نمایید یا فایل آماده بارگذاری کنید.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingArticle(null);
                setIsWritingArticle(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 rounded-xl transition shadow-xs"
            >
              <span>📝 نگارش مقاله متنی با عکس و فیلم</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          {isUploading && <p className="text-center text-sky-500 font-bold mb-2 text-xs">در حال پردازش فایل...</p>}
          {uploadError && <p className="text-center text-red-500 my-2 text-xs">{uploadError}</p>}
          <FileUploader
            onFileUpload={handleFileUpload}
            accept="*"
            title="انتخاب و بارگذاری فایل آموزشی (PDF، ویدئو، پادکست، سند ورد، اسلاید) - ثبت خودکار با تاریخ امروز"
          />
        </div>
      </div>

      {/* Materials List Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              بانک مطالب آموزشی ثبت شده ({filteredMaterials.length})
            </h3>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
              مرتب‌سازی: بر اساس تاریخ انتشار (جدیدترین به قدیمی‌ترین)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600"
            >
              <option value="all">همه قالب‌ها (متن، فیلم، فایل)</option>
              <option value="article">📝 مقالات متنی و آموزشی</option>
              <option value="video">🎥 ویدئوهای آموزشی</option>
              <option value="pdf">📄 فایل‌های PDF و مستندات</option>
            </select>

            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو در عنوان یا متن مطالب..."
              className="flex-1 sm:w-56 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700"
            />
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-xs sm:text-sm">
            هیچ محتوای آموزشی‌ای یافت نشد.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaterials.map(({ material, month }) => {
              const { icon, color } = getIconForMimeType(material.type);
              const dateStr = formatMaterialDate(material);
              const isArticle = material.type === 'article' || !!material.articleContent;

              return (
                <div
                  key={material.id}
                  className="flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-750/70 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs ${color}`}>
                        {icon}
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold block mb-1">
                          📅 {dateStr}
                        </span>
                      </div>
                    </div>

                    <h4
                      className="font-bold text-sm text-slate-800 dark:text-slate-200 break-all line-clamp-2"
                      title={material.name}
                    >
                      {material.name}
                    </h4>

                    {isArticle ? (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                        📝 مطلب متنی و فیلم
                      </span>
                    ) : material.type.startsWith('video/') || material.videoUrl ? (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                        🎥 فیلم آموزشی
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold">
                        📄 فایل آموزشی
                      </span>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      {material.description || 'بدون توضیحات'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <button
                      onClick={() => setPreviewMaterial(material)}
                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 flex items-center gap-1"
                    >
                      <span>مشاهده و مطالعه</span>
                      <span>←</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {isArticle && (
                        <button
                          onClick={() => handleArchiveArticle(material)}
                          className="p-1.5 text-purple-600 hover:text-white hover:bg-purple-600 rounded-lg transition"
                          title="ذخیره در مخزن الگوهای ادمین کل جهت تزریق"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}

                      {isArticle ? (
                        <button
                          onClick={() => {
                            setEditingArticle(material);
                            setIsWritingArticle(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          title="ویرایش مقاله"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenEditDescriptionModal(material, month)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          title="ویرایش توضیحات"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteClick(month, material.id, material.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        title="حذف محتوا"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal (Handles articles and files) */}
      {previewMaterial && (
        <PreviewModal
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
          material={previewMaterial}
        />
      )}

      {/* Description Edit Modal */}
      <Modal
        isOpen={descriptionModalOpen}
        onClose={() => setDescriptionModalOpen(false)}
        title={pendingFile ? 'افزودن توضیحات فایل آموزشی' : 'ویرایش توضیحات'}
      >
        <div className="space-y-4">
          <textarea
            value={materialDescription}
            onChange={e => setMaterialDescription(e.target.value)}
            placeholder="اهداف آموزشی، نکات کلیدی و الزامات مطالعه پرسنل را اینجا بنویسید..."
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDescriptionModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 text-xs sm:text-sm"
            >
              انصراف
            </button>
            <button
              onClick={handleSaveMaterialWithDescription}
              className="px-4 py-2 font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 text-xs sm:text-sm shadow-xs"
            >
              ذخیره محتوا
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TrainingManager;
