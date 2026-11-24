import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WorkspaceCard({
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
  /** Section-level cards use h2; nested cards inside a section use h3. */
  as?: 'h2' | 'h3';
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
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

export function EmptyAction({
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
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-zinc-800">
      <div className="mb-2 flex justify-center text-slate-400" aria-hidden>
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-[13px] text-slate-500">{message}</p>
      {actionLabel && onAction ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 min-h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SectionError({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-[13px] text-slate-600 dark:text-zinc-300">{message}</p>
      <Button type="button" variant="outline" className="mt-3 h-9 rounded-lg" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

