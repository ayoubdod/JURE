import { memo, type ReactNode } from 'react';
import { ChevronRight, MapPin, Video } from 'lucide-react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { appointmentStatusBadgeClass } from '@/lib/calendarEvents';
import type { Appointment } from '@/services/appointment/api';

export type AppointmentViewMode = 'list' | 'grid';

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

function isVideoMeeting(appointment: Appointment): boolean {
  return (
    appointment.meeting_type === 'video' ||
    Boolean(appointment.conversation || appointment.jure_conversation)
  );
}

function personLabel(p: {
  first_name?: string;
  last_name?: string;
  email?: string;
}): string {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || '—';
}

function statusLabel(status: Appointment['status'], t: ReturnType<typeof useAppTranslation>['t']): string {
  if (status === 'scheduled') return t.calendar.statusScheduled;
  if (status === 'done') return t.calendar.appointmentModal.statusDone;
  return t.calendar.appointmentModal.statusCancelled;
}

function AppointmentParticipants({
  appointment,
  compact,
}: {
  appointment: Appointment;
  compact?: boolean;
}) {
  const people =
    appointment.attendees && appointment.attendees.length > 0
      ? appointment.attendees
      : appointment.created_by_details
        ? [appointment.created_by_details]
        : [];
  if (!people.length) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex -space-x-1.5 rtl:space-x-reverse">
        {shown.map((p) => (
          <UserAvatar
            key={p.id}
            size="xs"
            className="ring-2 ring-white dark:ring-slate-950"
            image={getPersonImage(p)}
            firstName={p.first_name}
            lastName={p.last_name}
            email={p.email}
          />
        ))}
      </div>
      {!compact ? (
        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
          {people.length === 1
            ? personLabel(people[0])
            : extra > 0
              ? `${shown.map((p) => p.first_name || personLabel(p).split(' ')[0]).join(', ')} +${extra}`
              : shown.map((p) => p.first_name || personLabel(p).split(' ')[0]).join(', ')}
        </span>
      ) : extra > 0 ? (
        <span className="text-[11px] text-slate-500">+{extra}</span>
      ) : null}
    </div>
  );
}

function MeetingTypeCell({ appointment }: { appointment: Appointment }) {
  const { t } = useAppTranslation();
  const video = isVideoMeeting(appointment);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-400">
      {video ? (
        <>
          <Video className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <span className="truncate">{t.calendar.appointmentModal.meetingTypeVideo}</span>
        </>
      ) : (
        <>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <span className="truncate">{t.calendar.appointmentModal.meetingTypeInPerson}</span>
        </>
      )}
    </span>
  );
}

function CompressedWhen({
  startAt,
  endAt,
}: {
  startAt: string;
  endAt: string;
}) {
  const { lang } = useAppTranslation();
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay =
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    start.toDateString() === end.toDateString();
  const dateLabel = formatDate(start, lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const startTime = formatTime(start, lang, { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTime = formatTime(end, lang, { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="whitespace-nowrap">
      <p className="text-xs font-medium tabular-nums text-slate-800 dark:text-slate-200">{dateLabel}</p>
      <p className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
        {sameDay ? `${startTime}–${endTime}` : startTime}
      </p>
    </div>
  );
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
  const { t } = useAppTranslation();

  return (
    <tr
      className={cn(
        'group cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors',
        rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
        'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
      )}
      onClick={() => onOpen(appointment)}
    >
      <td className="px-4 py-3">
        <CompressedWhen startAt={appointment.start_at} endAt={appointment.end_at} />
      </td>
      <td className="px-3 py-3 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{appointment.title}</p>
        {!isVideoMeeting(appointment) && appointment.location ? (
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">{appointment.location}</p>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <MeetingTypeCell appointment={appointment} />
      </td>
      <td className="px-3 py-3 max-w-[200px]">
        <AppointmentParticipants appointment={appointment} />
      </td>
      <td className="px-3 py-3 text-[13px] text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
        {appointment.case_title || (appointment.case != null ? `#${appointment.case}` : '—')}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
            appointmentStatusBadgeClass(appointment.status)
          )}
        >
          {statusLabel(appointment.status, t)}
        </span>
      </td>
      <td className="w-8 px-2 py-3">
        <ChevronRight className="h-4 w-4 text-slate-300 ms-auto opacity-0 group-hover:opacity-100 rtl:rotate-180" />
      </td>
    </tr>
  );
});

export const AppointmentCard = memo(function AppointmentCard({
  appointment,
  onOpen,
}: {
  appointment: Appointment;
  onOpen: (appointment: Appointment) => void;
}) {
  const { t, lang } = useAppTranslation();
  const video = isVideoMeeting(appointment);
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  const dateLabel = formatDate(start, lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const startTime = formatTime(start, lang, { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTime = formatTime(end, lang, { hour: '2-digit', minute: '2-digit', hour12: false });
  const caseLabel =
    appointment.case_title || (appointment.case != null ? `#${appointment.case}` : null);

  return (
    <article
      className={cn(
        'group flex min-w-0 cursor-pointer flex-col rounded-xl border border-slate-200/90 bg-white p-3',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors',
        'hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30'
      )}
      tabIndex={0}
      onClick={() => onOpen(appointment)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(appointment);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tabular-nums text-slate-500">
            {dateLabel}
            <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
            {startTime}–{endTime}
          </p>
          <h3 className="mt-1 truncate text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">
            {appointment.title}
          </h3>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
            appointmentStatusBadgeClass(appointment.status)
          )}
        >
          {statusLabel(appointment.status, t)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          {video ? (
            <>
              <Video className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {t.calendar.appointmentModal.meetingTypeVideo}
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {t.calendar.appointmentModal.meetingTypeInPerson}
            </>
          )}
        </span>
        {!video && appointment.location ? (
          <span className="truncate text-slate-500">{appointment.location}</span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <AppointmentParticipants appointment={appointment} compact />
        <span className="inline-flex min-w-0 items-center gap-0.5 text-[12px] font-medium text-slate-400 group-hover:text-[#64499D]">
          <span className="truncate max-w-[8rem]">{caseLabel || t.appointments.columns.case}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden />
        </span>
      </div>
    </article>
  );
});

const COL_COUNT = 7;

export default function AppointmentList({
  appointments,
  loading,
  empty,
  error,
  onOpen,
  viewMode = 'list',
}: {
  appointments: Appointment[];
  loading: boolean;
  empty: ReactNode;
  error: ReactNode | null;
  onOpen: (appointment: Appointment) => void;
  viewMode?: AppointmentViewMode;
}) {
  const { t, lang } = useAppTranslation();
  const cols = t.appointments.columns;

  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, item) => {
    const key = groupKey(item.start_at);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
  const order: Array<'today' | 'tomorrow' | 'later' | 'past'> = ['today', 'tomorrow', 'later', 'past'];

  const headers = [cols.when, cols.title, cols.type, cols.participants, cols.case, cols.status, ''];

  if (viewMode === 'grid') {
    return (
      <div>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[132px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              />
            ))}
          </div>
        ) : error ? (
          error
        ) : appointments.length === 0 ? (
          empty
        ) : (
          <div className="space-y-4">
            {order.map((key) => {
              const items = grouped[key] || [];
              if (!items.length) return null;
              return (
                <section key={key}>
                  <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t.appointments.groups[key]}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <AppointmentCard key={item.id} appointment={item} onOpen={onOpen} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
              {headers.map((h, i) => (
                <th
                  key={h || 'a'}
                  className={cn(
                    'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-start',
                    i === 0 && 'px-4'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="h-12 px-4" colSpan={COL_COUNT}>
                      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              : error
                ? (
                  <tr>
                    <td colSpan={COL_COUNT}>{error}</td>
                  </tr>
                )
                : appointments.length === 0
                  ? (
                    <tr>
                      <td colSpan={COL_COUNT}>{empty}</td>
                    </tr>
                  )
                  : order.flatMap((key) => {
                      const items = grouped[key] || [];
                      if (!items.length) return [];
                      return [
                        <tr key={`g-${key}`}>
                          <td
                            colSpan={COL_COUNT}
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
                  const video = isVideoMeeting(item);
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
                      <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-slate-500">
                        {video ? (
                          <>
                            <Video className="h-3 w-3" aria-hidden />
                            {t.calendar.appointmentModal.meetingTypeVideo}
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3" aria-hidden />
                            {t.calendar.appointmentModal.meetingTypeInPerson}
                          </>
                        )}
                        {item.attendees?.length ? (
                          <span className="ms-1">· {item.attendees.length}</span>
                        ) : null}
                      </p>
                    </button>
                  );
                })}
      </div>
    </div>
  );
}
