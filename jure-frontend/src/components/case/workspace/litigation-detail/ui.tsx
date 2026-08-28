import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WorkspaceCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TextLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium text-[#64499D] hover:underline"
    >
      {children}
    </button>
  );
}

export function EmptyAction({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-zinc-800">
      <p className="text-[13px] text-slate-500">{message}</p>
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" className="mt-3 h-9 rounded-lg" onClick={onAction}>
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

export function PersonAvatar({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-zinc-700"
      />
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F4FF] text-[11px] font-semibold text-[#64499D] ring-1 ring-[#64499D]/15">
      {initials}
    </span>
  );
}
