import { CalendarClock, ChevronRight, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';

type MeetingAppointment = NonNullable<API.Conversation['active_or_upcoming_appointment']>;

export default function AppointmentMeetingBanner({
  appointment,
  isTemporaryChat,
  callInProgress,
  onJoin,
  onOpenAppointment,
}: {
  appointment?: MeetingAppointment | null;
  isTemporaryChat?: boolean;
  callInProgress?: boolean;
  onJoin?: () => void;
  onOpenAppointment?: (appointmentId: number) => void;
}) {
  const { t, lang } = useAppTranslation();
  if (!appointment && !isTemporaryChat) return null;

  const showJoin = Boolean(appointment?.joinable) && !callInProgress;
  const start = appointment?.start_at ? new Date(appointment.start_at) : null;
  const end = appointment?.end_at ? new Date(appointment.end_at) : null;
  const dateLabel =
    start && !Number.isNaN(start.getTime())
      ? formatDate(start, lang, { weekday: 'short', day: 'numeric', month: 'short' })
      : null;
  const timeLabel =
    start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? `${formatTime(start, lang, { hour: '2-digit', minute: '2-digit', hour12: false })}–${formatTime(end, lang, { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : start && !Number.isNaN(start.getTime())
        ? formatTime(start, lang, { hour: '2-digit', minute: '2-digit', hour12: false })
        : null;

  const title = appointment?.title || t.calendar.appointmentModal.meetingChatBadge;
  const subtitleParts = [dateLabel, timeLabel].filter(Boolean);

  return (
    <div
      className={cn(
        'mx-2 mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:mx-3',
        'border-[#64499D]/25 bg-[#F7F4FC] text-slate-900',
        'dark:border-[#64499D]/40 dark:bg-[#2A2140]/55 dark:text-slate-50'
      )}
      role="region"
      aria-label={t.calendar.appointmentModal.meetingChatBadge}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#64499D] text-white">
        <CalendarClock className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
        {subtitleParts.length ? (
          <p className="truncate text-[11px] text-[#64499D]/90 dark:text-[#CFC2FF]/80">
            {subtitleParts.join(' · ')}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {appointment && onOpenAppointment ? (
          <button
            type="button"
            onClick={() => onOpenAppointment(appointment.id)}
            className="hidden h-9 items-center gap-0.5 rounded-full px-2.5 text-xs font-medium text-[#64499D] transition hover:bg-[#64499D]/10 sm:inline-flex dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20"
          >
            {t.calendar.appointmentModal.openAppointment}
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          </button>
        ) : null}
        {showJoin ? (
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#64499D] px-3.5 text-xs font-semibold text-white transition hover:bg-[#553d86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            <Video className="h-3.5 w-3.5" aria-hidden />
            {t.calendar.appointmentModal.joinConference}
          </button>
        ) : null}
      </div>
    </div>
  );
}
