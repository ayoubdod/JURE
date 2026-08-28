import React from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WorkspacePageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-0 pt-2 pb-1 sm:gap-3 sm:pt-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">{title}</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500 dark:text-slate-400 hidden sm:block">
          {subtitle}
        </p>
      </div>
      {actions ? (
        <div className="flex min-w-0 items-center justify-end gap-2 max-sm:flex-1 max-sm:basis-full">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type WorkspaceKpiItem = {
  key: string;
  label: string;
  value: number | null;
  accent: string;
  onClick?: () => void;
  active?: boolean;
};

export function WorkspaceKpiStrip({
  items,
  loading,
  ariaLabel,
}: {
  items: WorkspaceKpiItem[];
  loading?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      className="ws-kpi-strip grid grid-cols-2 gap-2 px-0 py-2 sm:flex sm:overflow-x-auto sm:snap-x sm:snap-mandatory"
      role="region"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const className = cn(
          'flex min-w-0 items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-800',
          'bg-white dark:bg-slate-950 border-l-[3px] px-2.5 py-1.5 text-start',
          'sm:snap-start sm:flex-1 sm:shrink-0 sm:min-w-[5.75rem]',
          item.accent,
          item.active && 'ring-1 ring-[#64499D]/35 border-[#64499D]/40',
          item.onClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900'
        );
        const body = (
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 leading-none">
              {item.label}
            </p>
            {loading || item.value == null ? (
              <div className="mt-1.5 h-4 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            ) : (
              <p className="ws-stat-value mt-0.5 text-base font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                {item.value}
              </p>
            )}
          </div>
        );
        return item.onClick ? (
          <button key={item.key} type="button" className={className} onClick={item.onClick}>
            {body}
          </button>
        ) : (
          <div key={item.key} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function WorkspaceEmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80">
        <Icon className="h-6 w-6 text-slate-500 dark:text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-center text-[13px] text-slate-500 dark:text-slate-400">{hint}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function WorkspaceErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40">
        <AlertCircle className="h-6 w-6 text-rose-500" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-center text-[13px] text-slate-500 dark:text-slate-400">{description}</p>
      <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
