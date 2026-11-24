'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OverviewCard({
  title,
  action,
  children,
  className,
  as: Heading = 'h2',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Overview section cards default to h2; nested cards inside a section use h3. */
  as?: 'h2' | 'h3';
}) {
  return (
    <section className={cn('rounded-xl border border-slate-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Heading className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {title}
        </Heading>
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
  icon,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-1">
      <div className="text-slate-400" aria-hidden>
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-[13px] text-slate-500">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 text-[13px] font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
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
