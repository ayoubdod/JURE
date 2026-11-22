import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type {
  DashboardAppointmentItem,
  DashboardDeadlineItem,
  DashboardOverview,
  DashboardTaskItem,
} from '@/services/dashboard/api';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

type Props = {
  myDay: NonNullable<DashboardOverview['my_day']> | null | undefined;
  loading?: boolean;
  onOpenTask: (task: DashboardTaskItem) => void;
  onOpenAppointment: (appt: DashboardAppointmentItem) => void;
  onOpenDeadline: (deadline: DashboardDeadlineItem) => void;
  onViewCalendar: () => void;
};

function RowButton({
  onClick,
  ariaLabel,
  icon: Icon,
  iconClass,
  title,
  meta,
}: {
  onClick: () => void;
  ariaLabel: string;
  icon: typeof CheckSquare;
  iconClass: string;
  title: string;
  meta?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center gap-3 rounded-lg border border-slate-200/90 bg-white p-2.5 text-start transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/35 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/50"
      aria-label={ariaLabel}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClass)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      <ArrowRight size={14} className="shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
    </button>
  );
}

export default function MyDaySection({
  myDay,
  loading,
  onOpenTask,
  onOpenAppointment,
  onOpenDeadline,
  onViewCalendar,
}: Props) {
  const { t, tf, lang, enumLabel } = useAppTranslation();
  const copy = t.dashboard.myDay;

  const appointments = myDay?.appointments_today ?? [];
  const dueToday = myDay?.tasks_due_today ?? [];
  const overdue = myDay?.tasks_overdue ?? [];
  const deadlines = myDay?.upcoming_deadlines ?? [];

  const isEmpty =
    !loading &&
    appointments.length === 0 &&
    dueToday.length === 0 &&
    overdue.length === 0 &&
    deadlines.length === 0;

  const priorityLabel = (priority: string) =>
    enumLabel('taskPriority', priority.toLowerCase()) || priority;

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      defaultOpen
      headerRight={
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onViewCalendar}>
          {copy.viewCalendar}
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label={copy.loading}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900/50" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700">
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {copy.appointments}
            </h3>
            {appointments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground dark:border-slate-700">
                {copy.emptyAppointments}
              </p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => (
                  <RowButton
                    key={a.id}
                    onClick={() => onOpenAppointment(a)}
                    ariaLabel={tf(copy.openAppointmentAria, { title: a.title })}
                    icon={CalendarClock}
                    iconClass="bg-[#64499D]/12 text-[#4D3680] dark:text-[#8B6FD1]"
                    title={a.title}
                    meta={a.start_at ? formatTime(a.start_at, lang) : null}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {copy.tasksDueToday}
            </h3>
            {dueToday.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground dark:border-slate-700">
                {copy.emptyTasksDue}
              </p>
            ) : (
              <div className="space-y-2">
                {dueToday.map((task) => (
                  <RowButton
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    ariaLabel={tf(copy.openTaskAria, { title: task.title })}
                    icon={CheckSquare}
                    iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    title={task.title}
                    meta={priorityLabel(task.priority)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {copy.tasksOverdue}
            </h3>
            {overdue.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground dark:border-slate-700">
                {copy.emptyOverdue}
              </p>
            ) : (
              <div className="space-y-2">
                {overdue.map((task) => (
                  <RowButton
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    ariaLabel={tf(copy.openTaskAria, { title: task.title })}
                    icon={AlertTriangle}
                    iconClass="bg-rose-500/15 text-rose-700 dark:text-rose-400"
                    title={task.title}
                    meta={
                      task.due_date
                        ? formatDate(task.due_date, lang, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {copy.upcomingDeadlines}
            </h3>
            {deadlines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground dark:border-slate-700">
                {copy.emptyDeadlines}
              </p>
            ) : (
              <div className="space-y-2">
                {deadlines.map((dl, idx) => (
                  <RowButton
                    key={`${dl.source_type ?? 'dl'}-${dl.source_id ?? dl.id ?? idx}`}
                    onClick={() => onOpenDeadline(dl)}
                    ariaLabel={tf(copy.openDeadlineAria, { title: dl.title || dl.label || '' })}
                    icon={Clock}
                    iconClass="bg-slate-500/15 text-slate-700 dark:text-slate-300"
                    title={dl.title || dl.label || copy.deadlineFallback}
                    meta={
                      dl.date
                        ? formatDate(dl.date, lang, { month: 'short', day: 'numeric' })
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardCollapsibleCard>
  );
}
