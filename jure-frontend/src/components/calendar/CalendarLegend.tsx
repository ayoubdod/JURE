import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export default function CalendarLegend({
  variant = 'default',
}: {
  variant?: 'default' | 'agenda';
}) {
  const { t } = useAppTranslation();
  const cal = t.calendar;
  const items = [
    { k: cal.legend.task, className: 'bg-indigo-600' },
    { k: cal.legend.appointment, className: 'bg-emerald-600' },
    { k: cal.legend.caseDeadline, className: 'bg-rose-600' },
    { k: cal.legend.adminDue, className: 'bg-amber-600' },
    { k: cal.legend.consultation, className: 'bg-blue-600' },
  ];
  const agenda = variant === 'agenda';
  return (
    <div
      className={cn(
        'ws-kpi-strip shrink-0 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-3 py-1.5 sm:flex-wrap sm:gap-2 sm:py-2',
        agenda
          ? 'border-t border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-black/55 backdrop-blur-md'
          : 'border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80'
      )}
    >
      <Info
        className={cn(
          'hidden sm:block h-3.5 w-3.5 shrink-0',
          agenda ? 'text-slate-400 dark:text-white/50' : 'text-slate-400'
        )}
        aria-hidden
      />
      {items.map(({ k, className }) => (
        <span
          key={k}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap',
            agenda
              ? 'border border-slate-200 dark:border-white/15 bg-white/90 dark:bg-white/10 text-slate-600 dark:text-white/85'
              : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400'
          )}
        >
          <span className={cn('w-2 h-2 rounded-full', className)} />
          {k}
        </span>
      ))}
    </div>
  );
}
