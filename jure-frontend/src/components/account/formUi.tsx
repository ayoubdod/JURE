import type { ReactNode } from 'react';
import { Cpu } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const ACCOUNT_INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

export const ACCOUNT_PRIMARY_BTN =
  'h-10 min-w-[132px] bg-[#64499D] px-4 text-white hover:bg-[#4D3680] dark:bg-[#7C6BB8] dark:hover:bg-[#8B6FD1]';

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="border-b border-slate-200 pb-2 dark:border-zinc-800">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="flex items-center gap-1.5 text-[12px] text-slate-400">
          {id === 'new_password1' ? <Cpu className="h-3.5 w-3.5" /> : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SettingRow({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-3.5 py-3', className)}>
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-medium text-slate-800 dark:text-zinc-200">
          {title}
        </Label>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
