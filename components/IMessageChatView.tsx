import React, { useState, useRef, useEffect } from 'react';
import { Hospital, TrainingMaterial } from '../types';
import { BackIcon } from './icons/BackIcon';
import PreviewModal from './PreviewModal';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { AudioIcon } from './icons/AudioIcon';
import { PdfIcon } from './icons/PdfIcon';
import { DocumentIcon } from './icons/DocumentIcon';

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type.startsWith('video/')) return <VideoIcon className="w-5 h-5 text-rose-500" />;
  if (type.startsWith('audio/')) return <AudioIcon className="w-5 h-5 text-purple-500" />;
  if (type === 'application/pdf') return <PdfIcon className="w-5 h-5 text-amber-500" />;
  return <DocumentIcon className="w-5 h-5 text-slate-500" />;
};

interface IMessageChatViewProps {
  isAdmin: boolean;
  hospitals: Hospital[];
  currentHospital?: Hospital;
  onSendMessage: (
    hospitalId: string,
    content: { text?: string; fileData?: { name: string; type: string; dataUrl: string } }
  ) => void;
  onBack: () => void;
  onRefreshChat: () => void;
}

export const IMessageChatView: React.FC<IMessageChatViewProps> = ({
  isAdmin,
  hospitals,
  currentHospital,
  onSendMessage,
  onBack,
  onRefreshChat,
}) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    currentHospital?.id || hospitals[0]?.id || ''
  );
  const [inputText, setInputText] = useState('');
  const [previewMaterial, setPreviewMaterial] = useState<Pick<TrainingMaterial, 'name' | 'type' | 'storagePath'> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  // Mobile responsive view mode for Admin: 'list' (hospital list) or 'chat' (active conversation)
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'chat'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeHospital = isAdmin
    ? hospitals.find(h => h.id === selectedHospitalId) || hospitals[0]
    : currentHospital;

  // 3-second auto-poll sync with database
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSyncing(true);
      onRefreshChat();
      setTimeout(() => setIsSyncing(false), 500);
    }, 3000);

    return () => clearInterval(timer);
  }, [onRefreshChat]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeHospital?.adminMessages]);

  const handleSend = () => {
    if (!inputText.trim() || !activeHospital) return;
    onSendMessage(activeHospital.id, { text: inputText.trim() });
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeHospital) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
      });

      onSendMessage(activeHospital.id, {
        fileData: {
          name: file.name,
          type: file.type,
          dataUrl,
        },
      });
    } catch (err) {
      alert('خطا در بارگذاری فایل.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredHospitals = hospitals.filter(
    h =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.province.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)] max-w-6xl mx-auto bg-[#F2F2F7] dark:bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 font-sans">
      {/* Top iOS Header Bar */}
      <div className="bg-white/95 dark:bg-slate-850/95 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-800 dark:text-white shrink-0 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs sm:text-sm font-bold text-[#007AFF]"
          >
            <BackIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>بازگشت</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          <div>
            <h1 className="text-xs sm:text-base font-black flex items-center gap-1.5 sm:gap-2">
              <span>💬 پیام‌رسان بیمارستان‌ها (طرح iMessage)</span>
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
            </h1>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              همگام‌سازی لحظه‌ای هر ۳ ثانیه با دیتابیس
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Switch button between Sidebar and Chat */}
          {isAdmin && (
            <button
              onClick={() => setMobileViewMode(m => (m === 'list' ? 'chat' : 'list'))}
              className="md:hidden px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1"
            >
              <span>{mobileViewMode === 'list' ? '💬 چت' : '🏥 بیمارستان‌ها'}</span>
            </button>
          )}

          <button
            onClick={onRefreshChat}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs"
            title="بروزرسانی دستی پیام‌ها"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">همگام‌سازی</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Hospital List Sidebar (Only for Admin) */}
        {isAdmin && (
          <div
            className={`w-full md:w-72 lg:w-80 bg-white dark:bg-slate-850 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
              mobileViewMode === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 جستجوی بیمارستان یا شهر..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHospitals.map(h => {
                const isSelected = h.id === activeHospital?.id;
                const msgCount = h.adminMessages?.length || 0;
                const lastMsg = msgCount > 0 ? h.adminMessages![msgCount - 1] : null;

                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      setSelectedHospitalId(h.id);
                      setMobileViewMode('chat');
                    }}
                    className={`w-full p-3 text-right flex items-center gap-3 transition ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-r-4 border-[#007AFF]'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#007AFF] to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                      {h.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {h.name}
                        </h4>
                        {lastMsg && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(lastMsg.timestamp).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {lastMsg?.text || (lastMsg?.file ? '📎 فایل ضمیمه' : `${h.province} - ${h.city}`)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Conversation Panel */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 relative ${
            isAdmin && mobileViewMode === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeHospital ? (
            <>
              {/* iMessage Contact Header */}
              <div className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {isAdmin && (
                    <button
                      onClick={() => setMobileViewMode('list')}
                      className="md:hidden p-1.5 text-[#007AFF] font-bold text-xs flex items-center gap-1 hover:bg-slate-200/50 rounded-lg transition"
                    >
                      <BackIcon className="w-4 h-4" />
                      <span>لیست</span>
                    </button>
                  )}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#007AFF] to-indigo-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm shrink-0">
                    {activeHospital.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{activeHospital.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#007AFF] dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                        {activeHospital.province} | {activeHospital.city}
                      </span>
                    </h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{isAdmin ? `سوپروایزر: ${activeHospital.supervisorName || 'تعریف‌نشده'}` : 'ادمین کل سامانه (آنلاین)'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block font-bold">
                  {activeHospital.adminMessages?.length || 0} پیام
                </div>
              </div>

              {/* Messages Body (Apple iMessage Bubbles) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-[#F2F2F7] dark:bg-slate-900/60">
                {(!activeHospital.adminMessages || activeHospital.adminMessages.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm space-y-2 text-center p-6">
                    <span className="text-4xl">💬</span>
                    <p className="font-bold text-slate-600 dark:text-slate-300">هنوز پیامی بین شما و {activeHospital.name} ارسال نشده است.</p>
                    <p className="text-xs text-slate-400">پیام یا فایل آموزشی خود را در کادر زیر بنویسید تا بلافاصله همگام‌سازی شود.</p>
                  </div>
                )}

                {activeHospital.adminMessages?.map(msg => {
                  const isMine = isAdmin ? msg.sender === 'admin' : msg.sender === 'hospital';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label if other person */}
                      {!isMine && (
                        <span className="text-[10px] font-bold text-slate-500 mb-1 mr-2">
                          {isAdmin ? activeHospital.name : 'ادمین کل سامانه'}
                        </span>
                      )}

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3 sm:p-3.5 rounded-2xl shadow-sm space-y-1.5 ${
                          isMine
                            ? 'bg-[#007AFF] text-white rounded-br-xs'
                            : 'bg-[#E9E9EB] dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/60 dark:border-slate-700'
                        }`}
                      >
                        {/* Text Content */}
                        {msg.text && (
                          <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words dir-rtl">
                            {msg.text}
                          </p>
                        )}

                        {/* File Attachment Card */}
                        {msg.file && (
                          <div
                            onClick={() =>
                              setPreviewMaterial({
                                name: msg.file!.name,
                                type: msg.file!.type,
                                storagePath: msg.file!.storagePath,
                              })
                            }
                            className={`p-2.5 rounded-xl cursor-pointer transition flex items-center gap-2.5 ${
                              isMine
                                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                                : 'bg-white dark:bg-slate-700/80 hover:bg-slate-50 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 shadow-xs'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/20 dark:bg-slate-600/50 flex items-center justify-center shrink-0">
                              {getFileIcon(msg.file.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold block truncate">{msg.file.name}</span>
                              <span className="text-[10px] opacity-80 block">برای مشاهده یا دانلود کلیک کنید</span>
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div
                          className={`text-[9px] font-mono text-left ${
                            isMine ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* iMessage Input Bar */}
              <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 bg-[#F2F2F7] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full px-3 py-1.5 shadow-xs focus-within:ring-2 focus-within:ring-[#007AFF] focus-within:border-transparent transition">
                  {/* File Attachment Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 flex items-center justify-center transition shadow-xs shrink-0 active:scale-95"
                    title="ارسال عکس، ویدیو، صوت یا PDF"
                  >
                    📎
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,audio/*,application/pdf"
                  />

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="پیام خود را بنویسید (طرح iMessage)..."
                    className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none px-1"
                  />

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition shadow-sm shrink-0 ${
                      inputText.trim()
                        ? 'bg-[#007AFF] hover:bg-blue-600 active:scale-95'
                        : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-400'
                    }`}
                    title="ارسال پیام"
                  >
                    <span className="transform rotate-180 text-sm">➔</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs sm:text-sm">
              لطفاً یک بیمارستان را از لیست انتخاب کنید.
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal for Media Files */}
      {previewMaterial && (
        <PreviewModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}
    </div>
  );
};

export default IMessageChatView;
