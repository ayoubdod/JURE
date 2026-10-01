import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  FileText,
  Hash,
  Info,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ReadingDocument, ReadingHighlight } from './types';

type Props = {
  doc: ReadingDocument;
  page: number;
  pageCount: number;
  onBack: () => void;
  onGoPage: (page: number) => void;
  highlights: ReadingHighlight[];
  bookmarks: number[];
  onToggleBookmark: (page: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  fileLabel: string;
  metaLine: string;
  labels: {
    back: string;
    search: string;
    pages: string;
    bookmarks: string;
    highlights: string;
    info: string;
    pageOf: string;
    documentInfo: string;
    noBookmarks: string;
  };
};

export default function ReadingNav({
  doc,
  page,
  pageCount,
  onBack,
  onGoPage,
  highlights,
  bookmarks,
  onToggleBookmark,
  search,
  onSearchChange,
  fileLabel,
  metaLine,
  labels,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const sortedBookmarks = useMemo(
    () => [...bookmarks].sort((a, b) => a - b),
    [bookmarks]
  );

  useEffect(() => {
    /* keep panel in sync when page changes */
  }, [page]);

  return (
    <aside className="flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col border-e border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200/90 px-3 py-3 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-2 h-8 -ms-2 gap-1 px-2 text-slate-600 hover:text-[#64499D]"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {labels.back}
        </Button>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D]">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
              {doc.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {[fileLabel, metaLine].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {pageCount > 0 ? (
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            {labels.pageOf.replace('{current}', String(page)).replace('{total}', String(pageCount))}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-slate-200/90 px-3 py-2.5 dark:border-slate-800">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={labels.search}
            className="h-8 border-slate-200 bg-slate-50 ps-8 text-[12px] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {pageCount > 0 ? (
          <section className="mb-3">
            <p className="mb-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {labels.pages}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: Math.min(pageCount, 48) }, (_, i) => i + 1).map((n) => {
                const bookmarked = bookmarks.includes(n);
                const hasHighlight = highlights.some((h) => h.page === n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onGoPage(n)}
                    className={cn(
                      'relative rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors',
                      n === page
                        ? 'bg-[#64499D] text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                    )}
                  >
                    {n}
                    {bookmarked ? (
                      <span className="absolute end-0.5 top-0.5 h-1 w-1 rounded-full bg-amber-400" />
                    ) : null}
                    {hasHighlight ? (
                      <span className="absolute start-0.5 top-0.5 h-1 w-1 rounded-full bg-[#64499D]/70" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {pageCount > 48 ? (
              <p className="mt-1.5 px-1.5 text-[10px] text-slate-400">+{pageCount - 48}</p>
            ) : null}
          </section>
        ) : null}

        <section className="mb-3">
          <div className="mb-1.5 flex items-center justify-between px-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {labels.bookmarks}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400"
              onClick={() => onToggleBookmark(page)}
              aria-label={labels.bookmarks}
            >
              <Bookmark
                className={cn('h-3.5 w-3.5', bookmarks.includes(page) && 'fill-amber-400 text-amber-500')}
              />
            </Button>
          </div>
          {sortedBookmarks.length === 0 ? (
            <p className="px-1.5 text-[11px] text-slate-400">{labels.noBookmarks}</p>
          ) : (
            <ul className="space-y-0.5">
              {sortedBookmarks.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => onGoPage(n)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-start text-[12px]',
                      n === page
                        ? 'bg-[#64499D]/10 text-[#64499D]'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    )}
                  >
                    <Bookmark className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
                    {labels.pageOf.replace('{current}', String(n)).replace('{total}', String(pageCount || n))}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {highlights.length > 0 ? (
          <section className="mb-3">
            <p className="mb-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {labels.highlights}
            </p>
            <ul className="space-y-1">
              {highlights.slice(0, 12).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => onGoPage(h.page)}
                    className="w-full rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-1.5 text-start dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <p className="line-clamp-2 text-[11px] text-slate-700 dark:text-slate-200">{h.text}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">p. {h.page}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-slate-200/90 p-2 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-2 text-[12px] text-slate-600"
          onClick={() => setInfoOpen((v) => !v)}
        >
          <Info className="h-3.5 w-3.5" />
          {labels.documentInfo}
        </Button>
        {infoOpen ? (
          <div className="mt-1 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {doc.author ? (
              <p className="flex gap-1.5">
                <Hash className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                {doc.author}
              </p>
            ) : null}
            {doc.source ? <p>{doc.source}</p> : null}
            {doc.jurisdiction_name ? <p>{doc.jurisdiction_name}</p> : null}
            {doc.reference_number ? <p>{doc.reference_number}</p> : null}
            {doc.language ? <p className="uppercase">{doc.language}</p> : null}
            {doc.description ? <p className="line-clamp-4 text-slate-500">{doc.description}</p> : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
