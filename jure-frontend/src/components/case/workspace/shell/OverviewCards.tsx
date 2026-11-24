'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function OverviewCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-slate-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function OverviewEmpty({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-1">
      <p className="text-[13px] text-slate-500">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 text-[13px] font-medium text-[#64499D] hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function OverviewTextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 text-[12px] font-medium text-[#64499D] hover:underline"
    >
      {children}
    </button>
  );
}
