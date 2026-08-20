'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, CheckSquare, Folder, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

function caseDotClass(row: ShareableSearchCaseHit): string {
  const t = row.caseType;
  if (t === 'LITIGATION') return 'bg-rose-500';
  if (t === 'CONSULTATION') return 'bg-indigo-500';
  if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') return 'bg-amber-400';
  return 'bg-slate-400';
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

function statusBadgeClass(): string {
  return 'text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20';
}

function taskPriorityShow(p?: string | null): boolean {
  const u = String(p || '').toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

function CaseResultRow({ row, onPick }: { row: ShareableSearchCaseHit; onPick: () => void }) {
  const { t, enumLabel } = useAppTranslation();
  const ref = row.reference?.startsWith('#') ? row.reference : row.reference ? `#${row.reference}` : `#${row.id}`;
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', caseDotClass(row))} aria-hidden />
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 shrink-0">{ref}</span>
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{row.title ?? '—'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1 pl-4">
        {row.status && <span className={statusBadgeClass()}>{enumLabel('caseStatus', String(row.status)) || String(row.status).replace(/_/g, ' ')}</span>}
        <span className={statusBadgeClass()}>{caseTypeLabel(row, t)}</span>
        {row.priority && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{enumLabel('taskPriority', String(row.priority)) || String(row.priority)}</span>
        )}
      </div>
    </button>
  );
}

function TaskResultRow({ row, onPick }: { row: ShareableSearchTaskHit; onPick: () => void }) {
  const { t, tf, lang, enumLabel } = useAppTranslation();
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{row.title ?? '—'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1 pl-6">
        {row.status && <span className={statusBadgeClass()}>{enumLabel('taskStatus', String(row.status)) || String(row.status).replace(/_/g, ' ')}</span>}
        {taskPriorityShow(row.priority) && (
          <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/25">
            {enumLabel('taskPriority', String(row.priority)) || String(row.priority).toUpperCase()}
          </span>
        )}
        {row.dueDate && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {tf(t.conversations.dueLabel, { date: formatShortDate(row.dueDate, intlLocale(lang)) })}
          </span>
        )}
        {row.relatedCase && (row.relatedCase.reference || row.relatedCase.title) && (
          <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
            {row.relatedCase.reference ? `#${row.relatedCase.reference.replace(/^#/, '')}` : ''}
            {row.relatedCase.title ? ` ${row.relatedCase.title}` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

function AppointmentResultRow({ row, onPick }: { row: ShareableSearchAppointmentHit; onPick: () => void }) {
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
      className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{row.title ?? '—'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1 pl-6">
        {row.status && <span className={statusBadgeClass()}>{enumLabel('caseStatus', String(row.status)) || String(row.status).replace(/_/g, ' ')}</span>}
        {when && <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatShortDate(when, intlLocale(lang))}</span>}
        {dur && <span className="text-[11px] text-slate-500 dark:text-slate-400">{dur}</span>}
      </div>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse space-y-2 py-2">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

const TABS: { id: ShareTab; icon: React.ReactNode }[] = [
  { id: 'case', icon: <Folder className="h-3 w-3" /> },
  { id: 'task', icon: <CheckSquare className="h-3 w-3" /> },
  { id: 'appointment', icon: <Calendar className="h-3 w-3" /> },
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

  const runSearch = useCallback((q: string, t: ShareTab) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    apiSearchShareable(q.trim(), t, ac.signal)
      .then((res) => {
        setRows(normalizeShareableResults(res.data, t));
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
    const t = setTimeout(() => runSearch(query, tab), 300);
    return () => clearTimeout(t);
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
          className="w-[min(100vw-24px,380px)] p-0 border-slate-200 dark:border-slate-800 shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-3 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{t.conversations.sharePickerTitle}</p>
          </div>
          <div className="flex gap-1 px-2 py-2 border-b border-slate-200 dark:border-slate-800">
            {TABS.map((x) => (
              <Button
                key={x.id}
                type="button"
                variant={tab === x.id ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-7 text-[11px] gap-1 flex-1', tab === x.id && 'font-semibold')}
                onClick={() => setTab(x.id)}
              >
                {x.icon}
                {tabLabel(x.id)}
              </Button>
            ))}
          </div>
          <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.conversations.shareSearchPlaceholder}
                className="h-8 pl-8 text-[13px]"
              />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {loading ? (
              <SkeletonRows />
            ) : query.trim().length < 2 ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-500 px-3 py-4 text-center">
                {t.conversations.shareTypeMinChars}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-500 px-3 py-4 text-center">
                {tf(t.conversations.shareNoneFound, { kind: emptyKind })}
              </p>
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
