import { MoreHorizontal, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatRelativeTime, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ResearchNote } from '@/services/research-notes/api';
import {
  isSameDay,
  matterLabel,
  NOTE_COLOR_CLASSES,
  noteColor,
  previewContent,
} from '@/components/notes/noteUtils';

type Props = {
  note: ResearchNote;
  onOpen: (note: ResearchNote) => void;
  onEdit: (note: ResearchNote) => void;
  onDelete: (note: ResearchNote) => void;
  compact?: boolean;
};

export default function NoteCard({ note, onOpen, onEdit, onDelete, compact }: Props) {
  const { t, lang, tf } = useAppTranslation();
  const n = t.notes;
  const color = noteColor(note.id);
  const matter = matterLabel(note);
  const preview = previewContent(note.content);
  const created = formatDate(note.created, lang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const updated = isSameDay(note.modified)
    ? n.updatedToday
    : tf(n.updated, { time: formatRelativeTime(note.modified, lang) });

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onOpen(note)}
        className={cn(
          'flex min-w-[11.5rem] max-w-[14rem] shrink-0 flex-col rounded-[14px] border border-[#E8EAF0] p-3.5 text-start transition-colors hover:border-[#64499D]/30 dark:border-slate-800',
          NOTE_COLOR_CLASSES[color]
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-[#64499D] dark:bg-slate-950/40">
          <Scale className="h-4 w-4" />
        </span>
        <span className="mt-3 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 dark:text-white">
          {note.title}
        </span>
        {note.citation ? (
          <span className="mt-1 line-clamp-1 text-[11.5px] text-slate-500 dark:text-slate-400">
            {note.citation}
          </span>
        ) : null}
        <span className="mt-3 text-[11px] text-slate-400">{updated}</span>
      </button>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex min-h-[12rem] cursor-pointer flex-col rounded-[14px] border border-[#E8EAF0] p-4 transition-colors hover:border-[#64499D]/35 dark:border-slate-800',
        NOTE_COLOR_CLASSES[color]
      )}
      onClick={() => onOpen(note)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{created}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-700"
              aria-label={t.common.actions}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onOpen(note)}>{n.open}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(note)}>{t.common.edit}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700 dark:text-red-400"
              onClick={() => onDelete(note)}
            >
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
        {note.title}
      </h3>
      {note.citation ? (
        <p className="mt-1 line-clamp-1 text-[12.5px] text-slate-500 dark:text-slate-400">{note.citation}</p>
      ) : null}
      <p className="mt-2 line-clamp-3 flex-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
        {preview || n.contentPreviewFallback}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 text-[11.5px] text-slate-500 dark:text-slate-400">
          <Scale className="h-3.5 w-3.5 shrink-0 text-[#64499D]" />
          <span className="truncate">{matter || n.unscopedBadge}</span>
        </span>
        <span className="shrink-0 text-[11px] text-slate-400">{updated}</span>
      </div>
    </article>
  );
}
