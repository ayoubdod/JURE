import { Button } from '@/components/ui/button';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { EmptyAction, WorkspaceCard } from './ui';
import { pastAppointments, personName, upcomingAppointments } from './helpers';
import type { Appointment } from '@/services/appointment/api';

function AppointmentRow({
  item,
  copy,
  lang,
  onOpen,
}: {
  item: Appointment;
  copy: ReturnType<typeof useAppTranslation>['t']['cases']['workspaces']['litigation']['detail'];
  lang: ReturnType<typeof useAppTranslation>['lang'];
  onOpen: (id: number) => void;
}) {
  const people = (item.attendees ?? []).map((u) => personName(u as API.User)).filter(Boolean);
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 px-3 py-2 text-start hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <p className="text-[13px] font-medium">{item.title}</p>
      <p className="text-[12px] text-slate-500">
        {formatDate(item.start_at, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
        {' · '}
        {formatTime(item.start_at, lang, { hour: '2-digit', minute: '2-digit' })}
      </p>
      {people.length ? <p className="text-[12px] text-slate-500">{people.join(', ')}</p> : null}
      <p className="text-[12px] text-slate-500">
        {item.meeting_type === 'video' ? copy.video : copy.inPerson}
        {item.location ? ` · ${item.location}` : ''}
        {item.conference_url ? ` · ${item.conference_url}` : ''}
      </p>
    </button>
  );
}

export default function LitigationAppointments({
  caseItem,
  onAdd,
  onOpen,
}: {
  caseItem: API.Case;
  onAdd: () => void;
  onOpen: (id: number) => void;
}) {
  const { t, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const upcoming = upcomingAppointments(caseItem);
  const past = pastAppointments(caseItem);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="h-9 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]" onClick={onAdd}>
          {copy.addAppointment}
        </Button>
      </div>
      {!upcoming.length && !past.length ? (
        <EmptyAction message={copy.noAppointments} actionLabel={copy.addAppointment} onAction={onAdd} />
      ) : (
        <>
          <WorkspaceCard title={copy.upcomingAppointments}>
            {upcoming.length ? (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <AppointmentRow key={a.id} item={a} copy={copy} lang={lang} onOpen={onOpen} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">{copy.noneScheduled}</p>
            )}
          </WorkspaceCard>
          {past.length ? (
            <WorkspaceCard title={copy.pastAppointments}>
              <div className="space-y-2">
                {past.map((a) => (
                  <AppointmentRow key={a.id} item={a} copy={copy} lang={lang} onOpen={onOpen} />
                ))}
              </div>
            </WorkspaceCard>
          ) : null}
        </>
      )}
    </div>
  );
}
