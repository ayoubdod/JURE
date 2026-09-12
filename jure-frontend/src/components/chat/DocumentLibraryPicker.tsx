import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
  Search,
  Upload,
  Library,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiGetDocuments, parseLibraryList } from '@/services/library/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import axiosInstance from '@/utils/axiosInstance';
import { BACKEND_BASE_URL } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

interface DocumentLibraryPickerProps {
  onSelect: (files: File[]) => void;
  onUploadClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

function fileExt(title: string | undefined | null): string {
  const name = String(title || '');
  const part = name.includes('.') ? name.split('.').pop() : '';
  return (part || 'FILE').toUpperCase().slice(0, 5);
}

function DocTypeIcon({ ext, className }: { ext: string; className?: string }) {
  const e = ext.toUpperCase();
  if (e === 'XLS' || e === 'XLSX' || e === 'CSV') {
    return <FileSpreadsheet className={className} />;
  }
  if (e === 'PDF') {
    return <FileType2 className={className} />;
  }
  return <FileText className={className} />;
}

function docAccent(ext: string): string {
  const e = ext.toUpperCase();
  if (e === 'PDF') return 'bg-rose-500/12 text-rose-600 dark:text-rose-400';
  if (e === 'DOC' || e === 'DOCX' || e === 'ODT' || e === 'RTF') {
    return 'bg-sky-500/12 text-sky-700 dark:text-sky-400';
  }
  if (e === 'XLS' || e === 'XLSX' || e === 'CSV') {
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400';
  }
  if (e === 'PPT' || e === 'PPTX') {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-400';
  }
  return 'bg-[#64499D]/12 text-[#64499D] dark:text-[#CFC2FF]';
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
  const [query, setQuery] = useState('');
  const [attachingId, setAttachingId] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setAttachingId(null);
      return;
    }
    setLoading(true);
    apiGetDocuments({ all: true })
      .then((res) => {
        setDocs(parseLibraryList(res.data));
      })
      .catch(() => {
        toast({
          title: t.common.error,
          description: t.conversations.loadDocumentsFailed,
          variant: 'destructive',
        });
      })
      .finally(() => setLoading(false));
  }, [open, toast, t.common.error, t.conversations.loadDocumentsFailed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => String(d.title || '').toLowerCase().includes(q));
  }, [docs, query]);

  const handleSelect = async (doc: API.Document) => {
    if (attachingId != null) return;
    setAttachingId(doc.id);
    try {
      const url = doc.file.startsWith('http')
        ? doc.file
        : `${BACKEND_BASE_URL.replace(/\/$/, '')}${doc.file.startsWith('/') ? '' : '/'}${doc.file}`;
      const res = await axiosInstance.get(url, { responseType: 'blob' });
      const ext = (doc.title || '').split('.').pop() || 'pdf';
      const file = new File([res.data], doc.title || `document-${doc.id}.${ext}`, {
        type: res.data.type || 'application/octet-stream',
      });
      onSelect([file]);
      setOpen(false);
    } catch {
      toast({
        title: t.common.error,
        description: t.conversations.attachDocumentFailed,
        variant: 'destructive',
      });
    } finally {
      setAttachingId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          'z-[310] w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-[0_12px_40px_rgba(15,23,42,0.12)]',
          'dark:border-slate-700 dark:bg-slate-950'
        )}
      >
        <div className="border-b border-slate-100 bg-gradient-to-b from-[#F7F4FF] to-white px-3 py-3 dark:border-slate-800 dark:from-[#24183F]/50 dark:to-slate-950">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#64499D]/12 text-[#64499D] dark:bg-[#64499D]/25 dark:text-[#CFC2FF]">
              <Library className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t.conversations.documentLibrary}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t.conversations.attachDocsHint}
              </p>
            </div>
          </div>

          {onUploadClick ? (
            <Button
              type="button"
              size="sm"
              className="mt-3 h-9 w-full gap-2 rounded-xl bg-[#64499D] text-white hover:bg-[#553d86]"
              onClick={() => {
                setOpen(false);
                onUploadClick();
              }}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {t.conversations.uploadFromDevice}
            </Button>
          ) : null}

          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.conversations.searchDocuments}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-8 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#64499D]/40 focus:outline-none focus:ring-2 focus:ring-[#64499D]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label={t.conversations.searchDocuments}
            />
          </div>
        </div>

        <ScrollArea className="h-56">
          {loading ? (
            <div className="flex h-28 flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[11px]">{t.conversations.loadingDocuments}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-28 flex-col items-center justify-center gap-1 px-4 text-center">
              <FileText className="h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                {query.trim() ? t.conversations.noDocumentsMatch : t.conversations.noDocuments}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1.5">
              {filtered.slice(0, 40).map((doc) => {
                const ext = fileExt(doc.title);
                const busy = attachingId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    disabled={attachingId != null}
                    onClick={() => void handleSelect(doc)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors',
                      'hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-slate-800/70',
                      busy && 'bg-[#64499D]/8',
                      attachingId != null && !busy && 'opacity-50'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg',
                        docAccent(ext)
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <DocTypeIcon ext={ext} className="h-3.5 w-3.5" />
                          <span className="mt-0.5 text-[8px] font-bold leading-none tracking-wide">
                            {ext}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                        {doc.title || t.conversations.untitled}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-slate-500 dark:text-slate-400">
                        {busy ? t.conversations.attachingDocument : ext}
                      </span>
                    </span>
                    {doc.is_shared ? (
                      <span className="shrink-0 rounded-md border border-[#64499D]/25 bg-[#64499D]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#64499D] dark:text-[#CFC2FF]">
                        {t.library.publicLibraryBadge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-center gap-1.5 rounded-lg text-[12px] text-slate-600 hover:text-[#64499D] dark:text-slate-300"
            onClick={() => {
              setOpen(false);
              navigate('/dashboard/library');
            }}
          >
            <Library className="h-3.5 w-3.5" aria-hidden />
            {t.conversations.openLibrary}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentLibraryPicker;
