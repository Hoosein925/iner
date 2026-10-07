import React, { useState, useMemo } from 'react';
import { TrainingMaterial } from '../types';
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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface AccreditationManagerProps {
  materials: TrainingMaterial[];
  onAddMaterial: (fileData: { name: string; type: string; dataUrl: string; description?: string }) => void;
  onDeleteMaterial: (materialId: string) => void;
  onUpdateMaterialDescription: (materialId: string, description: string) => void;
  onBack: () => void;
}

const getIconForMimeType = (type: string): { icon: React.ReactNode; color: string } => {
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

const AccreditationManager: React.FC<AccreditationManagerProps> = ({
  materials,
  onAddMaterial,
  onDeleteMaterial,
  onUpdateMaterialDescription,
  onBack,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Pick<TrainingMaterial, 'name' | 'type' | 'storagePath'> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // For description modal
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
  const [pendingFile, setPendingFile] = useState<{ file: File; dataUrl: string } | null>(null);
  const [materialDescription, setMaterialDescription] = useState('');

  // Sort by date/time priority (latest first)
  const sortedMaterials = useMemo(() => {
    const list = [...materials].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (!isNaN(Number(a.id)) && a.id.length > 8 ? Number(a.id) : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (!isNaN(Number(b.id)) && b.id.length > 8 ? Number(b.id) : 0);
      return timeB - timeA;
    });

    if (!searchTerm.trim()) return list;
    const query = searchTerm.toLowerCase();
    return list.filter(m => m.name.toLowerCase().includes(query) || (m.description && m.description.toLowerCase().includes(query)));
  }, [materials, searchTerm]);

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

  const handleDeleteClick = (materialId: string, materialName: string) => {
    if (window.confirm(`آیا از حذف مطلب اعتباربخشی "${materialName}" مطمئن هستید؟`)) {
      onDeleteMaterial(materialId);
    }
  };

  const handleSaveMaterialWithDescription = () => {
    if (pendingFile) {
      const { file, dataUrl } = pendingFile;
      onAddMaterial({
        name: file.name,
        type: file.type,
        dataUrl,
        description: materialDescription.trim(),
      });
    } else if (editingMaterial) {
      onUpdateMaterialDescription(editingMaterial.id, materialDescription.trim());
    }

    setDescriptionModalOpen(false);
    setPendingFile(null);
    setEditingMaterial(null);
    setMaterialDescription('');
  };

  const handleOpenEditDescriptionModal = (material: TrainingMaterial) => {
    setPendingFile(null);
    setEditingMaterial(material);
    setMaterialDescription(material.description || '');
    setDescriptionModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="بازگشت به لیست بخش‌ها"
          >
            <BackIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>بازگشت به لیست بخش‌ها</span>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheckIcon className="w-7 h-7 text-emerald-600" />
              <span>مدیریت مطالب اعتباربخشی بیمارستان</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              استانداردها، گایدلاین‌ها و دستورالعمل‌های اعتباربخشی ملی (مرتب‌شده طبق اولویت زمان)
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-100">
          بارگذاری سند یا محتوای اعتباربخشی جدید
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          فایل‌های راهنما، پوسترهای ایمنی، بخشنامه‌های وزارت بهداشت و سنجه‌های بالینی را آپلود کنید تا بلافاصله با اولویت زمانی در اختیار پرسنل قرار گیرد.
        </p>
        {isUploading && <p className="text-center text-indigo-500 mb-2 font-bold">در حال پردازش فایل...</p>}
        {uploadError && <p className="text-center text-red-500 my-2">{uploadError}</p>}
        <FileUploader onFileUpload={handleFileUpload} accept="*" title="آپلود فایل، PDF، بخشنامه، تصویر یا فیلم آموزشی" />
      </div>

      {/* Materials List Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              مطالب اعتباربخشی ثبت شده ({sortedMaterials.length})
            </h3>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              مرتب‌سازی خودکار: بر اساس اولویت تاریخ و زمان ثبت (جدیدترین به قدیمی‌ترین)
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو در نام یا توضیحات مطلب..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700"
            />
          </div>
        </div>

        {sortedMaterials.length === 0 ? (
          <p className="text-center py-12 text-slate-400">هیچ مطلب اعتباربخشی‌ای یافت نشد.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {sortedMaterials.map(material => {
              const { icon, color } = getIconForMimeType(material.type);
              const dateStr = formatMaterialDate(material);

              return (
                <div
                  key={material.id}
                  className="group relative flex flex-col text-right p-4 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200"
                >
                  <button onClick={() => setPreviewMaterial(material)} className="flex-grow flex flex-col text-right w-full">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm ${color}`}>{icon}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                        {dateStr}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm break-all w-full line-clamp-2" title={material.name}>
                      {material.name}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 flex-grow">
                      {material.description || 'برای مشاهده کلیک کنید'}
                    </p>
                  </button>

                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                    <button
                      onClick={() => setPreviewMaterial(material)}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      مشاهده سند
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditDescriptionModal(material)}
                        className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                        title="ویرایش توضیحات"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(material.id, material.name)}
                        className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600"
                        title="حذف سند"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewMaterial && <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial} />}

      <Modal isOpen={descriptionModalOpen} onClose={() => setDescriptionModalOpen(false)} title={pendingFile ? 'افزودن توضیحات سند اعتباربخشی' : 'ویرایش توضیحات'}>
        <div className="space-y-4">
          <textarea
            value={materialDescription}
            onChange={e => setMaterialDescription(e.target.value)}
            placeholder="سنجه مربوطه، الزامات و نکات کلیدی اعتباربخشی را اینجا وارد کنید..."
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setDescriptionModalOpen(false)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
              انصراف
            </button>
            <button onClick={handleSaveMaterialWithDescription} className="px-4 py-2 font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
              ذخیره سند
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccreditationManager;
