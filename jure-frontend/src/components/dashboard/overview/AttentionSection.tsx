import { AlertTriangle, ArrowRight, CalendarClock, CheckSquare, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type { DashboardAttentionItem } from '@/services/dashboard/api';
import { formatDate, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

type Props = {
  items: DashboardAttentionItem[];
  loading?: boolean;
  onOpenItem: (item: DashboardAttentionItem) => void;
};

const KIND_ICON: Record<string, LucideIcon> = {
  task_overdue: AlertTriangle,
  task_due_today: CheckSquare,
  appointment_today: CalendarClock,
  deadline_upcoming: Clock,
};

const KIND_TONE: Record<string, string> = {
  task_overdue: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  task_due_today: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  appointment_today: 'bg-[#64499D]/12 text-[#4D3680] dark:text-[#8B6FD1]',
  deadline_upcoming: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

export default function AttentionSection({ items, loading, onOpenItem }: Props) {
  const { t, lang } = useAppTranslation();
  const copy = t.dashboard.attention;

  const kindLabel = (kind: string) => {
    if (kind === 'task_overdue') return copy.kinds.taskOverdue;
    if (kind === 'task_due_today') return copy.kinds.taskDueToday;
    if (kind === 'appointment_today') return copy.kinds.appointmentToday;
    if (kind === 'deadline_upcoming') return copy.kinds.deadlineUpcoming;
    return copy.kinds.other;
  };

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      defaultOpen
    >
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label={copy.loading}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center dark:border-slate-700">
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind] ?? AlertTriangle;
            const tone = KIND_TONE[item.kind] ?? KIND_TONE.deadline_upcoming;
            const due =
              item.due_date
                ? formatDate(item.due_date, lang, { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className="flex w-full min-h-[44px] items-center gap-3 rounded-lg border border-slate-200/90 bg-white p-3 text-start transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/35 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/50"
                  aria-label={`${kindLabel(item.kind)}: ${item.title}`}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      tone
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {kindLabel(item.kind)}
                      {due ? ` · ${due}` : ''}
                    </p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCollapsibleCard>
  );
}
