import React from 'react';
import { cn } from '@/lib/utils';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { formatDrawerDate } from './format';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-3">
      {children}
    </h3>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-[13px] font-normal text-slate-900 dark:text-slate-100 leading-relaxed">{children}</div>
    </div>
  );
}

export function LongText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 text-[13px] text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
      {children}
    </div>
  );
}

export function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-[13px] text-slate-900 dark:text-slate-100">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[12px] text-slate-800 dark:text-slate-200"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export function BoolTag({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <span className="text-[13px]">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        value ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/25' : 'bg-slate-500/12 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20'
      )}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}

export function CountdownBadge({ dateIso }: { dateIso: string | null | undefined }) {
  if (!dateIso) return null;
  const days = getCountdownDays(dateIso);
  if (days === null) return null;
  const past = days < 0;
  if (past) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 line-through decoration-slate-500">
        Passed
      </span>
    );
  }
  const st = getCountdownStyle(days);
  const label = days === 0 ? 'Today' : `${days} days`;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
        st === 'critical' && 'bg-red-600 text-white',
        st === 'warning' && 'bg-amber-500/90 text-amber-950 dark:text-amber-950',
        st === 'normal' && 'bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
      )}
    >
      {st === 'normal' ? `in ${days} days` : label}
    </span>
  );
}

export function TimelineRow({
  label,
  dateIso,
  highlight,
}: {
  label: string;
  dateIso: string | null | undefined;
  highlight?: boolean;
}) {
  const hasDate = dateIso && !Number.isNaN(new Date(dateIso).getTime());
  const days = hasDate ? getCountdownDays(dateIso!) : null;
  const past = days != null && days < 0;

  return (
    <div
      className={cn(
        'relative flex gap-3 pl-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0',
        highlight && 'rounded-md bg-amber-500/8 ring-1 ring-amber-500/25 -mx-1 px-2'
      )}
    >
      <div
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          past ? 'bg-slate-400' : highlight ? 'bg-amber-500' : 'bg-indigo-500'
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{label}</span>
          {highlight && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Next</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-[13px] tabular-nums',
              past ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'
            )}
          >
            {hasDate ? formatDrawerDate(dateIso!) : '—'}
          </span>
          {hasDate && <CountdownBadge dateIso={dateIso!} />}
        </div>
      </div>
    </div>
  );
}
