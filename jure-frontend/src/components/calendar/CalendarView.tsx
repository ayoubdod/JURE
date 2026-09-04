import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarDays, MapPin, Video } from 'lucide-react';
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
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  events: CalendarEvent[];
  loading: boolean;
  emptyPeriod: boolean;
  emptyFiltered?: boolean;
  onEventClick: (info: EventClickArg) => void;
  onDatesSet: (arg: { start: Date; end: Date }) => void;
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
      const mapped: EventInput = {
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
      if (overdue) mapped.classNames = ['fc-event-overdue-strike'];
      return mapped;
    });
  }, [events]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.setOption('locale', lang);
    api.setOption('buttonText', fcButtonText);
  }, [calendarRef, lang, fcButtonText]);

  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);
  const [toolbarH, setToolbarH] = useState(52);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => {
      const toolbar = card.querySelector('.fc-header-toolbar') as HTMLElement | null;
      if (toolbar) setToolbarH(toolbar.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const toolbar = card.querySelector('.fc-header-toolbar');
    if (toolbar) ro.observe(toolbar);
    ro.observe(card);
    return () => ro.disconnect();
  }, [emptyPeriod, emptyFiltered, isMobile, lang, loading]);

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-[0_4px_14px_rgba(15,23,42,0.06)] overflow-hidden">
      <div ref={cardRef} className="flex-1 min-h-0 relative fc-calendar-card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
          headerToolbar={isMobile ? MOBILE_TOOLBAR : DESKTOP_TOOLBAR}
          buttonText={fcButtonText}
          locale={lang}
          titleFormat={isMobile ? { year: 'numeric', month: 'short' } : { year: 'numeric', month: 'long' }}
          height="100%"
          expandRows
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
              ? formatTime(event.start, lang, { hour: '2-digit', minute: '2-digit', hour12: true })
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
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/85"
            style={{ top: toolbarH }}
          >
            <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {emptyFiltered ? cal.emptyFiltered : cal.emptyPeriod}
            </p>
            {!emptyFiltered && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cal.emptyNoData}</p>
            )}
          </div>
        )}
      </div>
      <CalendarLegend />
    </div>
  );
}
