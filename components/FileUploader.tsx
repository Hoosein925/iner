import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  accept: string;
  title: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, accept, title }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200
        ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload-input')?.click()}
    >
      <input
        type="file"
        id="file-upload-input"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
      <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 dark:text-slate-400">
        <UploadIcon className="w-12 h-12" />
        <p className="font-semibold">{title}</p>
        <p className="text-sm">فایل را بکشید و رها کنید یا کلیک کنید</p>
      </div>
    </div>
  );
};

export default FileUploader;