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

interface TrainingManagerProps {
  monthlyTrainings: MonthlyTraining[];
  onAddMaterial: (month: string, material: TrainingMaterial) => void;
  onDeleteMaterial: (month: string, materialId: string) => void;
  onUpdateMaterialDescription: (month: string, materialId: string, description: string) => void;
  onBack: () => void;
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

const getIconForMimeType = (type: string): { icon: React.ReactNode, color: string } => {
    if (type.startsWith('image/')) return { icon: <ImageIcon className="w-10 h-10" />, color: 'text-blue-500' };
    if (type.startsWith('video/')) return { icon: <VideoIcon className="w-10 h-10" />, color: 'text-red-500' };
    if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-10 h-10" />, color: 'text-purple-500' };
    if (type === 'application/pdf') return { icon: <PdfIcon className="w-10 h-10" />, color: 'text-orange-500' };
    return { icon: <DocumentIcon className="w-10 h-10" />, color: 'text-slate-500' };
};

const TrainingManager: React.FC<TrainingManagerProps> = ({ monthlyTrainings, onAddMaterial, onDeleteMaterial, onUpdateMaterialDescription, onBack }) => {
    const [selectedMonth, setSelectedMonth] = useState<string>(PERSIAN_MONTHS[0]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);

    // For description modal
    const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
    const [pendingFile, setPendingFile] = useState<{file: File, dataUrl: string} | null>(null);
    const [materialDescription, setMaterialDescription] = useState('');

    const materialsForSelectedMonth = useMemo(() => {
        return monthlyTrainings.find(t => t.month === selectedMonth)?.materials || [];
    }, [monthlyTrainings, selectedMonth]);

    const handleFileUpload = (file: File) => {
        setIsUploading(true);
        setUploadError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dataUrl = e.target?.result as string;
                if (!dataUrl) throw new Error("Failed to read file.");
                
                setPendingFile({ file, dataUrl });
                setMaterialDescription(''); // Reset for new file
                setDescriptionModalOpen(true);

            } catch (err) {
                 setUploadError(err instanceof Error ? err.message : "خطای ناشناخته در پردازش فایل.");
            } finally {
                setIsUploading(false);
            }
        };
        reader.onerror = () => {
             setUploadError("خطا در خواندن فایل.");
             setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };
    
    const handleDeleteClick = (month: string, materialId: string, materialName: string) => {
        if (window.confirm(`آیا از حذف فایل "${materialName}" مطمئن هستید؟`)) {
            onDeleteMaterial(month, materialId);
        }
    };
    
    const handleSaveMaterialWithDescription = () => {
      if (pendingFile) { // Adding new
          const { file, dataUrl } = pendingFile;
          const newMaterial: TrainingMaterial = {
              id: Date.now().toString(),
              name: file.name,
              type: file.type,
              data: dataUrl,
              description: materialDescription.trim(),
          };
          onAddMaterial(selectedMonth, newMaterial);
      } else if (editingMaterial) { // Editing existing
          onUpdateMaterialDescription(selectedMonth, editingMaterial.id, materialDescription.trim());
      }
      
      // Reset state
      setDescriptionModalOpen(false);
      setPendingFile(null);
      setEditingMaterial(null);
      setMaterialDescription('');
    };

    const handleOpenEditDescriptionModal = (material: TrainingMaterial) => {
      setPendingFile(null); // Ensure we're in edit mode
      setEditingMaterial(material);
      setMaterialDescription(material.description || '');
      setDescriptionModalOpen(true);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مدیریت آموزش پرسنل</h1>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <div className="mb-6">
                    <label htmlFor="month-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        انتخاب ماه برای بارگذاری محتوای آموزشی:
                    </label>
                    <select
                        id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {PERSIAN_MONTHS.map(month => (<option key={month} value={month}>{month}</option>))}
                    </select>
                </div>
                
                <h2 className="text-xl font-bold mb-4">بارگذاری محتوای جدید برای <span className="text-indigo-500">{selectedMonth}</span></h2>
                {isUploading && <p className="text-center text-indigo-500">در حال پردازش فایل...</p>}
                {uploadError && <p className="text-center text-red-500 my-2">{uploadError}</p>}
                <FileUploader onFileUpload={handleFileUpload} accept="*" title="آپلود فایل، صدا، عکس یا فیلم آموزشی" />

                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 border-t pt-6 border-slate-200 dark:border-slate-700">محتوای بارگذاری شده برای {selectedMonth}</h3>
                    {materialsForSelectedMonth.length === 0 ? (
                         <p className="text-center py-8 text-slate-400">هیچ محتوایی برای این ماه بارگذاری نشده است.</p>
                    ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {materialsForSelectedMonth.map(material => {
                              const { icon, color } = getIconForMimeType(material.type);
                              return (
                                <div key={material.id} className="group relative flex flex-col text-right p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow-sm hover:shadow-md transition-all text-slate-800 dark:text-slate-200">
                                    <button onClick={() => setPreviewMaterial(material)} className="flex-grow flex flex-col text-right">
                                        <div className={`mb-3 ${color}`}>{icon}</div>
                                        <h4 className="font-bold text-sm break-all w-full truncate" title={material.name}>{material.name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex-grow h-8 overflow-hidden text-ellipsis">
                                            {material.description || 'بدون توضیح'}
                                        </p>
                                    </button>
                                    <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenEditDescriptionModal(material)} className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-500 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400">
                                            <EditIcon className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => handleDeleteClick(selectedMonth, material.id, material.name)} className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-500 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                              )
                          })}
                        </div>
                    )}
                </div>
            </div>
            
            {previewMaterial && <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial}/>}
            
            <Modal isOpen={descriptionModalOpen} onClose={() => setDescriptionModalOpen(false)} title={pendingFile ? "افزودن توضیحات" : "ویرایش توضیحات"}>
                <div className="space-y-4">
                    <textarea
                        value={materialDescription}
                        onChange={(e) => setMaterialDescription(e.target.value)}
                        placeholder="توضیحات مربوط به فایل آموزشی را اینجا وارد کنید..."
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDescriptionModalOpen(false)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                            انصراف
                        </button>
                        <button onClick={handleSaveMaterialWithDescription} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            ذخیره
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TrainingManager;