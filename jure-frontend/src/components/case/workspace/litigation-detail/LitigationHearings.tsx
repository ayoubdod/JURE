import { Button } from '@/components/ui/button';
import { getCaseData, getCountdownDays } from '@/utils/caseCardHelpers';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { EmptyAction, WorkspaceCard } from './ui';
import { courtLabels, formatShortDate, splitDateParts } from './helpers';

type Hearing = { key: string; label: string; date: string; upcoming: boolean };

export default function LitigationHearings({
  caseItem,
  canEdit,
  onAdd,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  onAdd: () => void;
}) {
  const { t, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const modal = t.cases.modal;
  const court = courtLabels(caseItem, t);
  const first = (getCaseData(caseItem, 'first_hearing_date') as string) || '';
  const next = (getCaseData(caseItem, 'next_hearing_date') as string) || '';

  const rows: Hearing[] = [];
  if (next) {
    rows.push({
      key: 'next',
      label: copy.nextHearing,
      date: next,
      upcoming: (getCountdownDays(next) ?? -1) >= 0,
    });
  }
  if (first && first !== next) {
    rows.push({
      key: 'first',
      label: modal.fields.firstHearingDate,
      date: first,
      upcoming: (getCountdownDays(first) ?? -1) >= 0,
    });
  }
  const upcoming = rows.filter((r) => r.upcoming);
  const past = rows.filter((r) => !r.upcoming);

  const card = (h: Hearing) => {
    const parts = splitDateParts(h.date, lang);
    const days = getCountdownDays(h.date);
    return (
      <div
        key={h.key}
        className={cn(
          'flex gap-4 rounded-xl border p-3',
          days === 0
            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-zinc-800'
        )}
      >
        {parts ? (
          <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15">
            <span className="text-lg font-semibold leading-none">{parts.day}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase">{parts.month}</span>
            <span className="text-[10px]">{parts.year}</span>
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{h.label}</p>
          <p className="text-[12px] text-slate-500">{formatShortDate(h.date, lang)}</p>
          {court.composed ? <p className="mt-1 text-[13px]">{court.composed}</p> : null}
          {court.chamber ? <p className="text-[12px] text-slate-500">{court.chamber}</p> : null}
          <p className="mt-1 text-[11px] font-semibold uppercase text-slate-400">
            {h.upcoming ? copy.scheduledHearing : copy.pastHearings}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit ? (
          <Button type="button" className="h-9 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]" onClick={onAdd}>
            {copy.addHearing}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyAction message={copy.noHearing} actionLabel={canEdit ? copy.addHearing : undefined} onAction={canEdit ? onAdd : undefined} />
      ) : (
        <>
          {upcoming.length ? (
            <WorkspaceCard title={copy.nextHearing}>
              <div className="space-y-3">{upcoming.map(card)}</div>
            </WorkspaceCard>
          ) : null}
          {past.length ? (
            <WorkspaceCard title={copy.pastHearings}>
              <div className="space-y-3">{past.map(card)}</div>
            </WorkspaceCard>
          ) : null}
        </>
      )}
    </div>
  );
}
