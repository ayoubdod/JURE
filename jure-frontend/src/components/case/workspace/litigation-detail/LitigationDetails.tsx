import { Field, LongText, TagList, TimelineRow } from '@/components/case/case-detail-drawer/primitives';
import CaseLegalDeadlinesList from '@/components/case/CaseLegalDeadlinesList';
import { ConvertedCaseLink, getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { getCaseData } from '@/utils/caseCardHelpers';
import { clientDisplayName } from '@/services/case/caseType';
import { useAppTranslation } from '@/i18n';
import { WorkspaceCard } from './ui';
import {
  collaboratorsOf,
  courtLabels,
  keyDeadlinesOf,
  leadAttorney,
  notesText,
  personName,
  thirdPartyLabels,
} from './helpers';

export default function LitigationDetails({
  caseItem,
  onOpenCase,
}: {
  caseItem: API.Case;
  onOpenCase: (id: number) => void;
}) {
  const { t, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const modal = t.cases.modal;
  const origin = getConvertedFromCase(caseItem);
  const court = courtLabels(caseItem, t);
  const clientRole = getCaseData(caseItem, 'client_role') as string | undefined;
  const opposing = String(getCaseData(caseItem, 'opposing_party_name') ?? getCaseData(caseItem, 'opposing_party') ?? '');
  const opposingCounsel = String(getCaseData(caseItem, 'opposing_counsel') ?? '');
  const thirds = thirdPartyLabels(caseItem);
  const lead = leadAttorney(caseItem);
  const collabs = collaboratorsOf(caseItem);
  const litigationType = getCaseData(caseItem, 'litigation_type') as string | undefined;
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const filing = getCaseData(caseItem, 'filing_date') as string | undefined;
  const firstHearing = getCaseData(caseItem, 'first_hearing_date') as string | undefined;
  const nextHearing = getCaseData(caseItem, 'next_hearing_date') as string | undefined;
  const statute = getCaseData(caseItem, 'statute_of_limitations_date') as string | undefined;
  const keys = keyDeadlinesOf(caseItem);
  const notes = notesText(caseItem);

  return (
    <div className="space-y-4">
      {origin ? (
        <WorkspaceCard title={copy.origin}>
          <ConvertedCaseLink variant="origin" link={origin} onViewConsultation={onOpenCase} />
        </WorkspaceCard>
      ) : null}

      <WorkspaceCard title={copy.generalInfo}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={modal.fields.reference}>{caseItem.reference || '—'}</Field>
          <Field label={modal.fields.title}>{caseItem.title || '—'}</Field>
          <Field label={modal.fields.litigationType}>{litigationType ? enumPretty(litigationType) : '—'}</Field>
          <Field label={modal.fields.priority}>{priority ? enumPretty(priority) : '—'}</Field>
          <Field label={modal.fields.status}>{enumPretty(String(caseItem.status ?? '')) || caseItem.status}</Field>
          <Field label={copy.courtCaseNumber}>
            {court.courtCaseNumber ? <span className="font-mono text-[12px]">{court.courtCaseNumber}</span> : '—'}
          </Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.parties}>
        <div className="space-y-4">
          <Field label={modal.fields.relatedClient}>
            {clientDisplayName(caseItem.client) || '—'}
            {clientRole ? (
              <span className="ms-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase dark:bg-zinc-800">
                {enumPretty(clientRole)}
              </span>
            ) : null}
          </Field>
          <Field label={copy.opposingParty}>{opposing || '—'}</Field>
          <Field label={copy.opposingCounsel}>{opposingCounsel || '—'}</Field>
          <Field label={copy.thirdParties}>
            <TagList items={thirds} />
          </Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.jurisdictionCard}>
        <div className="grid gap-4 sm:grid-cols-2">
          {court.courtName ? <Field label={copy.snapshotCourt}>{court.courtName}</Field> : null}
          <Field label={copy.specialty}>{court.specialty || '—'}</Field>
          <Field label={copy.level}>{court.jurisdiction || '—'}</Field>
          <Field label={copy.chamber}>{court.chamber || '—'}</Field>
          <Field label={copy.city}>{court.city || '—'}</Field>
          <Field label={copy.judge}>{court.judge || '—'}</Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.team}>
        <div className="space-y-4">
          <Field label={copy.leadAttorney}>{lead ? personName(lead) : copy.noneAssigned}</Field>
          <Field label={copy.collaborators}>
            {collabs.length ? <TagList items={collabs.map(personName)} /> : copy.noneAssigned}
          </Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.chronology}>
        <div className="rounded-lg border border-slate-200 px-2 dark:border-zinc-800">
          <TimelineRow label={modal.fields.filingDate} dateIso={filing} />
          <TimelineRow label={modal.fields.firstHearingDate} dateIso={firstHearing} />
          <TimelineRow label={modal.fields.nextHearingDate} dateIso={nextHearing} highlight />
          <TimelineRow label={modal.fields.statuteOfLimitationsDate} dateIso={statute} />
          {keys.map((kd, i) => (
            <TimelineRow key={`${kd.label}-${i}`} label={kd.label || modal.fields.deadline} dateIso={kd.date} />
          ))}
        </div>
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            {copy.legalDeadlines}
          </p>
          <CaseLegalDeadlinesList caseId={caseItem.id} />
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.legalDetails}>
        <div className="space-y-4">
          <Field label={copy.facts}>{notes.facts ? <LongText>{notes.facts}</LongText> : '—'}</Field>
          <Field label={copy.arguments}>{notes.arguments ? <LongText>{notes.arguments}</LongText> : '—'}</Field>
        </div>
      </WorkspaceCard>
    </div>
  );
}
