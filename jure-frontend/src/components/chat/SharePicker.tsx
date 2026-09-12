'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, CheckSquare, FolderKanban, Search, Share2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  apiSearchShareable,
  type ShareableApiType,
  type ShareableSearchAppointmentHit,
  type ShareableSearchCaseHit,
  type ShareableSearchTaskHit,
} from '@/services/search/api';
import { normalizeShareableResults, type SharePickResult } from './sharePickerTypes';
import { TaskPriority } from '@/utils/constants';
import { useAppTranslation, intlLocale } from '@/i18n';

type ShareTab = Exclude<ShareableApiType, 'all'>;

function caseAccent(row: ShareableSearchCaseHit): string {
  const t = row.caseType;
  if (t === 'LITIGATION') return 'bg-rose-500/12 text-rose-600 dark:text-rose-400';
  if (t === 'CONSULTATION') return 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400';
  if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-400';
  }
  return 'bg-[#64499D]/12 text-[#64499D] dark:text-[#CFC2FF]';
}

function caseTypeLabel(row: ShareableSearchCaseHit, t: ReturnType<typeof useAppTranslation>['t']): string {
  const v = String(row.caseType ?? '').toUpperCase();
  if (v === 'LITIGATION') return t.sidebar.litigation;
  if (v === 'CONSULTATION') return t.sidebar.consultation;
  if (v === 'ADMINISTRATIVE' || v === 'ADMINISTRATIVE_DUTY') return t.sidebar.administrative;
  return v.replace(/_/g, ' ') || t.sidebar.cases;
}

function formatShortDate(iso: string | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/15 dark:text-slate-300',
        className
      )}
    >
      {children}
    </span>
  );
}

function taskPriorityShow(p?: string | null): boolean {
  const u = String(p || '').toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

function CaseResultRow({ row, onPick }: { row: ShareableSearchCaseHit; onPick: () => void }) {
  const { t, enumLabel } = useAppTranslation();
  const ref = row.reference?.startsWith('#')
    ? row.reference
    : row.reference
      ? `#${row.reference}`
      : `#${row.id}`;
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-slate-800/70"
    >
      <span
        className={cn(
          'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          caseAccent(row)
        )}
      >
        <FolderKanban className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
            {ref}
          </span>
          <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {row.title ?? '—'}
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          {row.status ? (
            <Chip>{enumLabel('caseStatus', String(row.status)) || String(row.status).replace(/_/g, ' ')}</Chip>
          ) : null}
          <Chip className="bg-[#64499D]/10 text-[#64499D] ring-[#64499D]/20 dark:text-[#CFC2FF]">
            {caseTypeLabel(row, t)}
          </Chip>
          {row.priority ? (
            <Chip>{enumLabel('taskPriority', String(row.priority)) || String(row.priority)}</Chip>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function TaskResultRow({ row, onPick }: { row: ShareableSearchTaskHit; onPick: () => void }) {
  const { t, tf, lang, enumLabel } = useAppTranslation();
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-slate-800/70"
    >
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
        <CheckSquare className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          {row.title ?? '—'}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          {row.status ? (
            <Chip>{enumLabel('taskStatus', String(row.status)) || String(row.status).replace(/_/g, ' ')}</Chip>
          ) : null}
          {taskPriorityShow(row.priority) ? (
            <Chip className="bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-400">
              {enumLabel('taskPriority', String(row.priority)) || String(row.priority).toUpperCase()}
            </Chip>
          ) : null}
          {row.dueDate ? (
            <Chip>
              {tf(t.conversations.dueLabel, { date: formatShortDate(row.dueDate, intlLocale(lang)) })}
            </Chip>
          ) : null}
          {row.relatedCase && (row.relatedCase.reference || row.relatedCase.title) ? (
            <Chip className="max-w-[160px]">
              {row.relatedCase.reference
                ? `#${row.relatedCase.reference.replace(/^#/, '')}`
                : ''}
              {row.relatedCase.title ? ` ${row.relatedCase.title}` : ''}
            </Chip>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function AppointmentResultRow({
  row,
  onPick,
}: {
  row: ShareableSearchAppointmentHit;
  onPick: () => void;
}) {
  const { lang, enumLabel } = useAppTranslation();
  const when = row.date;
  const dur =
    row.duration != null && row.duration > 0
      ? row.duration >= 60
        ? `${Math.floor(row.duration / 60)}h${row.duration % 60 ? ` ${row.duration % 60}m` : ''}`
        : `${row.duration}m`
      : '';
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-slate-800/70"
    >
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
        <Calendar className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          {row.title ?? '—'}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          {row.status ? (
            <Chip>{enumLabel('caseStatus', String(row.status)) || String(row.status).replace(/_/g, ' ')}</Chip>
          ) : null}
          {when ? <Chip>{formatShortDate(when, intlLocale(lang))}</Chip> : null}
          {dur ? <Chip>{dur}</Chip> : null}
        </span>
      </span>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-start gap-2.5 rounded-xl px-2 py-2">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS: { id: ShareTab; icon: React.ReactNode }[] = [
  { id: 'case', icon: <FolderKanban className="h-3.5 w-3.5" /> },
  { id: 'task', icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { id: 'appointment', icon: <Calendar className="h-3.5 w-3.5" /> },
];

export interface SharePickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disabled?: boolean;
  trigger: React.ReactNode;
  onPick: (result: SharePickResult) => void;
  triggerTooltip?: string;
}

export function SharePicker({
  open,
  onOpenChange,
  disabled,
  trigger,
  onPick,
  triggerTooltip,
}: SharePickerProps) {
  const { t, tf } = useAppTranslation();
  const [tab, setTab] = useState<ShareTab>('case');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<
    ShareableSearchCaseHit[] | ShareableSearchTaskHit[] | ShareableSearchAppointmentHit[]
  >([]);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback((q: string, nextTab: ShareTab) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    apiSearchShareable(q.trim(), nextTab, ac.signal)
      .then((res) => {
        setRows(normalizeShareableResults(res.data, nextTab));
      })
      .catch(() => {
        if (!ac.signal.aborted) setRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setRows([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(() => runSearch(query, tab), 300);
    return () => clearTimeout(timer);
  }, [open, query, tab, runSearch]);

  const emptyKind =
    tab === 'case'
      ? t.conversations.shareTabCases
      : tab === 'task'
        ? t.conversations.shareTabTasks
        : t.conversations.shareTabAppointments;
  const tabLabel = (id: ShareTab) =>
    id === 'case'
      ? t.conversations.shareTabCases
      : id === 'task'
        ? t.conversations.shareTabTasks
        : t.conversations.shareTabAppointments;

  const handlePick = (result: SharePickResult) => {
    onPick(result);
    onOpenChange(false);
    setQuery('');
    setRows([]);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Popover open={open} onOpenChange={onOpenChange}>
        {triggerTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild disabled={disabled}>
                {trigger}
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">{triggerTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <PopoverTrigger asChild disabled={disabled}>
            {trigger}
          </PopoverTrigger>
        )}
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'z-[310] w-[min(100vw-1.5rem,24rem)] overflow-hidden rounded-2xl border border-slate-200 p-0',
            'shadow-[0_12px_40px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950'
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b border-slate-100 bg-gradient-to-b from-[#F7F4FF] to-white px-3 py-3 dark:border-slate-800 dark:from-[#24183F]/50 dark:to-slate-950">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#64499D]/12 text-[#64499D] dark:bg-[#64499D]/25 dark:text-[#CFC2FF]">
                <Share2 className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {t.conversations.sharePickerTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.conversations.sharePickerHint}
                </p>
              </div>
            </div>

            <div
              className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-900/80"
              role="tablist"
              aria-label={t.conversations.sharePickerTitle}
            >
              {TABS.map((x) => {
                const active = tab === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(x.id)}
                    className={cn(
                      'inline-flex h-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-medium transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                      active
                        ? 'bg-white text-[#64499D] shadow-sm dark:bg-slate-800 dark:text-[#CFC2FF]'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    )}
                  >
                    {x.icon}
                    <span className="truncate">{tabLabel(x.id)}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.conversations.shareSearchPlaceholder}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-8 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#64499D]/40 focus:outline-none focus:ring-2 focus:ring-[#64499D]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label={t.conversations.shareSearchPlaceholder}
              />
            </div>
          </div>

          <div className="max-h-[min(280px,50dvh)] overflow-y-auto overscroll-contain p-1.5">
            {loading ? (
              <SkeletonRows />
            ) : query.trim().length < 2 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
                <Search className="h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden />
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                  {t.conversations.shareTypeMinChars}
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
                <Share2 className="h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden />
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                  {tf(t.conversations.shareNoneFound, { kind: emptyKind })}
                </p>
              </div>
            ) : tab === 'case' ? (
              (rows as ShareableSearchCaseHit[]).map((row) => (
                <CaseResultRow key={row.id} row={row} onPick={() => handlePick({ kind: 'case', row })} />
              ))
            ) : tab === 'task' ? (
              (rows as ShareableSearchTaskHit[]).map((row) => (
                <TaskResultRow key={row.id} row={row} onPick={() => handlePick({ kind: 'task', row })} />
              ))
            ) : (
              (rows as ShareableSearchAppointmentHit[]).map((row) => (
                <AppointmentResultRow
                  key={row.id}
                  row={row}
                  onPick={() => handlePick({ kind: 'appointment', row })}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
