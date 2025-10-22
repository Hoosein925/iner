import React, { useState, useEffect } from 'react';
import { NewsBanner } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon } from './icons/EditIcon';
import FileUploader from './FileUploader';
import Modal from './Modal';
import * as db from '../services/db';

interface NewsBannerManagerProps {
  banners: NewsBanner[];
  onAddBanner: (banner: Omit<NewsBanner, 'id' | 'imageId'>, file: File, imageData: string) => void;
  onUpdateBanner: (bannerId: string, title: string, description: string) => void;
  onDeleteBanner: (bannerId: string) => void;
  onBack: () => void;
}

const NewsBannerManager: React.FC<NewsBannerManagerProps> = ({ banners, onAddBanner, onUpdateBanner, onDeleteBanner, onBack }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<NewsBanner | null>(null);
    const [pendingFile, setPendingFile] = useState<{file: File, dataUrl: string} | null>(null);
    
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerDescription, setBannerDescription] = useState('');

    const [bannerImages, setBannerImages] = useState<{[key: string]: string}>({});

    useEffect(() => {
        const fetchImages = async () => {
            const images: {[key: string]: string} = {};
            for (const banner of banners) {
                const data = await db.getMaterialData(banner.imageId);
                if (data) {
                    images[banner.imageId] = data;
                }
            }
            setBannerImages(images);
        };
        fetchImages();
    }, [banners]);


    const handleFileUpload = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('لطفا فقط فایل تصویری آپلود کنید.');
            return;
        }
        setIsUploading(true);
        setUploadError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dataUrl = e.target?.result as string;
                if (!dataUrl) throw new Error("Failed to read file.");
                
                setPendingFile({ file, dataUrl });
                setEditingBanner(null);
                setBannerTitle('');
                setBannerDescription('');
                setModalOpen(true);
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
    
    const handleDeleteClick = (bannerId: string, bannerTitle: string) => {
        if (window.confirm(`آیا از حذف بنر خبری "${bannerTitle}" مطمئن هستید؟`)) {
            onDeleteBanner(bannerId);
        }
    };
    
    const handleSave = () => {
      if (!bannerTitle.trim()) {
        alert("عنوان بنر نمی‌تواند خالی باشد.");
        return;
      }

      if (pendingFile) { // Adding new
          onAddBanner({ title: bannerTitle, description: bannerDescription }, pendingFile.file, pendingFile.dataUrl);
      } else if (editingBanner) { // Editing existing
          onUpdateBanner(editingBanner.id, bannerTitle, bannerDescription);
      }
      
      handleCloseModal();
    };

    const handleOpenEditModal = (banner: NewsBanner) => {
      setPendingFile(null);
      setEditingBanner(banner);
      setBannerTitle(banner.title);
      setBannerDescription(banner.description);
      setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setPendingFile(null);
        setEditingBanner(null);
        setBannerTitle('');
        setBannerDescription('');
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">مدیریت بنرهای خبری</h1>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-2">بارگذاری بنر جدید</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    برای بهترین نتیجه، از تصاویر با نسبت ابعاد 16:9 استفاده کنید (مانند 1280x720 پیکسل).
                </p>
                {isUploading && <p className="text-center text-indigo-500">در حال پردازش فایل...</p>}
                {uploadError && <p className="text-center text-red-500 my-2">{uploadError}</p>}
                <FileUploader onFileUpload={handleFileUpload} accept="image/*" title="آپلود تصویر بنر" />

                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 border-t pt-6 border-slate-200 dark:border-slate-700">بنرهای موجود</h3>
                    {banners.length === 0 ? (
                         <p className="text-center py-8 text-slate-400">هیچ بنری بارگذاری نشده است.</p>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {banners.map(banner => (
                            <div key={banner.id} className="group relative bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow-sm overflow-hidden">
                                <img src={bannerImages[banner.imageId] || ''} alt={banner.title} className="w-full aspect-video object-contain bg-slate-200 dark:bg-slate-600" />
                                <div className="p-4">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{banner.title}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-10 overflow-hidden text-ellipsis">
                                        {banner.description || 'بدون توضیح'}
                                    </p>
                                </div>
                                <div className="absolute top-2 left-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEditModal(banner)} className="p-2 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400">
                                        <EditIcon className="w-5 h-5"/>
                                    </button>
                                    <button onClick={() => handleDeleteClick(banner.id, banner.title)} className="p-2 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-200 hover:text-red-500 dark:hover:text-red-400">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                          ))}
                        </div>
                    )}
                </div>
            </div>
            
            <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingBanner ? "ویرایش بنر خبری" : "افزودن بنر خبری"}>
                <div className="space-y-4">
                    <input 
                        type="text"
                        value={bannerTitle}
                        onChange={e => setBannerTitle(e.target.value)}
                        placeholder="عنوان بنر"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                        value={bannerDescription}
                        onChange={(e) => setBannerDescription(e.target.value)}
                        placeholder="توضیحات کوتاه (اختیاری)"
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={handleCloseModal} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                            انصراف
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            ذخیره
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default NewsBannerManager;