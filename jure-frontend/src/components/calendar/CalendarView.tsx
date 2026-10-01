import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import {
  type CalendarEvent,
  isTaskAppointmentOverdue,
  localDayKey,
  pillColorForCalendarEvent,
  startOfLocalDay,
} from '@/lib/calendarEvents';
import CalendarLegend from '@/components/calendar/CalendarLegend';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function localeTag(lang: string): string {
  if (lang === 'fr') return 'fr-FR';
  if (lang === 'ar') return 'ar-MA';
  return 'en-US';
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Monday-first month grid (6 weeks × 7 days). */
function buildMonthCells(month: Date): Date[] {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function weekdayLabels(lang: string): string[] {
  const base = new Date(2024, 0, 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.toLocaleDateString(localeTag(lang), { weekday: 'short' });
  });
}

function accentForEvent(e: CalendarEvent): string {
  if ((e.type === 'task' || e.type === 'appointment') && isTaskAppointmentOverdue(e)) {
    return '#64748b';
  }
  return pillColorForCalendarEvent(e).bg;
}

export default function CalendarView({
  events,
  loading,
  emptyPeriod,
  emptyFiltered,
  onEventClick,
  onDatesSet,
  onDayClick,
}: {
  events: CalendarEvent[];
  loading: boolean;
  emptyPeriod: boolean;
  emptyFiltered?: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDatesSet: (arg: { start: Date; end: Date }) => void;
  onDayClick?: (date: Date) => void;
}) {
  const { t, lang } = useAppTranslation();
  const cal = t.calendar;
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const todayKey = localDayKey(startOfLocalDay(new Date()));

  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const weekdays = useMemo(() => weekdayLabels(lang), [lang]);

  const monthLabel = cursor.toLocaleDateString(localeTag(lang), { month: 'long' });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const s = new Date(e.start);
      if (Number.isNaN(s.getTime())) continue;
      const key = localDayKey(s);
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [events]);

  useEffect(() => {
    const start = cells[0];
    const end = new Date(cells[41]);
    end.setDate(end.getDate() + 1);
    onDatesSet({ start, end });
    // intentionally only when month cursor changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const goToday = () => setCursor(startOfMonth(new Date()));
  const goPrev = () => setCursor((m) => addMonths(m, -1));
  const goNext = () => setCursor((m) => addMonths(m, 1));

  const emptyHint = !loading && (emptyPeriod || emptyFiltered);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3 pb-1 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {cal.agendaOf}
          </p>
          <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize sm:text-2xl">
            {monthLabel}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={goPrev}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-2.5 text-xs font-semibold"
            onClick={goToday}
          >
            {cal.fc.today}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={goNext}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-7 gap-1 px-2 sm:gap-1.5 sm:px-3">
        {weekdays.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-[10px]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative z-[1] flex-1 min-h-0 overflow-y-auto px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="grid h-full min-h-[22rem] grid-cols-7 grid-rows-6 gap-1 sm:min-h-[26rem] sm:gap-1.5">
          {cells.map((date) => {
            const key = localDayKey(date);
            const inMonth = date.getMonth() === cursor.getMonth();
            const isToday = key === todayKey;
            const dayEvents = eventsByDay.get(key) || [];
            const hasEvents = dayEvents.length > 0;
            const accent = hasEvents ? accentForEvent(dayEvents[0]) : undefined;
            const shown = dayEvents.slice(0, 2);
            const extra = dayEvents.length - shown.length;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onDayClick?.(startOfLocalDay(date))}
                className={cn(
                  'group flex min-h-0 flex-col items-center rounded-2xl px-1 py-1.5 text-center transition-all sm:rounded-[1.15rem] sm:px-1.5 sm:py-2',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  hasEvents
                    ? 'bg-white dark:bg-slate-100 shadow-sm border border-slate-200/90 dark:border-transparent hover:-translate-y-0.5 hover:shadow-md'
                    : 'bg-slate-200/50 dark:bg-white/10 border border-transparent hover:bg-slate-200/80 dark:hover:bg-white/15',
                  !inMonth && 'opacity-45',
                  isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-950'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-extrabold leading-none sm:text-base md:text-lg',
                    hasEvents ? 'text-slate-900' : 'text-slate-500 dark:text-slate-300'
                  )}
                  style={accent ? { color: accent } : undefined}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 flex w-full min-h-0 flex-1 flex-col items-center gap-0.5 overflow-hidden">
                  {shown.map((ev) => {
                    const overdue =
                      (ev.type === 'task' || ev.type === 'appointment') && isTaskAppointmentOverdue(ev);
                    const color = accentForEvent(ev);
                    return (
                      <span
                        key={ev.id}
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onEventClick(ev);
                          }
                        }}
                        className={cn(
                          'hidden w-full truncate px-0.5 text-[9px] font-semibold leading-tight sm:block',
                          overdue && 'line-through opacity-70'
                        )}
                        style={{ color }}
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    );
                  })}
                  {extra > 0 ? (
                    <span
                      className="hidden text-[9px] font-bold sm:block"
                      style={{ color: accent || '#64748b' }}
                    >
                      +{extra}
                    </span>
                  ) : null}
                  {hasEvents ? (
                    <span className="mt-auto flex gap-0.5 sm:hidden" aria-hidden>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="h-1 w-1 rounded-full"
                          style={{ backgroundColor: accentForEvent(ev) }}
                        />
                      ))}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {emptyHint ? (
        <p className="shrink-0 px-3 pb-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400">
          {emptyFiltered ? cal.emptyFiltered : cal.emptyPeriod}
        </p>
      ) : null}

      <CalendarLegend variant="agenda" />
    </div>
  );
}
