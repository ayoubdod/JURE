/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime, useAppTranslation } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  type CalendarEvent,
  isTaskAppointmentOverdue,
  pillColorForCalendarEvent,
} from '@/lib/calendarEvents';
import CalendarLegend from '@/components/calendar/CalendarLegend';

const MOBILE_TOOLBAR = { start: 'prev,next', center: 'title', end: 'today listWeek,dayGridMonth' };
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
            const ext = event.extendedProps as any;
            const time = event.start
              ? formatTime(new Date(event.start as any), lang, { hour: '2-digit', minute: '2-digit', hour12: true })
              : '';
            const strike = ext?.overdue ? 'line-through opacity-80' : '';
            return {
              html: `<div class="fc-event-main-frame"><div class="fc-event-title-container"><div class="fc-event-title fc-sticky ${strike}">${event.title}</div></div>${time ? `<div class="fc-event-time">${time}</div>` : ''}</div>`,
            };
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
