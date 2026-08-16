import React, { useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation, formatDate, type Lang } from '@/i18n';
import {
  type CalendarEvent,
  caseDateTypeBadgeClass,
  countdownTone,
  getCountdownDays,
  sourceTypeLabel,
} from '@/lib/calendarEvents';
import { EMBEDDED_OVERLAY, SHEET_PANEL } from '@/components/calendar/EmbeddedDetailPanels';

function formatDayMonthYear(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CaseDateDetailPanel({
  event: ev,
  open,
  onOpenChange,
  portalContainer,
  onViewCase,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portalContainer: HTMLElement | null;
  onViewCase: (caseId: number) => void;
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

  const caseId = ev?.case_id ?? ev?.relatedCase?.id;
  const days = ev?.start ? getCountdownDays(ev.start) : null;
  const overdue = days != null && days < 0;
  const tone = countdownTone(days, overdue);
  const raw = ev?.raw as Record<string, unknown> | undefined;
  const caseType =
    (raw?.case_type as string) || (raw?.caseType as string) || (raw?.category as string) || '—';
  const caseStatus = (raw?.case_status ?? raw?.status) as string | undefined;
  const assignedName = (raw?.assigned_attorney_name ?? raw?.assigned_to_name ?? raw?.lead_attorney_name) as
    | string
    | undefined;
  const clientName = (raw?.client_name ?? raw?.client) as string | undefined;
  const deadlineLabel =
    days == null
      ? null
      : overdue
        ? tf(t.cases.deadline.overdue, { days: Math.abs(days) })
        : days === 0
          ? t.cases.deadline.today
          : tf(t.cases.deadline.inDays, { days });

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" container={portalContainer} overlayClassName={EMBEDDED_OVERLAY} className={SHEET_PANEL}>
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4 border-l-[3px] border-l-primary">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {ev?.sourceType && (
                <span
                  className={cn(
                    'inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset',
                    caseDateTypeBadgeClass(ev.sourceType)
                  )}
                >
                  {sourceTypeLabel(ev.sourceType, cal)}
                </span>
              )}
              <span className="inline-flex rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20">
                {String(caseType).replace(/_/g, ' ')}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={t.common.close}
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900 dark:text-white pr-2">
            {ev?.title || '—'}
          </h2>
          <div className="mt-3 h-px bg-slate-200 dark:bg-slate-800" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {ev && (
            <>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">
                  {cal.caseDateDetail.date}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDayMonthYear(ev.start, lang)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sourceTypeLabel(ev.sourceType, cal)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      tone === 'critical' && 'text-red-700 dark:text-red-400 font-semibold',
                      tone === 'warning' && 'text-amber-700 dark:text-amber-400',
                      tone === 'normal' && 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {deadlineLabel}
                  </span>
                  {overdue && (
                    <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-400">
                      {cal.caseDateDetail.overdue}
                    </span>
                  )}
                </div>
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">
                  {cal.caseDateDetail.case}
                </p>
                {ev.relatedCase?.reference && (
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{ev.relatedCase.reference}</p>
                )}
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                  {ev.relatedCase?.title || '—'}
                </p>
                {caseStatus && (
                  <span className="mt-2 inline-flex rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20">
                    {String(caseStatus).replace(/_/g, ' ')}
                  </span>
                )}
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">
                  {cal.caseDateDetail.people}
                </p>
                {assignedName && <p className="text-sm text-slate-700 dark:text-slate-300">{assignedName}</p>}
                {clientName && typeof clientName === 'string' && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {tf(cal.caseDateDetail.client, { name: clientName })}
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex shrink-0 justify-end border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-3">
          {caseId != null && (
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => {
                onOpenChange(false);
                onViewCase(caseId);
              }}
            >
              {cal.caseDateDetail.viewCase}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
}
