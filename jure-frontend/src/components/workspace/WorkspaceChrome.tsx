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
    <div className="flex flex-wrap items-start justify-between gap-3 px-0 pt-3 pb-1">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type WorkspaceKpiItem = {
  key: string;
  label: string;
  value: number | null;
  accent: string;
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
      className="ws-kpi-strip flex gap-2 overflow-x-auto snap-x snap-mandatory px-1 sm:px-0 py-2"
      role="region"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={cn(
            'snap-start shrink-0 flex items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-800',
            'bg-white dark:bg-slate-950 border-l-[3px] px-2.5 py-1.5 min-w-[5.75rem]',
            'sm:flex-1 sm:min-w-0',
            item.accent
          )}
        >
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
        </div>
      ))}
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
