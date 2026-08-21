import React, { memo } from 'react';
import {
  Archive,
  Copy,
  Download,
  Edit,
  Eye,
  File,
  FileText,
  Image,
  Radio,
  Star,
  Trash2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileType } from '@/utils/functions';
import { DocumentCategory } from '@/utils/constants';
import { cn } from '@/lib/utils';
import { formatFileSize, isPlatformShared, riskStyles } from './knowledgeUtils';
import type { EnrichedDocument } from './types';
import { useAppTranslation } from '@/i18n';

type Props = {
  document: EnrichedDocument;
  selected?: boolean;
  isFavorite?: boolean;
  onSelect: (doc: EnrichedDocument) => void;
  onOpen: (doc: EnrichedDocument) => void;
  onEdit: (e: React.MouseEvent, doc: EnrichedDocument) => void;
  onDownload: (e: React.MouseEvent, doc: EnrichedDocument) => void;
  onDelete: (e: React.MouseEvent, doc: EnrichedDocument) => void;
  onCopy?: (e: React.MouseEvent, doc: EnrichedDocument) => void;
  onToggleFavorite: (e: React.MouseEvent, doc: EnrichedDocument) => void;
};

function FileIcon({ file }: { file: string }) {
  const type = getFileType(file);
  const cls = 'h-4 w-4 text-[#64499D]/70 dark:text-[#CFC2FF]/80';
  switch (type) {
    case 'archive':
      return <Archive className={cls} />;
    case 'document':
      return <FileText className={cls} />;
    case 'image':
      return <Image className={cls} />;
    case 'video':
      return <Video className={cls} />;
    case 'audio':
      return <Radio className={cls} />;
    default:
      return <File className={cls} />;
  }
}

const KnowledgeCard = memo(function KnowledgeCard({
  document: doc,
  selected,
  isFavorite,
  onSelect,
  onOpen,
  onEdit,
  onDownload,
  onDelete,
  onCopy,
  onToggleFavorite,
}: Props) {
  const { t } = useAppTranslation();
  const shared = isPlatformShared(doc);
  const category =
    DocumentCategory.options.find((c) => c.value === doc.category)?.label || doc.category;
  const { insight } = doc;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${doc.title}, knowledge score ${insight.knowledgeScore}`}
      onClick={() => onSelect(doc)}
      onDoubleClick={() => onOpen(doc)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(doc);
        }
      }}
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border p-3 transition-[border-color,box-shadow] duration-150',
        'bg-white dark:bg-slate-950',
        'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40',
        'motion-reduce:transition-none',
        selected
          ? 'border-[#64499D]/45 ring-1 ring-[#64499D]/20'
          : 'border-slate-200/90 dark:border-slate-800'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-[#F4F1FF]/60 dark:border-slate-800 dark:bg-[#64499D]/15">
          <FileIcon file={doc.file} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900 dark:text-slate-50">
              {doc.title}
            </h3>
            <button
              type="button"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => onToggleFavorite(e, doc)}
              className={cn(
                'rounded-md p-1 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center',
                isFavorite
                  ? 'text-amber-500'
                  : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-500'
              )}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
            </button>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {insight.summary}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {category}
        </span>
        {shared ? (
          <span className="rounded-md border border-[#64499D]/25 bg-[#64499D]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#64499D] dark:text-[#CFC2FF]">
            {t.library.publicLibraryBadge}
          </span>
        ) : null}
        {insight.aiIndexed ? (
          <span className="rounded-md border border-[#64499D]/20 bg-[#64499D]/08 px-1.5 py-0.5 text-[10px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
            AI Indexed
          </span>
        ) : (
          <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            Pending
          </span>
        )}
        <span
          className={cn(
            'rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize',
            riskStyles(insight.riskLevel)
          )}
        >
          {insight.riskLevel} risk
        </span>
        <span className="rounded-md border border-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 dark:border-slate-700">
          {insight.language}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800/80">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-slate-400 truncate">
            {new Date(doc.modified).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            <span className="mx-1 text-slate-300">·</span>
            {formatFileSize(doc.size)}
            <span className="mx-1 text-slate-300">·</span>
            Score {insight.knowledgeScore}
          </span>
        </div>
        <div
          className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
            onClick={() => onOpen(doc)}
            aria-label="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {shared ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-[#64499D]"
              onClick={(e) => onCopy?.(e, doc)}
              aria-label={t.library.addToMyLibrary}
              title={t.library.addToMyLibrary}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
              onClick={(e) => onEdit(e, doc)}
              aria-label="Edit"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
            onClick={(e) => onDownload(e, doc)}
            aria-label="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {shared ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
              onClick={(e) => onDelete(e, doc)}
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});

export default KnowledgeCard;
