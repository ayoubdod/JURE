import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  Highlighter,
  Maximize2,
  MessageSquarePlus,
  Minus,
  Plus,
  Search,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocumentReadingMessages } from '@/i18n/messages/documentReading';

type Props = {
  page: number;
  pageCount: number;
  zoom: number;
  bookmarked: boolean;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleBookmark: () => void;
  onHighlight: () => void;
  onNote: () => void;
  onSearchFocus?: () => void;
  labels: DocumentReadingMessages;
};

export function ReadingToolbar({
  page,
  pageCount,
  zoom,
  bookmarked,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleBookmark,
  onHighlight,
  onNote,
  onSearchFocus,
  labels,
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} disabled={page <= 1} aria-label={labels.prev}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <span className="min-w-[5.5rem] text-center text-[12px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
          {pageCount > 0
            ? labels.pageOf.replace('{current}', String(page)).replace('{total}', String(pageCount))
            : '—'}
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} disabled={pageCount > 0 && page >= pageCount} aria-label={labels.next}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut} aria-label={labels.zoomOut}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[2.75rem] text-center text-[11px] tabular-nums text-slate-500">{zoom}%</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn} aria-label={labels.zoomIn}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={onFit}>
          <Maximize2 className="me-1 h-3.5 w-3.5" />
          {labels.fitWidth}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onSearchFocus} aria-label={labels.search}>
          <Search className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onHighlight} aria-label={labels.highlight}>
          <Highlighter className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onNote} aria-label={labels.addNote}>
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleBookmark} aria-label={labels.bookmark}>
          <Bookmark className={cn('h-3.5 w-3.5', bookmarked && 'fill-amber-400 text-amber-500')} />
        </Button>
      </div>
    </div>
  );
}

export function SelectionToolbar({
  visible,
  onHighlight,
  onNote,
  onAskJuria,
  onShare,
  onCopy,
  labels,
}: {
  visible: boolean;
  onHighlight: () => void;
  onNote: () => void;
  onAskJuria: () => void;
  onShare: () => void;
  onCopy: () => void;
  labels: DocumentReadingMessages;
}) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-[11px]" onClick={onHighlight}>
          <Highlighter className="me-1 h-3.5 w-3.5" />
          {labels.highlight}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-[11px]" onClick={onNote}>
          <MessageSquarePlus className="me-1 h-3.5 w-3.5" />
          {labels.addNote}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-[11px]" onClick={onAskJuria}>
          <Sparkles className="me-1 h-3.5 w-3.5" />
          {labels.askJuriaShort}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-[11px]" onClick={onShare}>
          <Share2 className="me-1 h-3.5 w-3.5" />
          {labels.share}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-[11px]" onClick={onCopy}>
          <Copy className="me-1 h-3.5 w-3.5" />
          {labels.copy}
        </Button>
      </div>
    </div>
  );
}
