import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { API_ORIGIN } from '@/config/api';

export interface DocumentPreviewModalRef {
  show: (doc: API.Document) => void;
}

const DocumentPreviewModal = forwardRef<DocumentPreviewModalRef>((_, ref) => {
  const [currentDocument, setCurrentDocument] = useState<API.Document | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const { t } = useAppTranslation();

  useImperativeHandle(ref, () => ({
    show: (doc: API.Document) => {
      setCurrentDocument(doc);
      setPdfError(false);
    },
  }));

  // Ensure file URL is absolute
  const getFileUrl = (fileUrl: string) => {
    if (!fileUrl) return '';
    // If it's already an absolute URL, return as is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    return fileUrl.startsWith('/') ? `${API_ORIGIN}${fileUrl}` : `${API_ORIGIN}/${fileUrl}`;
  };

  const renderPreview = () => {
    if (!currentDocument) return null;
    const fileUrl = getFileUrl(currentDocument.file);
    const type = currentDocument.file.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type || '')) {
      return (
        <div className="flex justify-center">
          <img 
            src={fileUrl} 
            alt={document.title} 
            className="max-h-[70vh] w-auto mx-auto rounded-lg shadow-lg" 
            onError={() => setPdfError(true)}
          />
        </div>
      );
    }

    if (['mp4', 'webm', 'ogg'].includes(type || '')) {
      return (
        <div className="flex justify-center">
          <video controls className="max-h-[70vh] mx-auto rounded-lg">
            <source src={fileUrl} />
            {t.document.videoNotSupported}
          </video>
        </div>
      );
    }

    if (type === 'pdf') {
      if (pdfError) {
        return (
          <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 p-8">
            <p className="text-center text-gray-500 mb-4">
              {t.document.pdfErrorMessage}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => window.open(fileUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink size={16} />
                {t.document.openInNewWindow}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const link = window.document.createElement('a');
                  link.href = fileUrl;
                  link.download = currentDocument.title || 'document.pdf';
                  link.click();
                }}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                {t.document.download}
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="w-full h-[70vh] border rounded-lg overflow-hidden bg-gray-50">
          {/* Try iframe first */}
          <iframe
            key={fileUrl}
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0"
            title={currentDocument.title}
            style={{ minHeight: '600px' }}
          />
          {/* Fallback object tag (hidden, used if iframe fails) */}
          <object
            data={fileUrl}
            type="application/pdf"
            className="w-full h-full hidden"
            aria-label={currentDocument.title}
          >
            <embed
              src={fileUrl}
              type="application/pdf"
              className="w-full h-full"
            />
          </object>
          <div className="mt-2 flex justify-end gap-2 p-2 bg-white border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fileUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink size={14} />
              {t.document.openInNewWindow}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = window.document.createElement('a');
                link.href = fileUrl;
                link.download = currentDocument.title || 'document.pdf';
                link.click();
              }}
              className="flex items-center gap-2"
            >
              <Download size={14} />
              {t.document.download}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 p-8">
        <p className="text-center text-gray-500 mb-4">
          {t.document.noPreviewTitle}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => window.open(fileUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink size={16} />
            {t.document.openFile}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const link = window.document.createElement('a');
              link.href = fileUrl;
              link.download = currentDocument.title || 'file';
              link.click();
            }}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            {t.document.download}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={!!currentDocument} onOpenChange={() => {
      setCurrentDocument(null);
      setPdfError(false);
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{currentDocument?.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
});

DocumentPreviewModal.displayName = 'DocumentPreviewModal';

export default DocumentPreviewModal;
