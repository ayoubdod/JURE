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
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white md:text-[26px]">
          {title}
        </h1>
        <p className="mt-1 max-w-xl text-[14px] text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div> : null}
    </header>
  );
}

export type WorkspaceKpiItem = {
  key: string;
  label: string;
  value: number | null;
  accent?: string;
  hint?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  active?: boolean;
};

function iconAccentClass(accent?: string) {
  if (!accent) return 'text-slate-500';
  if (accent.includes('text-') || accent.includes('text[')) return accent;
  return accent.replace(/border-l-/g, 'text-');
}

export function WorkspaceKpiStrip({
  items,
  loading,
  ariaLabel,
}: {
  items: WorkspaceKpiItem[];
  loading?: boolean;
  ariaLabel?: string;
}) {
  const cols =
    items.length >= 5
      ? 'mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5'
      : items.length === 3
        ? 'mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-3'
        : 'mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4';

  return (
    <section className={cols} role="region" aria-label={ariaLabel}>
      {loading
        ? Array.from({ length: Math.max(items.length, 4) }).map((_, i) => (
            <div
              key={i}
              className="h-[96px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            />
          ))
        : items.map((item) => {
            const Icon = item.icon;
            const className = cn(
              'min-w-0 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 text-start',
              'shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950',
              item.active && 'border-[#64499D]/40 ring-2 ring-[#64499D]/20',
              item.onClick && 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
            );
            const body = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  {Icon ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
                      <Icon className={cn('h-4 w-4', iconAccentClass(item.accent))} aria-hidden />
                    </span>
                  ) : null}
                </div>
                {item.value == null ? (
                  <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                ) : (
                  <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                )}
                {item.hint ? (
                  <p className="mt-1.5 truncate text-[12px] text-slate-400">{item.hint}</p>
                ) : null}
              </>
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
    </section>
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
