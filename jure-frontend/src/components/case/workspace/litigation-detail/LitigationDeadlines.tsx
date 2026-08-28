import { Button } from '@/components/ui/button';
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import { getCountdownDays } from '@/utils/caseCardHelpers';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import { EmptyAction, SectionError, WorkspaceCard } from './ui';
import { formatShortDate, keyDeadlinesOf, relativeDayLabel } from './helpers';

export default function LitigationDeadlines({
  caseItem,
  canEdit,
  legalDeadlines,
  legalError,
  onRetryLegal,
  onAdd,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  legalDeadlines: CalculatedDeadline[] | null;
  legalError: boolean;
  onRetryLegal: () => void;
  onAdd: () => void;
}) {
  const { t, tf, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const manuals = keyDeadlinesOf(caseItem);
  const legal = (legalDeadlines ?? []).filter((d) => d.status !== 'cancelled');

  const tone = (iso: string) => {
    const days = getCountdownDays(iso);
    if (days == null) return 'text-slate-500';
    if (days < 0 || days <= 3) return 'text-red-600';
    if (days <= 14) return 'text-amber-600';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit ? (
          <Button type="button" className="h-9 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]" onClick={onAdd}>
            {copy.addDeadline}
          </Button>
        ) : null}
      </div>

      <WorkspaceCard title={copy.caseDeadlines}>
        {manuals.length ? (
          <ul className="space-y-2">
            {manuals.map((d, i) => {
              const days = getCountdownDays(d.date);
              const urgent = days != null && days <= 3;
              return (
                <li key={`${d.label}-${i}`} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800">
                  <div>
                    <p className="text-[13px] font-medium">{d.label || copy.caseDeadlines}</p>
                    <p className={cn('text-[12px]', tone(d.date))}>
                      {formatShortDate(d.date, lang)} · {relativeDayLabel(d.date, lang, copy, tf)}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    {urgent ? copy.urgent : days != null && days < 0 ? copy.overdue : copy.sourceManual}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyAction message={copy.noDeadlines} actionLabel={canEdit ? copy.addDeadline : undefined} onAction={canEdit ? onAdd : undefined} />
        )}
      </WorkspaceCard>

      <WorkspaceCard title={copy.legalDeadlines}>
        {legalError ? (
          <SectionError message={copy.loadError} retryLabel={copy.retry} onRetry={onRetryLegal} />
        ) : legal.length ? (
          <ul className="space-y-2">
            {legal.map((d) => {
              const date = d.final_deadline || d.calculated_deadline;
              return (
                <li key={d.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800">
                  <div>
                    <p className="text-[13px] font-medium">{d.rule?.name || d.triggering_event_type}</p>
                    <p className={cn('text-[12px]', tone(date))}>
                      {formatShortDate(date, lang)} · {relativeDayLabel(date, lang, copy, tf)}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">{copy.sourceCalculated}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-slate-500">{copy.noDeadlines}</p>
        )}
      </WorkspaceCard>

      <DeadlinesCard caseId={caseItem.id} />
    </div>
  );
}
