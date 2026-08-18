import { memo, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { appointmentStatusBadgeClass } from '@/lib/calendarEvents';
import { appointmentAssigneeName, appointmentClientName, displayPersonName } from '@/lib/workspacePeople';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';
import type { Appointment } from '@/services/appointment/api';

function groupKey(iso: string): 'today' | 'tomorrow' | 'later' | 'past' {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 0) return 'past';
  return 'later';
}

export const AppointmentTableRow = memo(function AppointmentTableRow({
  appointment,
  rowIdx,
  onOpen,
}: {
  appointment: Appointment;
  rowIdx: number;
  onOpen: (appointment: Appointment) => void;
}) {
  const { t, lang } = useAppTranslation();
  const lookup = useCabinetMemberDirectory();
  const assigneeId = appointment.created_by;
  const cab = assigneeId != null ? lookup(assigneeId) : undefined;
  const start = new Date(appointment.start_at);

  return (
    <tr
      className={cn(
        'group cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors',
        rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
        'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
      )}
      onClick={() => onOpen(appointment)}
    >
      <td className="px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {formatDate(start, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-3 py-3 text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {formatTime(start, lang, { hour: '2-digit', minute: '2-digit', hour12: false })}
      </td>
      <td className="px-3 py-3 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{appointment.title}</p>
        {appointment.location ? (
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">{appointment.location}</p>
        ) : null}
      </td>
      <td className="px-3 py-3 text-[12px] text-slate-500">{t.appointments.meeting}</td>
      <td className="px-3 py-3 text-[13px] text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
        {appointmentClientName(appointment)}
      </td>
      <td className="px-3 py-3 text-[13px] text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
        {appointment.case_title || (appointment.case != null ? `#${appointment.case}` : '—')}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {appointment.created_by_details || cab ? (
            <>
              <UserAvatar
                size="xs"
                image={getPersonImage(appointment.created_by_details as unknown as Record<string, unknown>) ?? cab?.image}
                firstName={appointment.created_by_details?.first_name ?? cab?.first_name}
                lastName={appointment.created_by_details?.last_name ?? cab?.last_name}
                email={appointment.created_by_details?.email ?? cab?.email}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {appointmentAssigneeName(appointment) !== '—'
                  ? appointmentAssigneeName(appointment)
                  : displayPersonName(cab)}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
            appointmentStatusBadgeClass(appointment.status)
          )}
        >
          {appointment.status === 'scheduled'
            ? t.calendar.statusScheduled
            : appointment.status === 'done'
              ? t.calendar.appointmentModal.statusDone
              : t.calendar.appointmentModal.statusCancelled}
        </span>
      </td>
      <td className="w-8 px-2 py-3">
        <ChevronRight className="h-4 w-4 text-slate-300 ms-auto opacity-0 group-hover:opacity-100 rtl:rotate-180" />
      </td>
    </tr>
  );
});

export default function AppointmentList({
  appointments,
  loading,
  empty,
  error,
  onOpen,
}: {
  appointments: Appointment[];
  loading: boolean;
  empty: ReactNode;
  error: ReactNode | null;
  onOpen: (appointment: Appointment) => void;
}) {
  const { t, lang } = useAppTranslation();
  const cols = t.appointments.columns;

  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, item) => {
    const key = groupKey(item.start_at);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
  const order: Array<'today' | 'tomorrow' | 'later' | 'past'> = ['today', 'tomorrow', 'later', 'past'];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
              {[cols.date, cols.time, cols.title, cols.type, cols.client, cols.case, cols.assignee, cols.status, ''].map(
                (h, i) => (
                  <th
                    key={h || 'a'}
                    className={cn(
                      'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-start',
                      i === 0 && 'px-4'
                    )}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="h-12 px-4" colSpan={9}>
                      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              : error
                ? (
                  <tr>
                    <td colSpan={9}>{error}</td>
                  </tr>
                )
                : appointments.length === 0
                  ? (
                    <tr>
                      <td colSpan={9}>{empty}</td>
                    </tr>
                  )
                  : order.flatMap((key) => {
                      const items = grouped[key] || [];
                      if (!items.length) return [];
                      return [
                        <tr key={`g-${key}`}>
                          <td
                            colSpan={9}
                            className="bg-slate-50 dark:bg-slate-900/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
                          >
                            {t.appointments.groups[key]}
                          </td>
                        </tr>,
                        ...items.map((item, i) => (
                          <AppointmentTableRow key={item.id} appointment={item} rowIdx={i} onOpen={onOpen} />
                        )),
                      ];
                    })}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[96px] animate-pulse bg-white dark:bg-slate-950" />
            ))
          : error
            ? error
            : appointments.length === 0
              ? empty
              : appointments.map((item) => {
                  const start = new Date(item.start_at);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpen(item)}
                      className="w-full text-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    >
                      <p className="text-[11px] tabular-nums text-slate-500">
                        {formatDate(start, lang, { day: 'numeric', month: 'short' })} ·{' '}
                        {formatTime(start, lang, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500 truncate">
                        {appointmentClientName(item)} · {appointmentAssigneeName(item)}
                      </p>
                    </button>
                  );
                })}
      </div>
    </div>
  );
}
