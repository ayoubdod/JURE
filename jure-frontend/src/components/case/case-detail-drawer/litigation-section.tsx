import React from 'react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { ConvertedCaseLink, getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { em, formatDrawerDate } from './format';
import { Field, LongText, SectionTitle, TagList, TimelineRow } from './primitives';
import CaseLegalDeadlinesList from '@/components/case/CaseLegalDeadlinesList';
import { useAppTranslation } from '@/i18n';

function coCounselPills(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => (typeof x === 'number' ? `Counsel #${x}` : String(x))).filter(Boolean);
  }
  return [];
}

export function LitigationSection({
  c,
  onOpenCaseById,
}: {
  c: API.Case;
  onOpenCaseById?: (id: number) => void;
}) {
  const { enumPretty, t } = useAppTranslation();
  const litigationType = getCaseData(c, 'litigation_type') as string | undefined;
  const priority = getCaseData(c, 'priority') as string | undefined;
  const courtCaseNumber = getCaseData(c, 'court_case_number') as string | undefined;
  const filingDate = getCaseData(c, 'filing_date') as string | undefined;
  const clientRole = getCaseData(c, 'client_role') as string | undefined;
  const opposingParty =
    (getCaseData(c, 'opposing_party_name') as string) ?? (getCaseData(c, 'opposing_party') as string) ?? '';
  const opposingCounsel = (getCaseData(c, 'opposing_counsel') as string) ?? '';
  const rawThird = getCaseData(c, 'third_parties');
  const thirdParties: string[] = Array.isArray(rawThird)
    ? rawThird.map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : JSON.stringify(x)))
    : typeof rawThird === 'string' && rawThird
      ? [rawThird]
      : [];
  const courtSpecialty = (getCaseData(c, 'court_specialty') as string) ?? '';
  const jurisdiction = (getCaseData(c, 'jurisdiction') as string) ?? '';
  const city = (getCaseData(c, 'city') as string) ?? '';
  const chamber = (getCaseData(c, 'chamber_division') as string) ?? (getCaseData(c, 'chamber') as string) ?? '';
  const judgeName = (getCaseData(c, 'judge_name') as string) ?? '';
  const jurisdictionLevelLabel =
    jurisdiction && jurisdiction in t.cases.modal.options.jurisdictionLevel
      ? t.cases.modal.options.jurisdictionLevel[
          jurisdiction as keyof typeof t.cases.modal.options.jurisdictionLevel
        ]
      : em(jurisdiction);
  const chamberLabel = (() => {
    if (jurisdiction === 'FIRST_INSTANCE' && chamber in t.cases.modal.options.chamberFirstInstance) {
      return t.cases.modal.options.chamberFirstInstance[
        chamber as keyof typeof t.cases.modal.options.chamberFirstInstance
      ];
    }
    if (jurisdiction === 'APPEAL' && chamber in t.cases.modal.options.chamberAppeal) {
      return t.cases.modal.options.chamberAppeal[
        chamber as keyof typeof t.cases.modal.options.chamberAppeal
      ];
    }
    if (jurisdiction === 'CASSATION' && chamber in t.cases.modal.options.chamberCassation) {
      return t.cases.modal.options.chamberCassation[
        chamber as keyof typeof t.cases.modal.options.chamberCassation
      ];
    }
    return chamber;
  })();
  const lead = c.assigned_to as API.User | null | undefined;
  const coCounsel = coCounselPills(getCaseData(c, 'co_counsel'));
  const firstHearing = getCaseData(c, 'first_hearing_date') as string | undefined;
  const nextHearing = getCaseData(c, 'next_hearing_date') as string | undefined;
  const statute = getCaseData(c, 'statute_of_limitations_date') as string | undefined;
  const rawDeadlines = getCaseData(c, 'key_deadlines');
  const keyDeadlines = Array.isArray(rawDeadlines) ? rawDeadlines : [];
  const legalArguments = (getCaseData(c, 'legal_arguments') as string) ?? '';

  const client = c.client as API.User | null | undefined;
  const clientName = client
    ? [client.first_name, client.last_name].filter(Boolean).join(' ') || em(client.email)
    : '—';

  const origin = getConvertedFromCase(c);

  return (
    <div className="space-y-8">
      {origin && onOpenCaseById && (
        <section>
          <SectionTitle>{t.cases.pageWorkspace.originatedFrom}</SectionTitle>
          <ConvertedCaseLink
            variant="origin"
            link={origin}
            onViewConsultation={onOpenCaseById}
          />
        </section>
      )}
      <section>
        <SectionTitle>{t.cases.pageWorkspace.overview}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.cases.modal.fields.litigationType}>
            {litigationType ? enumPretty(litigationType) : '—'}
          </Field>
          <Field label={t.cases.modal.fields.status}>{em(enumPretty(c.status) || c.status)}</Field>
          <Field label={t.cases.modal.fields.priority}>{em(priority ? enumPretty(priority) : priority)}</Field>
          <Field label={t.cases.modal.fields.courtCaseNumber}>
            {courtCaseNumber ? <span className="font-mono text-[12px]">{courtCaseNumber}</span> : '—'}
          </Field>
          <Field label={t.cases.modal.fields.filingDate}>{filingDate ? formatDrawerDate(filingDate) : '—'}</Field>
        </div>
      </section>

      <section>
        <SectionTitle>{t.cases.modal.sections.parties}</SectionTitle>
        <div className="space-y-4">
          <Field label={t.cases.modal.fields.relatedClient}>
            <span>{clientName}</span>
            {clientRole && (
              <span className="ml-2 inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {enumPretty(clientRole)}
              </span>
            )}
          </Field>
          <Field label={t.cases.modal.fields.opposingPartyName}>{em(opposingParty)}</Field>
          <Field label={t.cases.modal.fields.opposingCounsel}>{em(opposingCounsel)}</Field>
          <Field label={t.cases.modal.fields.thirdParties}>
            <TagList items={thirdParties.filter(Boolean)} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>{t.cases.modal.sections.courtJurisdiction}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.cases.modal.fields.courtSpecialty}>
            {courtSpecialty ? t.cases.modal.options.courtSpecialty[courtSpecialty as keyof typeof t.cases.modal.options.courtSpecialty] ?? enumPretty(courtSpecialty) : '—'}
          </Field>
          <Field label={t.cases.modal.fields.jurisdictionLevel}>
            {jurisdictionLevelLabel}
          </Field>
          <Field label={t.cases.modal.fields.chamberDivision}>{em(chamberLabel)}</Field>
          <Field label={t.cases.modal.fields.city}>{em(city)}</Field>
          <Field label={t.cases.modal.fields.judgePresident}>{em(judgeName)}</Field>
        </div>
      </section>

      <section>
        <SectionTitle>{t.cases.modal.sections.assignedTeam}</SectionTitle>
        <div className="space-y-4">
          <Field label={t.cases.modal.fields.leadAttorney}>
            {lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || em(lead.email) : '—'}
          </Field>
          <Field label={t.cases.modal.fields.additionalAttorneys}>
            <TagList items={coCounsel} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>{t.cases.modal.sections.timelineDeadlines}</SectionTitle>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 px-2">
          <TimelineRow label={t.cases.modal.fields.filingDate} dateIso={filingDate} />
          <TimelineRow label={t.cases.modal.fields.firstHearingDate} dateIso={firstHearing} />
          <TimelineRow label={t.cases.modal.fields.nextHearingDate} dateIso={nextHearing} highlight />
          <TimelineRow label={t.cases.modal.fields.statuteOfLimitationsDate} dateIso={statute} />
          {keyDeadlines.map((kd, i) => (
            <TimelineRow
              key={`${kd?.label ?? 'd'}-${i}`}
              label={kd?.label ? String(kd.label) : t.cases.modal.fields.deadline}
              dateIso={kd?.date as string}
            />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            {t.cases.modal.fields.calculatedLegalDeadlines}
          </p>
          <CaseLegalDeadlinesList caseId={c.id} />
        </div>
      </section>

      <section>
        <SectionTitle>{t.cases.modal.sections.caseDetails}</SectionTitle>
        <div className="space-y-4">
          <Field label={t.cases.modal.fields.descriptionFacts}>
            {c.description?.trim() ? <LongText>{c.description}</LongText> : '—'}
          </Field>
          <Field label={t.cases.modal.fields.legalArguments}>
            {legalArguments.trim() ? <LongText>{legalArguments}</LongText> : '—'}
          </Field>
        </div>
      </section>
    </div>
  );
}
