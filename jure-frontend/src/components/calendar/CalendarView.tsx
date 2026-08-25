/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarDays, MapPin, Plus, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime, useAppTranslation } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  type CalendarEvent,
  isTaskAppointmentOverdue,
  pillColorForCalendarEvent,
} from '@/lib/calendarEvents';
import CalendarLegend from '@/components/calendar/CalendarLegend';
import { cn } from '@/lib/utils';

const MOBILE_TOOLBAR = {
  start: 'prev,next title today dayGridMonth,timeGridWeek,timeGridDay,listWeek',
  center: '',
  end: '',
};
const DESKTOP_TOOLBAR = {
  start: 'prev,next today',
  center: 'title',
  end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
};

export default function CalendarView({
  calendarRef,
  events,
  loading,
  emptyPeriod,
  emptyFiltered,
  onEventClick,
  onDatesSet,
  onAddTask,
  onAddAppointment,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  events: CalendarEvent[];
  loading: boolean;
  emptyPeriod: boolean;
  emptyFiltered?: boolean;
  onEventClick: (info: any) => void;
  onDatesSet: (arg: { start: Date; end: Date }) => void;
  onAddTask: () => void;
  onAddAppointment: () => void;
}) {
  const { t, lang } = useAppTranslation();
  const cal = t.calendar;
  const fcButtonText = useMemo(
    () => ({
      today: cal.fc.today,
      month: cal.fc.month,
      week: cal.fc.week,
      day: cal.fc.day,
      list: cal.fc.agenda,
    }),
    [cal.fc.today, cal.fc.month, cal.fc.week, cal.fc.day, cal.fc.agenda]
  );

  const fcEvents = useMemo(() => {
    return events.map((e) => {
      const overdue = (e.type === 'task' || e.type === 'appointment') && isTaskAppointmentOverdue(e);
      const colors = pillColorForCalendarEvent(e);
      const base: any = {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end || e.start,
        allDay: e.allDay,
        extendedProps: { ...e, overdue },
        backgroundColor: overdue ? '#94a3b8' : colors.bg,
        borderColor: 'transparent',
        textColor: overdue ? '#1e293b' : colors.fg,
      };
      if (overdue) base.classNames = ['fc-event-overdue-strike'];
      return base;
    });
  }, [events]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.setOption('locale', lang);
    api.setOption('buttonText', fcButtonText);
  }, [calendarRef, lang, fcButtonText]);

  const isMobile = useIsMobile();

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-[0_4px_14px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex-1 min-h-0 relative fc-calendar-card">
        <FullCalendar
          ref={calendarRef as any}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
          headerToolbar={isMobile ? MOBILE_TOOLBAR : DESKTOP_TOOLBAR}
          buttonText={fcButtonText}
          locale={lang}
          titleFormat={isMobile ? { year: 'numeric', month: 'short' } : { year: 'numeric', month: 'long' }}
          height="100%"
          events={fcEvents}
          eventClick={onEventClick}
          datesSet={onDatesSet}
          nowIndicator
          selectable={false}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          eventClassNames={(arg) => {
            const ext = (arg.event.extendedProps || {}) as CalendarEvent & { overdue?: boolean };
            const list: string[] = [];
            if (ext?.type === 'task') list.push('task-event', `task-${ext.priority || 'low'}`);
            if (ext?.type === 'appointment') list.push('appointment-event');
            if (ext?.type === 'case_date') list.push('case-date-event', `case-date-${ext.sourceType || ''}`);
            return list;
          }}
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventDisplay="block"
          windowResize={() => {
            const api = calendarRef.current?.getApi();
            if (!api) return;
            const mobile = window.innerWidth < 768;
            api.setOption('headerToolbar', mobile ? MOBILE_TOOLBAR : DESKTOP_TOOLBAR);
            api.setOption(
              'titleFormat',
              mobile ? { year: 'numeric', month: 'short' } : { year: 'numeric', month: 'long' }
            );
            if (mobile) {
              if (api.view.type !== 'listWeek' && api.view.type !== 'dayGridMonth') api.changeView('listWeek');
            } else if (api.view.type === 'listWeek') {
              api.changeView('dayGridMonth');
            }
          }}
          viewDidMount={() => {
            const api = calendarRef.current?.getApi();
            if (api && window.innerWidth < 768 && api.view.type !== 'listWeek' && api.view.type !== 'dayGridMonth') {
              api.changeView('listWeek');
            }
          }}
          dayHeaderContent={(arg) => (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {arg.text}
            </span>
          )}
          dayCellClassNames={(arg) => {
            const cls: string[] = [];
            if (arg.isToday) cls.push('fc-day-today-jure');
            const d = arg.date.getDay();
            if (d === 0 || d === 6) cls.push('fc-day-weekend-jure');
            return cls;
          }}
          eventContent={(arg) => {
            const event = arg.event;
            const ext = event.extendedProps as CalendarEvent & { overdue?: boolean };
            const time = event.start
              ? formatTime(new Date(event.start as any), lang, { hour: '2-digit', minute: '2-digit', hour12: true })
              : '';
            const strike = ext?.overdue;

            let meetingBadge: React.ReactNode = null;
            if (ext?.type === 'appointment') {
              const mt =
                ext.meeting_type ||
                (ext.conversation_id ? 'video' : ext.location ? 'in_person' : '');
              if (mt === 'video') {
                meetingBadge = (
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] leading-none opacity-95">
                    <Video className="h-2.5 w-2.5 shrink-0" aria-hidden />
                    <span className="truncate">{cal.jureConference}</span>
                  </span>
                );
              } else if (mt === 'in_person' || ext.location) {
                meetingBadge = (
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] leading-none opacity-95">
                    <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden />
                    <span className="truncate">{cal.inPerson}</span>
                  </span>
                );
              }
            }

            let assigneeBadge: React.ReactNode = null;
            if (ext?.type === 'task') {
              const people = Array.isArray(ext.assignees) && ext.assignees.length
                ? ext.assignees
                : ext.assigned_to
                  ? [ext.assigned_to]
                  : [];
              if (people.length) {
                const shown = people.slice(0, 3);
                const extra = people.length - shown.length;
                assigneeBadge = (
                  <span className="mt-0.5 flex items-center">
                    {shown.map((p) => {
                      const initial = ((p.first_name || p.email || '?')[0] || '?').toUpperCase();
                      return (
                        <span
                          key={p.id ?? initial}
                          className="me-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/25 text-[8px] font-bold"
                        >
                          {initial}
                        </span>
                      );
                    })}
                    {extra > 0 ? <span className="text-[9px] opacity-90">+{extra}</span> : null}
                  </span>
                );
              }
            }

            return (
              <div className="fc-event-main-frame min-w-0 overflow-hidden">
                <div className="fc-event-title-container">
                  <div
                    className={cn(
                      'fc-event-title fc-sticky truncate',
                      strike && 'line-through opacity-80'
                    )}
                  >
                    {event.title}
                  </div>
                </div>
                {meetingBadge}
                {assigneeBadge}
                {time ? <div className="fc-event-time">{time}</div> : null}
              </div>
            );
          }}
        />
        {(emptyPeriod || emptyFiltered) && !loading && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/60 backdrop-blur-[1px] z-[5]">
            <CalendarDays className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {emptyFiltered ? cal.emptyFiltered : cal.emptyPeriod}
            </p>
            {!emptyFiltered && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{cal.emptyNoData}</p>
            )}
            {!emptyFiltered && (
              <div className="pointer-events-auto mt-4 flex flex-wrap gap-2 justify-center">
                <Button size="sm" className="rounded-lg" onClick={onAddTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  {cal.addTask}
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg" onClick={onAddAppointment}>
                  {cal.scheduleAppointment}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <CalendarLegend />
    </div>
  );
}
