
import React, { useState, useRef, useEffect } from 'react';
import { Department, Patient, TrainingMaterial } from '../types';
import PreviewModal from './PreviewModal';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { AudioIcon } from './icons/AudioIcon';
import { PdfIcon } from './icons/PdfIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import * as db from '../services/db';
import { SunIcon } from './icons/SunIcon';

interface PatientPortalViewProps {
  department: Department;
  patient: Patient;
  onSendMessage: (content: { text?: string; file?: { id: string; name: string; type: string; } }) => void;
}

const getIconForMimeType = (type: string, size: 'large' | 'small' = 'large'): { icon: React.ReactNode, color: string } => {
    const className = size === 'large' ? "w-12 h-12" : "w-8 h-8";
    if (type.startsWith('image/')) return { icon: <ImageIcon className={className} />, color: 'text-blue-500' };
    if (type.startsWith('video/')) return { icon: <VideoIcon className={className} />, color: 'text-red-500' };
    if (type.startsWith('audio/')) return { icon: <AudioIcon className={className} />, color: 'text-purple-500' };
    if (type === 'application/pdf') return { icon: <PdfIcon className={className} />, color: 'text-orange-500' };
    return { icon: <DocumentIcon className={className} />, color: 'text-slate-500' };
};

const PatientPortalView: React.FC<PatientPortalViewProps> = ({ department, patient, onSendMessage }) => {
    const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const materials = department.patientEducationMaterials || [];
    const chatHistory = patient.chatHistory || [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage({ text: newMessage.trim() });
            setNewMessage('');
        }
    };
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
            
            const fileId = `chat-file-${Date.now()}`;
            await db.addMaterial({ id: fileId, data: dataUrl });

            onSendMessage({
                file: { id: fileId, name: file.name, type: file.type }
            });

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
            handleSend();
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
             {/* New Banner */}
            <div className="bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900/70 p-8 rounded-2xl shadow-lg mb-10 flex items-center gap-6">
                <SunIcon className="w-20 h-20 text-yellow-500 dark:text-yellow-400 flex-shrink-0"/>
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">سلام، {patient.name} عزیز</h1>
                    <p className="text-lg mt-2 text-slate-600 dark:text-slate-300">
                        به پورتال آموزشی خود خوش آمدید. ما اینجا هستیم تا در مسیر بهبودی همراه شما باشیم.
                    </p>
                </div>
            </div>
            
            {/* Educational Content Section - MOVED UP */}
            <div className="mb-10">
                <h2 className="text-3xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100">مطالب آموزشی بخش {department.name}</h2>
                {materials.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <h3 className="text-xl font-medium text-slate-500">محتوای آموزشی برای این بخش وجود ندارد.</h3>
                    </div>
                ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {materials.map(material => {
                            const { icon, color } = getIconForMimeType(material.type, 'large');
                            return (
                                <button
                                    key={material.id}
                                    onClick={() => setPreviewMaterial(material)}
                                    className="group flex flex-col text-right p-5 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl hover:border-indigo-500 border-2 border-transparent transition-all transform hover:-translate-y-1.5 text-slate-800 dark:text-slate-200"
                                >
                                    <div className={`mb-4 ${color}`}>
                                        {icon}
                                    </div>
                                    <h4 className="font-bold text-base break-all w-full truncate" title={material.name}>{material.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex-grow">
                                        {material.description || 'برای مشاهده کلیک کنید'}
                                    </p>
                                </button>
                            );
                        })}
                     </div>
                )}
            </div>

            {/* Chat Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex flex-col h-[70vh] mb-8 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-2xl font-bold text-center">سوالی راجب بیماری و درمانت داری همین جا بپرس</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                  {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xl p-3 rounded-2xl shadow ${msg.sender === 'patient' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {msg.file && (
                            <button 
                                onClick={() => setPreviewMaterial({ id: msg.file!.id, name: msg.file!.name, type: msg.file!.type })}
                                className="flex items-center gap-3 text-left p-2 -m-2 rounded-lg hover:bg-black/10"
                            >
                                <div className={`flex-shrink-0 ${msg.sender === 'patient' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {getIconForMimeType(msg.file.type, 'small').icon}
                                </div>
                                <div>
                                    <p className="font-semibold break-all">{msg.file.name}</p>
                                    <p className="text-xs opacity-80">برای مشاهده کلیک کنید</p>
                                </div>
                            </button>
                        )}
                        <p className={`text-xs mt-1 text-right ${msg.sender === 'patient' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-shrink-0 bg-white dark:bg-slate-800">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        aria-label="Attach file"
                    >
                        <PaperClipIcon className="w-6 h-6"/>
                    </button>
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="پیام خود را بنویسید..."
                        rows={1}
                        className="flex-grow px-4 py-3 border border-slate-300 rounded-full dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <button
                        onClick={handleSend}
                        className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        disabled={!newMessage.trim()}
                    >
                        ارسال
                    </button>
                </div>
            </div>
            
            <footer className="text-center mt-12 py-4 text-sm text-slate-400">
                <p>این محتوا صرفاً جهت اطلاع‌رسانی است و جایگزین مشاوره پزشکی نیست.</p>
            </footer>
            
            {previewMaterial && <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial}/>}
        </div>
    );
};

export default PatientPortalView;
