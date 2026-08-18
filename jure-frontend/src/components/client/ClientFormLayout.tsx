import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export const CLIENT_INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

export const CLIENT_PHONE_CLASS =
  '[&_button]:h-10 [&_button]:rounded-s-lg [&_button]:border-slate-200 [&_button]:dark:border-zinc-700 [&_input]:h-10 [&_input]:rounded-e-lg [&_input]:rounded-s-none [&_input]:border-slate-200 [&_input]:dark:border-zinc-700 [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[#64499D]/25 [&_input]:focus-visible:ring-offset-0 [&_input]:focus-visible:border-[#64499D]';

export const digitsOnly = (value?: string | null) => (value || '').replace(/\D/g, '');

export function ClientFormSection({
  icon: Icon,
  title,
  hint,
  badge,
  children,
}: {
  icon: typeof User;
  title: string;
  hint?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5 dark:border-zinc-800/80">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1ECFF] text-[#64499D] dark:bg-[#2a2240] dark:text-[#E9E0FF]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{title}</h3>
            {badge ? (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                {badge}
              </span>
            ) : null}
          </div>
          {hint ? <p className="mt-0.5 text-[12px] text-slate-500 dark:text-zinc-400">{hint}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ClientField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
        {label}
        {required ? <span className="ms-1 text-red-500">*</span> : null}
      </Label>
      {hint ? <p className="text-[11.5px] leading-snug text-slate-400 dark:text-zinc-500">{hint}</p> : null}
      {children}
      {error ? (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ClientTypeOption({
  selected,
  disabled,
  icon: Icon,
  label,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  icon: typeof User;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
        selected
          ? 'border-[#64499D]/40 bg-[#F7F4FF] text-[#64499D] shadow-sm dark:border-[#8B6FD1]/40 dark:bg-[#64499D]/15 dark:text-[#CFC2FF]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
