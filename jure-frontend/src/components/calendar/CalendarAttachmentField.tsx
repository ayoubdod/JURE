'use client';

import { useMemo, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import axiosInstance from '@/utils/axiosInstance';
import { useLanguage } from '@/hooks/useLanguage';

export type CalendarAttachment = {
  id: number;
  name: string;
  original_name?: string;
  mime?: string;
  size: number;
  url?: string;
  preview_url?: string;
  uploaded_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  created?: string;
};

export type PendingAttachment = {
  key: string;
  file: File;
};

function formatBytes(size: number) {
  if (!size || size < 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function isImage(mime?: string, name?: string) {
  if (mime?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name || '');
}

export async function uploadCalendarAttachments(
  endpoint: string,
  files: File[]
): Promise<CalendarAttachment[]> {
  if (!files.length) return [];
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const res = await axiosInstance.post<CalendarAttachment[]>(endpoint, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function deleteCalendarAttachment(endpoint: string) {
  await axiosInstance.delete(endpoint);
}

export function openAttachment(att: CalendarAttachment, mode: 'download' | 'preview' = 'download') {
  const path = mode === 'preview' ? att.preview_url || att.url : att.url || att.preview_url;
  if (!path) return;
  const apiPath = path.startsWith('/api/v1/') ? path.replace(/^\/api\/v1/, '') : path;
  void axiosInstance
    .get(apiPath, { responseType: 'blob' })
    .then((res) => {
      const blob = res.data as Blob;
      const objectUrl = URL.createObjectURL(blob);
      if (mode === 'preview' && (att.mime?.startsWith('image/') || /\.pdf$/i.test(att.name || ''))) {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = att.name || att.original_name || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    })
    .catch(() => {
      /* swallow — toast handled by caller if needed */
    });
}

export default function CalendarAttachmentField({
  existing = [],
  pending,
  onPendingChange,
  onRemoveExisting,
  disabled,
  uploading,
}: {
  existing?: CalendarAttachment[];
  pending: PendingAttachment[];
  onPendingChange: (next: PendingAttachment[]) => void;
  onRemoveExisting?: (id: number) => void;
  disabled?: boolean;
  uploading?: boolean;
}) {
  const { t } = useAppTranslation();
  const a = t.calendar.attachments;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const allPendingKeys = useMemo(() => new Set(pending.map((p) => p.key)), [pending]);

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const next = [...pending];
    for (const file of list) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
      if (allPendingKeys.has(key)) continue;
      next.push({ key, file });
    }
    onPendingChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-xl border border-dashed px-4 py-5 text-center transition-colors',
          dragOver
            ? 'border-[#64499D] bg-[#F7F4FF] dark:bg-[#64499D]/15'
            : 'border-slate-300 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-950/40'
        )}
      >
        <Paperclip className="mx-auto h-5 w-5 text-[#64499D]" />
        <p className="mt-2 text-[13px] font-medium text-slate-700 dark:text-zinc-200">{a.addFiles}</p>
        <p className="mt-1 text-[12px] text-slate-500">{a.dropHint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 rounded-lg"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : null}
          {a.browse}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.currentTarget.value = '';
          }}
        />
      </div>

      {(existing.length > 0 || pending.length > 0) && (
        <ul className="space-y-2">
          {existing.map((att) => {
            const name = att.name || att.original_name || 'file';
            const Icon = isImage(att.mime, name) ? ImageIcon : FileText;
            return (
              <li
                key={`ex-${att.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => openAttachment(att, isImage(att.mime, name) ? 'preview' : 'download')}
                >
                  <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                    {name}
                  </span>
                  <span className="block text-[11px] text-slate-500">{formatBytes(att.size)}</span>
                </button>
                {onRemoveExisting ? (
                  <button
                    type="button"
                    aria-label={a.remove}
                    disabled={disabled || uploading}
                    onClick={() => onRemoveExisting(att.id)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
          {pending.map((item) => {
            const Icon = isImage(item.file.type, item.file.name) ? ImageIcon : FileText;
            return (
              <li
                key={item.key}
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-900/40 px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatBytes(item.file.size)}</p>
                </div>
                <button
                  type="button"
                  aria-label={a.remove}
                  disabled={disabled || uploading}
                  onClick={() => onPendingChange(pending.filter((p) => p.key !== item.key))}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CalendarAttachmentList({
  attachments,
  emptyLabel,
}: {
  attachments: CalendarAttachment[];
  emptyLabel?: string;
}) {
  const { t } = useAppTranslation();
  const { lang } = useLanguage();
  const a = t.calendar.attachments;
  if (!attachments?.length) {
    return emptyLabel ? <p className="text-sm text-slate-500">{emptyLabel}</p> : null;
  }
  return (
    <ul className="space-y-2">
      {attachments.map((att) => {
        const name = att.name || att.original_name || 'file';
        const Icon = isImage(att.mime, name) ? ImageIcon : FileText;
        const uploader = att.uploaded_by_details
          ? `${att.uploaded_by_details.first_name || ''} ${att.uploaded_by_details.last_name || ''}`.trim() ||
            att.uploaded_by_details.email
          : null;
        return (
          <li key={att.id}>
            <button
              type="button"
              onClick={() => openAttachment(att, isImage(att.mime, name) ? 'preview' : 'download')}
              className="flex w-full items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-start hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                  {name}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {formatBytes(att.size)}
                  {uploader ? ` · ${uploader}` : ''}
                  {att.created
                    ? ` · ${formatDate(att.created, lang, { day: 'numeric', month: 'short' })}`
                    : ''}
                </span>
              </span>
              <span className="text-[11px] text-[#64499D] shrink-0">{a.open}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
