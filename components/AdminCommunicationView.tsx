import React, { useState, useRef, useEffect } from 'react';
import { Hospital, TrainingMaterial } from '../types';
import { BackIcon } from './icons/BackIcon';
import * as db from '../services/db';
import { PaperClipIcon } from './icons/PaperClipIcon';
import PreviewModal from './PreviewModal';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { AudioIcon } from './icons/AudioIcon';
import { PdfIcon } from './icons/PdfIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { RefreshIcon } from './icons/RefreshIcon';

const getIconForMimeType = (type: string): { icon: React.ReactNode, color: string } => {
    if (type.startsWith('image/')) return { icon: <ImageIcon className="w-8 h-8" />, color: 'text-blue-500' };
    if (type.startsWith('video/')) return { icon: <VideoIcon className="w-8 h-8" />, color: 'text-red-500' };
    if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-8 h-8" />, color: 'text-purple-500' };
    if (type === 'application/pdf') return { icon: <PdfIcon className="w-8 h-8" />, color: 'text-orange-500' };
    return { icon: <DocumentIcon className="w-8 h-8" />, color: 'text-slate-500' };
};

interface AdminCommunicationViewProps {
  hospitals: Hospital[];
  onSendMessage: (hospitalId: string, content: { text?: string; fileData?: { name: string; type: string; dataUrl: string; } }) => void;
  onBack: () => void;
  onRefreshChat: () => void;
}

const AdminCommunicationView: React.FC<AdminCommunicationViewProps> = ({ hospitals, onSendMessage, onBack, onRefreshChat }) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(hospitals[0]?.id || null);
  const [replyTexts, setReplyTexts] = useState<{ [hospitalId: string]: string }>({});
  const [previewMaterial, setPreviewMaterial] = useState<Pick<TrainingMaterial, 'name'|'type'|'storagePath'> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [selectedHospitalId, selectedHospital?.adminMessages]);
  
  // Reset selection if hospitals list changes and selected one is gone
  useEffect(() => {
    if (selectedHospitalId && !hospitals.find(h => h.id === selectedHospitalId)) {
        setSelectedHospitalId(hospitals[0]?.id || null);
    } else if (!selectedHospitalId && hospitals.length > 0) {
        // Auto-select the first hospital on initial load if none is selected
        setSelectedHospitalId(hospitals[0].id);
    }
  }, [hospitals, selectedHospitalId]);


  const handleSendReply = (hospitalId: string) => {
    const text = replyTexts[hospitalId];
    if (text && text.trim()) {
      onSendMessage(hospitalId, { text: text.trim() });
      setReplyTexts(prev => ({ ...prev, [hospitalId]: '' }));
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedHospitalId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      
      onSendMessage(selectedHospitalId, {
          fileData: {
              name: file.name,
              type: file.type,
              dataUrl: dataUrl,
          }
      });
    } catch (error) {
      console.error("Error sending file:", error);
      alert("خطا در ارسال فایل.");
    } finally {
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, hospitalId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply(hospitalId);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col md:flex-row h-[calc(100vh-12rem)]">
        {/* Hospital List Column */}
        <div className={`w-full md:w-1/3 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col ${selectedHospitalId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold">بیمارستان‌ها</h2>
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600"
                >
                  <BackIcon className="w-5 h-5" />
                  بازگشت
                </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {hospitals.map(h => (
                  <button 
                      key={h.id} 
                      onClick={() => setSelectedHospitalId(h.id)} 
                      className={`w-full text-right p-4 border-b dark:border-slate-700 transition-colors ${selectedHospitalId === h.id ? 'bg-sky-100 dark:bg-sky-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                      <p className="font-bold text-slate-800 dark:text-slate-100">{h.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{(h.adminMessages || []).length} پیام</p>
                  </button>
              ))}
            </div>
        </div>
        
        {/* Chat View Column */}
        <div className={`w-full md:w-2/3 flex flex-col ${selectedHospitalId ? 'flex' : 'hidden md:flex'}`}>
          {selectedHospital ? (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedHospitalId(null)} className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden">
                        <BackIcon className="w-6 h-6"/>
                    </button>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedHospital.name}</h3>
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
                {(selectedHospital.adminMessages || []).map(msg => (
                  <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xl p-3 rounded-lg shadow ${msg.sender === 'admin' ? 'bg-green-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {msg.file && (
                        <button 
                          onClick={() => setPreviewMaterial({ name: msg.file!.name, type: msg.file!.type, storagePath: msg.file!.storagePath })}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className={`flex-shrink-0 ${msg.sender === 'admin' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            {getIconForMimeType(msg.file.type).icon}
                          </div>
                          <div>
                            <p className="font-semibold break-all">{msg.file.name}</p>
                            <p className="text-xs opacity-80">برای مشاهده کلیک کنید</p>
                          </div>
                        </button>
                      )}
                      <p className={`text-xs mt-1 text-right ${msg.sender === 'admin' ? 'text-green-100' : 'text-slate-400'}`}>
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
                  value={replyTexts[selectedHospital.id] || ''}
                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [selectedHospital.id]: e.target.value }))}
                  onKeyDown={(e) => handleKeyDown(e, selectedHospital.id)}
                  placeholder="پاسخ خود را بنویسید..."
                  rows={2}
                  className="flex-grow px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleSendReply(selectedHospital.id)}
                  className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  disabled={!(replyTexts[selectedHospital.id] || '').trim()}
                >
                  ارسال
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>برای مشاهده مکالمات، یک بیمارستان را انتخاب کنید.</p>
            </div>
          )}
        </div>
      </div>
      {previewMaterial && <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial}/>}
    </>
  );
};

export default AdminCommunicationView;