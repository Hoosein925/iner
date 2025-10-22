import React, { useState, useRef, useEffect } from 'react';
import { Department, Patient, TrainingMaterial } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import FileUploader from './FileUploader';
import PreviewModal from './PreviewModal';
import Modal from './Modal';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { AudioIcon } from './icons/AudioIcon';
import { PdfIcon } from './icons/PdfIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import * as db from '../services/db';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { EditIcon } from './icons/EditIcon';
import { BackIcon } from './icons/BackIcon';
import { RefreshIcon } from './icons/RefreshIcon';

interface PatientEducationManagerProps {
  department: Department;
  onAddMaterial: (fileData: {name: string, type: string, dataUrl: string, description?: string}) => void;
  onDeleteMaterial: (materialId: string) => void;
  onUpdateMaterialDescription: (materialId: string, description: string) => void;
  onAddPatient: (name: string, nationalId: string, password?: string) => void;
  onDeletePatient: (patientId: string) => void;
  onSendMessage: (patientId: string, content: { text?: string; fileData?: { name: string; type: string; dataUrl: string; } }, sender: 'patient' | 'manager') => void;
  onBack: () => void;
  onRefreshChat: () => void;
}

const getIconForMimeType = (type: string): { icon: React.ReactNode, color: string } => {
    if (type.startsWith('image/')) return { icon: <ImageIcon className="w-8 h-8" />, color: 'text-blue-500' };
    if (type.startsWith('video/')) return { icon: <VideoIcon className="w-8 h-8" />, color: 'text-red-500' };
    if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-8 h-8" />, color: 'text-purple-500' };
    if (type === 'application/pdf') return { icon: <PdfIcon className="w-8 h-8" />, color: 'text-orange-500' };
    return { icon: <DocumentIcon className="w-8 h-8" />, color: 'text-slate-500' };
};

const PatientEducationManager: React.FC<PatientEducationManagerProps> = ({ department, onAddMaterial, onDeleteMaterial, onUpdateMaterialDescription, onAddPatient, onDeletePatient, onSendMessage, onBack, onRefreshChat }) => {
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [replyText, setReplyText] = useState('');

    // Modals state
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [previewMaterial, setPreviewMaterial] = useState<Pick<TrainingMaterial, 'name'|'type'|'storagePath'> | null>(null);

    // Patient Modal form state
    const [newPatientName, setNewPatientName] = useState('');
    const [newPatientNationalId, setNewPatientNationalId] = useState('');
    const [newPatientPassword, setNewPatientPassword] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [selectedPatient?.chatHistory]);

    // This effect synchronizes the selected patient's data with the main state from props.
    // It prevents displaying stale chat history after a new message is sent.
    useEffect(() => {
        if (selectedPatient) {
            const updatedPatient = department.patients?.find(p => p.id === selectedPatient.id);
            if (updatedPatient) {
                // Prevent re-setting state if the object is identical
                if (JSON.stringify(updatedPatient) !== JSON.stringify(selectedPatient)) {
                    setSelectedPatient(updatedPatient);
                }
            } else {
                // The patient was deleted, so clear the view
                setSelectedPatient(null);
            }
        }
    }, [department, selectedPatient]);


    const handleSendReply = () => {
        if (selectedPatient && replyText.trim()) {
            onSendMessage(selectedPatient.id, { text: replyText.trim() }, 'manager');
            setReplyText('');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedPatient) return;
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
            
            onSendMessage(selectedPatient.id, {
                fileData: { name: file.name, type: file.type, dataUrl: dataUrl }
            }, 'manager');

        } catch (error) {
            console.error("Error sending file:", error);
            alert("خطا در ارسال فایل.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    const handleOpenAddPatientModal = () => {
        setNewPatientName('');
        setNewPatientNationalId('');
        setNewPatientPassword('');
        setIsPatientModalOpen(true);
    };

    const handleSavePatient = () => {
        if (!newPatientName.trim() || !newPatientNationalId.trim() || !newPatientPassword.trim()) {
            alert('لطفا تمام فیلدها را پر کنید.');
            return;
        }
        onAddPatient(newPatientName.trim(), newPatientNationalId.trim(), newPatientPassword.trim());
        setIsPatientModalOpen(false);
    };

    const handleDeletePatientClick = (patient: Patient) => {
        if (window.confirm(`آیا از حذف بیمار "${patient.name}" با کد ملی ${patient.nationalId} مطمئن هستید؟`)) {
            if (selectedPatient?.id === patient.id) {
                setSelectedPatient(null);
            }
            onDeletePatient(patient.id);
        }
    };

    return (
        <>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">آموزش به بیمار: <span className="text-orange-500">{department.name}</span></h1>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button 
                        onClick={() => setIsContentModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                        مدیریت محتوای آموزشی
                    </button>
                    <button 
                        onClick={handleOpenAddPatientModal}
                        className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                    >
                        <PlusIcon className="w-5 h-5"/>
                        افزودن بیمار جدید
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col md:flex-row h-[calc(100vh-16rem)]">
                {/* Patient List Column */}
                <div className={`w-full md:w-1/3 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col ${selectedPatient ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold">بیماران بخش</h2>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                      {(department.patients || []).map(p => (
                          <div key={p.id} className={`w-full text-right p-4 border-b dark:border-slate-700 group flex justify-between items-center ${selectedPatient?.id === p.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                            <button onClick={() => setSelectedPatient(p)} className="flex-grow text-right">
                                <p className="font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{(p.chatHistory || []).length} پیام</p>
                            </button>
                            <button onClick={() => handleDeletePatientClick(p)} className="p-2 text-slate-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100" aria-label="Delete Patient">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                          </div>
                      ))}
                    </div>
                </div>
                
                {/* Chat and Content View Column */}
                <div className={`w-full md:w-2/3 flex flex-col ${selectedPatient ? 'flex' : 'hidden md:flex'}`}>
                  {selectedPatient ? (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-col flex-grow min-h-0">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelectedPatient(null)} className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden">
                                        <BackIcon className="w-6 h-6"/>
                                    </button>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">چت با {selectedPatient.name}</h3>
                                </div>
                                <button 
                                    onClick={onRefreshChat} 
                                    className="p-2 rounded-full text-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    title="بارگذاری مجدد گفتگو"
                                >
                                    <RefreshIcon className="w-6 h-6"/>
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                                {(selectedPatient.chatHistory || []).map(msg => (
                                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'manager' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xl p-3 rounded-lg shadow ${msg.sender === 'manager' ? 'bg-green-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.file && (
                                        <button 
                                        onClick={() => setPreviewMaterial({ name: msg.file!.name, type: msg.file!.type, storagePath: msg.file!.storagePath })}
                                        className="flex items-center gap-3 text-left"
                                        >
                                        <div className={`flex-shrink-0 ${msg.sender === 'manager' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {getIconForMimeType(msg.file.type).icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold break-all">{msg.file.name}</p>
                                            <p className="text-xs opacity-80">برای مشاهده کلیک کنید</p>
                                        </div>
                                        </button>
                                    )}
                                    <p className={`text-xs mt-1 text-right ${msg.sender === 'manager' ? 'text-green-100' : 'text-slate-400'}`}>
                                        {new Date(msg.timestamp).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    </div>
                                </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                                    aria-label="Attach file"
                                >
                                    <PaperClipIcon className="w-6 h-6"/>
                                </button>
                                <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="پاسخ خود را بنویسید..."
                                rows={2}
                                className="flex-grow px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                onClick={handleSendReply}
                                className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                disabled={!replyText.trim()}
                                >
                                ارسال
                                </button>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <p>برای مشاهده مکالمات، یک بیمار را انتخاب کنید.</p>
                    </div>
                  )}
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isContentModalOpen} onClose={() => setIsContentModalOpen(false)} title="مدیریت محتوای آموزشی بیماران" maxWidthClass="max-w-4xl">
                <ContentManager
                    materials={department.patientEducationMaterials || []}
                    onAddMaterial={onAddMaterial}
                    onDeleteMaterial={onDeleteMaterial}
                    onUpdateMaterialDescription={onUpdateMaterialDescription}
                    setPreviewMaterial={setPreviewMaterial}
                />
            </Modal>
            
            <Modal isOpen={isPatientModalOpen} onClose={() => setIsPatientModalOpen(false)} title="افزودن بیمار جدید">
                <div className="space-y-4">
                     <input
                        type="text"
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        placeholder="نام و نام خانوادگی بیمار"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="text"
                        inputMode="numeric"
                        value={newPatientNationalId}
                        onChange={(e) => setNewPatientNationalId(e.target.value.replace(/\D/g, ''))}
                        placeholder="کد ملی بیمار (برای ورود)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="password"
                        value={newPatientPassword}
                        onChange={(e) => setNewPatientPassword(e.target.value)}
                        placeholder="رمز عبور"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setIsPatientModalOpen(false)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                            انصراف
                        </button>
                        <button onClick={handleSavePatient} className="px-4 py-2 font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700">
                            ذخیره بیمار
                        </button>
                    </div>
                </div>
            </Modal>
            
            {previewMaterial && <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial}/>}
        </>
    );
};


// Sub-component for Content Management inside the modal
const ContentManager: React.FC<{
    materials: TrainingMaterial[];
    onAddMaterial: (fileData: {name: string, type: string, dataUrl: string, description?: string}) => void;
    onDeleteMaterial: (materialId: string) => void;
    onUpdateMaterialDescription: (materialId: string, description: string) => void;
    setPreviewMaterial: (material: Pick<TrainingMaterial, 'name'|'type'|'storagePath'> | null) => void;
}> = ({ materials, onAddMaterial, onDeleteMaterial, onUpdateMaterialDescription, setPreviewMaterial }) => {
    
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
    const [pendingFile, setPendingFile] = useState<{file: File, dataUrl: string} | null>(null);
    const [materialDescription, setMaterialDescription] = useState('');

    const handleFileUpload = (file: File) => {
        setIsUploading(true);
        setUploadError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dataUrl = e.target?.result as string;
                if (!dataUrl) throw new Error("Failed to read file.");
                setPendingFile({ file, dataUrl });
                setMaterialDescription('');
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

    const handleSaveMaterialWithDescription = () => {
        if (pendingFile) {
            const { file, dataUrl } = pendingFile;
            onAddMaterial({
                name: file.name,
                type: file.type,
                dataUrl: dataUrl,
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

    const handleDeleteClick = (materialId: string, materialName: string) => {
        if (window.confirm(`آیا از حذف فایل "${materialName}" مطمئن هستید؟`)) {
            onDeleteMaterial(materialId);
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold mb-4">بارگذاری محتوای جدید</h3>
                {isUploading && <p className="text-center text-indigo-500">در حال پردازش فایل...</p>}
                {uploadError && <p className="text-center text-red-500 my-2">{uploadError}</p>}
                <FileUploader onFileUpload={handleFileUpload} accept="*" title="آپلود فایل، صدا، عکس یا فیلم" />
            </div>
            <div>
                <h3 className="text-xl font-bold mb-4 border-t pt-6 border-slate-200 dark:border-slate-700">محتوای موجود</h3>
                {materials.length === 0 ? (
                    <p className="text-center py-8 text-slate-400">هیچ محتوایی بارگذاری نشده است.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {materials.map(material => {
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
                                        <button onClick={() => handleDeleteClick(material.id, material.name)} className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-500 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
             <Modal isOpen={descriptionModalOpen} onClose={() => setDescriptionModalOpen(false)} title={pendingFile ? "افزودن توضیحات" : "ویرایش توضیحات"}>
                <div className="space-y-4">
                    <textarea
                        value={materialDescription}
                        onChange={(e) => setMaterialDescription(e.target.value)}
                        placeholder="توضیحات مربوط به فایل را اینجا وارد کنید..."
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

export default PatientEducationManager;