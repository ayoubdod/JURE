import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RotateCcw, Archive, FileText, Image, Video, Radio, File } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { API_ORIGIN } from '@/config/api';
import { getFileType } from '@/utils/functions';
import { cn } from '@/lib/utils';

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
const VIDEO_TYPES = ['mp4', 'webm', 'ogg', 'mov'];
const AUDIO_TYPES = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
const PDF_TYPES = ['pdf'];
const DOCX_TYPES = ['docx'];

interface FilePreviewerProps {
  fileUrl: string;
  fileName: string;
  title?: string;
  className?: string;
  /** Resolve URL - if relative, prepend base URL */
  resolveUrl?: (url: string) => string;
}

const getFileExtension = (fileName: string): string =>
  fileName.split('.').pop()?.toLowerCase() || '';

const UnsupportedFallback: React.FC<{
  fileUrl: string;
  fileName: string;
  title?: string;
  onDownload: () => void;
  fileIcon: React.ReactNode;
  extension: string;
  className?: string;
}> = ({ fileUrl, fileName, title, onDownload, fileIcon, extension, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center min-h-[200px] gap-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6',
      className
    )}
  >
    <div className="flex flex-col items-center gap-2">
      <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        {fileIcon}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {extension || 'File'}
      </p>
      <p className="text-[13px] text-slate-600 dark:text-slate-300 text-center max-w-[200px] truncate">
        {title || fileName}
      </p>
    </div>
    <Button
      onClick={onDownload}
      className="h-9 text-[13px] border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400 focus:ring-offset-0"
      variant="outline"
    >
      <Download size={14} className="mr-2" />
      Download to View
    </Button>
  </div>
);

const getFileIconByType = (fileName: string) => {
  const type = getFileType(fileName);
  const iconClass = 'text-slate-500 w-10 h-10';
  switch (type) {
    case 'archive':
      return <Archive className={iconClass} />;
    case 'document':
      return <FileText className={iconClass} />;
    case 'image':
      return <Image className={iconClass} />;
    case 'video':
      return <Video className={iconClass} />;
    case 'audio':
      return <Radio className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
};

export const FilePreviewer: React.FC<FilePreviewerProps> = ({
  fileUrl,
  fileName,
  title,
  className,
  resolveUrl = (url) => {
    if (!url || url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.startsWith('/') ? `${API_ORIGIN}${url}` : `${API_ORIGIN}/${url}`;
  },
}) => {
  const resolvedUrl = resolveUrl(fileUrl);
  const ext = getFileExtension(fileName);
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [docxError, setDocxError] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Image zoom state
  const [imageZoom, setImageZoom] = useState(1);

  const handleDownload = () => {
    const a = window.document.createElement('a');
    a.href = resolvedUrl;
    a.download = title || fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  // DOCX: fetch and render
  useEffect(() => {
    if (!DOCX_TYPES.includes(ext) || docxError) return;
    const container = docxContainerRef.current;
    if (!container) return;
    setDocxLoading(true);
    container.innerHTML = '';
    fetch(resolvedUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.arrayBuffer();
      })
      .then((buffer) => renderAsync(buffer, container, undefined, { inWrapper: true }))
      .catch(() => setDocxError(true))
      .finally(() => setDocxLoading(false));
  }, [resolvedUrl, ext, docxError]);

  // Reset zoom when file changes
  useEffect(() => {
    setImageZoom(1);
    setImageError(false);
    setPdfError(false);
    setDocxError(false);
  }, [resolvedUrl, fileName]);

  const fileIcon = getFileIconByType(fileName);

  // Images: aspect-ratio-aware with zoom
  if (IMAGE_TYPES.includes(ext) && !imageError) {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/50',
          className
        )}
      >
        <div className="flex items-center justify-center min-h-[180px] p-4 overflow-auto bg-slate-100/50 dark:bg-slate-800/30">
          <img
            src={resolvedUrl}
            alt={title || fileName}
            className="max-w-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${imageZoom})`,
              transformOrigin: 'center center',
            }}
            onError={() => setImageError(true)}
          />
        </div>
        <div className="flex items-center justify-center gap-2 py-2 px-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
            disabled={imageZoom <= 0.5}
          >
            <ZoomOut size={14} />
          </Button>
          <span className="text-[11px] text-slate-500 min-w-[3rem] text-center">
            {Math.round(imageZoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
            disabled={imageZoom >= 3}
          >
            <ZoomIn size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setImageZoom(1)}
          >
            <RotateCcw size={12} className="mr-1" />
            Reset
          </Button>
        </div>
      </div>
    );
  }

  // PDF: iframe (high-performance native viewer)
  if (PDF_TYPES.includes(ext)) {
    if (pdfError) {
      return (
        <UnsupportedFallback
          fileUrl={resolvedUrl}
          fileName={fileName}
          title={title}
          onDownload={handleDownload}
          fileIcon={fileIcon}
          extension="PDF"
          className={className}
        />
      );
    }
    return (
      <div
        className={cn(
          'rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900',
          className
        )}
      >
        <iframe
          src={`${resolvedUrl}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-[400px] border-0"
          title={title || 'PDF'}
          onError={() => setPdfError(true)}
        />
        <div className="flex justify-end gap-2 p-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px]"
            onClick={() => window.open(resolvedUrl, '_blank')}
          >
            Open in new tab
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={handleDownload}>
            <Download size={12} className="mr-1" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  // DOCX: rendered HTML
  if (DOCX_TYPES.includes(ext)) {
    if (docxError) {
      return (
        <UnsupportedFallback
          fileUrl={resolvedUrl}
          fileName={fileName}
          title={title}
          onDownload={handleDownload}
          fileIcon={fileIcon}
          extension="DOCX"
          className={className}
        />
      );
    }
    return (
      <div
        className={cn(
          'rounded-md border border-slate-200 dark:border-slate-800 overflow-auto bg-white dark:bg-slate-900 min-h-[200px] max-h-[400px]',
          className
        )}
      >
        {docxLoading && (
          <div className="flex items-center justify-center min-h-[200px] text-[13px] text-slate-500">
            Loading document...
          </div>
        )}
        <div
          ref={docxContainerRef}
          className="docx-preview-container p-6 prose prose-slate dark:prose-invert max-w-none text-[13px] [&_.docx-wrapper]:bg-white [&_.docx-wrapper]:dark:bg-slate-900"
          style={{ visibility: docxLoading ? 'hidden' : 'visible', minHeight: 200 }}
        />
      </div>
    );
  }

  // Video
  if (VIDEO_TYPES.includes(ext)) {
    return (
      <div
        className={cn(
          'rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden',
          className
        )}
      >
        <video controls className="w-full max-h-[400px]">
          <source src={resolvedUrl} />
        </video>
      </div>
    );
  }

  // Audio
  if (AUDIO_TYPES.includes(ext)) {
    return (
      <div
        className={cn(
          'rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/50 p-4',
          className
        )}
      >
        <audio controls className="w-full">
          <source src={resolvedUrl} />
        </audio>
      </div>
    );
  }

  // Image error fallback
  if (IMAGE_TYPES.includes(ext) && imageError) {
    return (
      <UnsupportedFallback
        fileUrl={resolvedUrl}
        fileName={fileName}
        title={title}
        onDownload={handleDownload}
        fileIcon={fileIcon}
        extension={ext}
        className={className}
      />
    );
  }

  // Unsupported file type
  return (
    <UnsupportedFallback
      fileUrl={resolvedUrl}
      fileName={fileName}
      title={title}
      onDownload={handleDownload}
      fileIcon={fileIcon}
      extension={ext || 'File'}
      className={className}
    />
  );
};

export default FilePreviewer;
