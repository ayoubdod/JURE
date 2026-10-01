import React, { useMemo } from 'react';
import { CalendarDays, CheckSquare, Clock, Gavel, MapPin, Video } from 'lucide-react';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import {
  type CalendarEvent,
  calendarEventKindLabel,
  eventsOnLocalDay,
  isTaskAppointmentOverdue,
  pillColorForCalendarEvent,
  sourceTypeLabel,
  startOfLocalDay,
} from '@/lib/calendarEvents';
import { cn } from '@/lib/utils';

function EventTypeIcon({ event }: { event: CalendarEvent }) {
  if (event.type === 'task') return <CheckSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  if (event.type === 'appointment') {
    const mt = event.meeting_type || (event.conversation_id ? 'video' : event.location ? 'in_person' : '');
    if (mt === 'video') return <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    if (mt === 'in_person' || event.location) return <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
  return <Gavel className="h-3.5 w-3.5 shrink-0" aria-hidden />;
}

export function CalendarEventListItem({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}) {
  const { t, lang } = useAppTranslation();
  const cal = t.calendar;
  const overdue =
    (event.type === 'task' || event.type === 'appointment') && isTaskAppointmentOverdue(event);
  const accent = overdue ? '#64748b' : pillColorForCalendarEvent(event).bg;
  const time = formatTime(event.start, lang, { hour: '2-digit', minute: '2-digit', hour12: false });
  const kind =
    event.type === 'case_date'
      ? sourceTypeLabel(event.sourceType, cal)
      : calendarEventKindLabel(event, cal);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={cn(
        'group w-full text-start rounded-xl border border-slate-200/90 dark:border-slate-800',
        'bg-white dark:bg-slate-900/70 px-3 py-2.5 transition-colors',
        'hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: accent }}
        >
          <EventTypeIcon event={event} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {time}
            </span>
            <span
              className="truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ color: accent, backgroundColor: `${accent}18` }}
            >
              {kind}
            </span>
          </div>
          <p
            className={cn(
              'mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2',
              overdue && 'line-through opacity-70'
            )}
          >
            {event.title}
          </p>
          {event.case_title || event.relatedCase?.reference ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {event.relatedCase?.reference || event.case_title}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function TodayAgendaPanel({
  events,
  loading,
  onEventClick,
}: {
  events: CalendarEvent[];
  loading?: boolean;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const { t, tf, lang } = useAppTranslation();
  const cal = t.calendar;
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const todayEvents = useMemo(() => eventsOnLocalDay(events, today), [events, today]);

  const groups = useMemo(() => {
    const tasks = todayEvents.filter((e) => e.type === 'task');
    const appointments = todayEvents.filter((e) => e.type === 'appointment');
    const deadlines = todayEvents.filter(
      (e) => e.type === 'case_date' && (e.sourceType === 'CASE_DEADLINE' || e.sourceType === 'CASE_DUE_DATE')
    );
    const consultations = todayEvents.filter(
      (e) => e.type === 'case_date' && e.sourceType === 'CONSULTATION_DATE'
    );
    const other = todayEvents.filter(
      (e) =>
        e.type === 'case_date' &&
        e.sourceType !== 'CASE_DEADLINE' &&
        e.sourceType !== 'CASE_DUE_DATE' &&
        e.sourceType !== 'CONSULTATION_DATE'
    );
    return [
      { key: 'appointments', label: cal.filterAppointments, items: appointments },
      { key: 'tasks', label: cal.filterTasks, items: tasks },
      { key: 'deadlines', label: cal.filterDeadlines, items: deadlines },
      { key: 'consultations', label: cal.filterConsultations, items: consultations },
      { key: 'other', label: cal.activity, items: other },
    ].filter((g) => g.items.length > 0);
  }, [todayEvents, cal]);

  const dateLabel = formatDate(today, lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {cal.stats.today}
        </p>
        <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 capitalize">
          {dateLabel}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {loading
            ? '…'
            : todayEvents.length === 0
              ? cal.dayPanel.emptyToday
              : tf(cal.dayPanel.count, { count: todayEvents.length })}
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
        {!loading && todayEvents.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center px-4">
            <CalendarDays className="mb-2 h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{cal.dayPanel.emptyToday}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{cal.emptyNoData}</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
                <span className="ms-1.5 tabular-nums text-slate-300 dark:text-slate-600">
                  {group.items.length}
                </span>
              </h3>
              <div className="space-y-2">
                {group.items.map((event) => (
                  <CalendarEventListItem key={event.id} event={event} onClick={onEventClick} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
