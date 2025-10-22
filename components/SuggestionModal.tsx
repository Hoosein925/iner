import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { AiIcon } from './icons/AiIcon';
import { DocumentIcon } from './icons/DocumentIcon';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string | null;
  isLoading: boolean;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, title, content, isLoading }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsPdfDownloading(true);

    const staffName = title.replace('برنامه پیشنهادی برای ', '');
    const filename = `برنامه-بهبود-${staffName.replace(/ /g, '_')}.pdf`;

    try {
        const contentElement = contentRef.current;
        
        // Temporarily adjust styles for better PDF rendering
        const originalStyles = contentElement.style.cssText;
        contentElement.style.padding = '20px'; // Add padding for margins
        contentElement.style.direction = 'rtl';
        
        const pdf = new jsPDF('p', 'pt', 'a4');
        
        // Add Vazirmatn font to jsPDF
        // This is a complex step requiring font files (e.g., .ttf) to be converted to a format jsPDF understands.
        // For simplicity, we'll rely on the browser's rendering via html2canvas which is now part of the .html method.
        // A more advanced implementation would load the font directly.
        
        await pdf.html(contentElement, {
            callback: function (doc) {
                doc.save(filename);
            },
            x: 15,
            y: 15,
            width: 565, // A4 width in points (595) minus margins (15*2)
            windowWidth: contentElement.scrollWidth,
            html2canvas: {
                scale: 0.75,
                useCORS: true,
                letterRendering: true,
            },
            autoPaging: 'text',
        });
        
        // Restore original styles
        contentElement.style.cssText = originalStyles;

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("خطایی در ساخت فایل PDF رخ داد.");
    } finally {
        setIsPdfDownloading(false);
    }
  };

  const handleDownloadWord = () => {
    if (!contentRef.current) return;

    const staffName = title.replace('برنامه پیشنهادی برای ', '');
    const filename = `برنامه-بهبود-${staffName.replace(/ /g, '_')}.doc`;
    
    // Get the innerHTML of the formatted content
    const contentHtml = contentRef.current.querySelector('.prose')?.innerHTML || '';

    // Create the full HTML structure for the Word document
    const sourceHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Improvement Plan</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:RightToLeft/>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Vazirmatn', 'Times New Roman', serif; direction: rtl; }
          @page WordSection1 {
            size: 8.5in 11.0in;
            margin: 1.0in 1.0in 1.0in 1.0in;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          strong { font-weight: bold; }
          blockquote { border-right: 4px solid #ccc; padding-right: 10px; margin-right: 0; font-style: italic; color: #555; }
          hr { border-top: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <h1>${title}</h1>
          ${contentHtml}
        </div>
      </body>
      </html>`;

    // Create a Blob and trigger download
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = filename;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const formatContent = (text: string | null): string => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/---/g, '<hr class="my-4 border-slate-300 dark:border-slate-600" />')
      .replace(/<QUOTE>(.*?)<\/QUOTE>/gs, (match, p1) => `<blockquote class="border-r-4 border-slate-300 dark:border-slate-600 pr-4 italic text-slate-500 dark:text-slate-400 my-4">${p1.trim().replace(/\n/g, '<br />')}</blockquote>`)
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 bg-white dark:bg-slate-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AiIcon className="w-6 h-6 text-indigo-500" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow bg-white dark:bg-slate-800">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="animate-spin h-12 w-12 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-slate-500">در حال آماده سازی برنامه پیشنهادی...</p>
            </div>
          ) : (
            <div ref={contentRef} className="bg-white dark:bg-slate-800">
                <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatContent(content) }}></div>
            </div>
          )}
        </div>
        {!isLoading && content && (
           <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
                <button 
                    onClick={handleDownloadWord} 
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600"
                >
                    <DocumentIcon className="w-5 h-5" />
                    دانلود Word (پیشنهادی)
                </button>
                <button 
                    onClick={handleDownloadPdf}
                    disabled={isPdfDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-wait"
                >
                     <DocumentIcon className="w-5 h-5" />
                     {isPdfDownloading ? 'در حال ساخت...' : 'دانلود PDF'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionModal;