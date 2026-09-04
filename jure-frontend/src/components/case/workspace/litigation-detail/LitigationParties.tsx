import { Button } from '@/components/ui/button';
import { getCaseData } from '@/utils/caseCardHelpers';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { useAppTranslation } from '@/i18n';
import { EmptyAction, WorkspaceCard } from './ui';
import { thirdPartyLabels } from './helpers';

export default function LitigationParties({
  caseItem,
  onOpenClient,
  onConflict,
}: {
  caseItem: API.Case;
  onOpenClient: () => void;
  onConflict: () => void;
}) {
  const { t, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const clientRole = getCaseData(caseItem, 'client_role') as string | undefined;
  const opposing = String(getCaseData(caseItem, 'opposing_party_name') ?? getCaseData(caseItem, 'opposing_party') ?? '');
  const opposingCounsel = String(getCaseData(caseItem, 'opposing_counsel') ?? '');
  const thirds = thirdPartyLabels(caseItem);
  const hasClient = Boolean(caseItem.client);

  return (
    <div className="space-y-4">
      <WorkspaceCard title={copy.snapshotClient}>
        {hasClient ? (
          <div>
            <CaseClientLabel
              client={caseItem.client}
              nameClassName="text-[15px] font-semibold text-slate-900 dark:text-white"
            />
            {clientRole ? (
              <p className="mt-1 text-[13px] text-slate-500">{enumPretty(clientRole)}</p>
            ) : null}
            {caseItem.client?.id ? (
              <Button type="button" variant="outline" className="mt-3 h-9 rounded-lg" onClick={onOpenClient}>
                {copy.viewClient}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">{copy.noneAssigned}</p>
        )}
      </WorkspaceCard>

      <WorkspaceCard title={copy.opposingParty}>
        {opposing || opposingCounsel ? (
          <div>
            <p className="text-[15px] font-semibold">{opposing || '—'}</p>
            {opposingCounsel ? (
              <p className="mt-1 text-[13px] text-slate-600">
                {copy.opposingCounsel}: {opposingCounsel}
              </p>
            ) : null}
            <Button type="button" variant="outline" className="mt-3 h-9 rounded-lg" onClick={onConflict}>
              {copy.checkConflict}
            </Button>
          </div>
        ) : (
          <EmptyAction message={copy.opposingParty} />
        )}
      </WorkspaceCard>

      <WorkspaceCard title={copy.otherParties}>
        {thirds.length ? (
          <ul className="space-y-2 text-[13px]">
            {thirds.map((name) => (
              <li key={name} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800">
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-slate-500">{copy.noneAssigned}</p>
        )}
      </WorkspaceCard>
    </div>
  );
}
