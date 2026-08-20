import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiGetDocuments } from '@/services/library/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import axiosInstance from '@/utils/axiosInstance';
import { BACKEND_BASE_URL } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';

interface DocumentLibraryPickerProps {
  onSelect: (files: File[]) => void;
  onUploadClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const DocumentLibraryPicker: React.FC<DocumentLibraryPickerProps> = ({
  onSelect,
  onUploadClick,
  children,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<API.Document[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  useEffect(() => {
    if (open) {
      setLoading(true);
      apiGetDocuments({ all: true })
        .then((res) => {
          const data = res.data;
          const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
          setDocs(list);
        })
        .catch(() => {
          toast({ title: t.common.error, description: t.conversations.loadDocumentsFailed, variant: 'destructive' });
        })
        .finally(() => setLoading(false));
    }
  }, [open, toast]);

  const handleSelect = async (doc: API.Document) => {
    setOpen(false);
    try {
      const url = doc.file.startsWith('http') ? doc.file : `${BACKEND_BASE_URL.replace(/\/$/, '')}${doc.file.startsWith('/') ? '' : '/'}${doc.file}`;
      const res = await axiosInstance.get(url, { responseType: 'blob' });
      const ext = (doc.title || '').split('.').pop() || 'pdf';
      const file = new File([res.data], doc.title || `document-${doc.id}.${ext}`, { type: res.data.type || 'application/octet-stream' });
      onSelect([file]);
    } catch {
      toast({ title: t.common.error, description: t.conversations.attachDocumentFailed, variant: 'destructive' });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t.conversations.documentLibrary}
          </p>
        </div>
        <ScrollArea className="h-48">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : docs.length === 0 ? (
            <div className="p-4 text-center text-[12px] text-slate-500">
              {t.conversations.noDocuments}
            </div>
          ) : (
            <div className="p-1 space-y-0.5">
              {docs.slice(0, 20).map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelect(doc)}
                  className="w-full flex items-center gap-2 px-2 py-0.5 rounded text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-[13px]"
                >
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{doc.title || t.conversations.untitled}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
          {onUploadClick && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[12px]"
              onClick={() => {
                setOpen(false);
                onUploadClick();
              }}
            >
              {t.conversations.uploadFile}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-[12px]"
            onClick={() => {
              setOpen(false);
              navigate('/dashboard/library');
            }}
          >
            {t.conversations.openLibrary}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentLibraryPicker;
