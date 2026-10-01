import React, { useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatDate, useAppTranslation } from '@/i18n';
import { type CalendarEvent } from '@/lib/calendarEvents';
import { SHEET_PANEL } from '@/components/calendar/EmbeddedDetailPanels';
import { CalendarEventListItem } from '@/components/calendar/TodayAgendaPanel';

export default function DayEventsPanel({
  date,
  events,
  open,
  onOpenChange,
  onEventClick,
}: {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const { t, tf, lang } = useAppTranslation();
  const cal = t.calendar;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const title = date
    ? formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : cal.dayPanel.title;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className={SHEET_PANEL}>
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4 border-s-[3px] border-s-primary">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {cal.dayPanel.title}
              </p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-50 capitalize leading-snug">
                {title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {tf(cal.dayPanel.count, { count: events.length })}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[14rem] flex-col items-center justify-center text-center px-4">
              <CalendarDays className="mb-2 h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{cal.dayPanel.emptyDay}</p>
            </div>
          ) : (
            events.map((event) => (
              <CalendarEventListItem
                key={event.id}
                event={event}
                onClick={(ev) => {
                  onEventClick(ev);
                  onOpenChange(false);
                }}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
