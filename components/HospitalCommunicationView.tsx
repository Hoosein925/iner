
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

const getIconForMimeType = (type: string): { icon: React.ReactNode, color: string } => {
    if (type.startsWith('image/')) return { icon: <ImageIcon className="w-8 h-8" />, color: 'text-blue-500' };
    if (type.startsWith('video/')) return { icon: <VideoIcon className="w-8 h-8" />, color: 'text-red-500' };
    if (type.startsWith('audio/')) return { icon: <AudioIcon className="w-8 h-8" />, color: 'text-purple-500' };
    if (type === 'application/pdf') return { icon: <PdfIcon className="w-8 h-8" />, color: 'text-orange-500' };
    return { icon: <DocumentIcon className="w-8 h-8" />, color: 'text-slate-500' };
};

interface HospitalCommunicationViewProps {
  hospital: Hospital;
  onSendMessage: (content: { text?: string; file?: { id: string; name: string; type: string; } }) => void;
  onBack: () => void;
}

const HospitalCommunicationView: React.FC<HospitalCommunicationViewProps> = ({ hospital, onSendMessage, onBack }) => {
  const [newMessage, setNewMessage] = useState('');
  const [previewMaterial, setPreviewMaterial] = useState<TrainingMaterial | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [hospital.adminMessages]);

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
          file: {
              id: fileId,
              name: file.name,
              type: file.type,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">تماس با ادمین کل - {hospital.name}</h2>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          {(hospital.adminMessages || []).map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'hospital' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-3 rounded-lg shadow ${msg.sender === 'hospital' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                {msg.file && (
                  <button 
                    onClick={() => setPreviewMaterial({ id: msg.file!.id, name: msg.file!.name, type: msg.file!.type })}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className={`flex-shrink-0 ${msg.sender === 'hospital' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                      {getIconForMimeType(msg.file.type).icon}
                    </div>
                    <div>
                      <p className="font-semibold break-all">{msg.file.name}</p>
                      <p className="text-xs opacity-80">برای مشاهده کلیک کنید</p>
                    </div>
                  </button>
                )}
                <p className={`text-xs mt-1 text-right ${msg.sender === 'hospital' ? 'text-sky-100' : 'text-slate-400'}`}>
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
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="پیام خود را بنویسید..."
            rows={2}
            className="flex-grow px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSend}
            className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            disabled={!newMessage.trim()}
          >
            ارسال
          </button>
        </div>
      </div>
      <PreviewModal isOpen={!!previewMaterial} onClose={() => setPreviewMaterial(null)} material={previewMaterial!}/>
    </>
  );
};

export default HospitalCommunicationView;
