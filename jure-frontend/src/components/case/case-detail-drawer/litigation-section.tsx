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
  const { enumPretty } = useAppTranslation();
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
  const courtName = (getCaseData(c, 'court_name') as string) ?? c.court ?? '';
  const jurisdiction = (getCaseData(c, 'jurisdiction') as string) ?? '';
  const chamber = (getCaseData(c, 'chamber_division') as string) ?? (getCaseData(c, 'chamber') as string) ?? '';
  const judgeName = (getCaseData(c, 'judge_name') as string) ?? '';
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
          <SectionTitle>Originated from consultation</SectionTitle>
          <ConvertedCaseLink
            variant="origin"
            link={origin}
            onViewConsultation={onOpenCaseById}
          />
        </section>
      )}
      <section>
        <SectionTitle>Case overview</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Litigation type">
            {litigationType ? enumPretty(litigationType) : '—'}
          </Field>
          <Field label="Status">{em(enumPretty(c.status) || c.status)}</Field>
          <Field label="Priority">{em(priority ? enumPretty(priority) : priority)}</Field>
          <Field label="Court case number">
            {courtCaseNumber ? <span className="font-mono text-[12px]">{courtCaseNumber}</span> : '—'}
          </Field>
          <Field label="Filing date">{filingDate ? formatDrawerDate(filingDate) : '—'}</Field>
        </div>
      </section>

      <section>
        <SectionTitle>Parties</SectionTitle>
        <div className="space-y-4">
          <Field label="Client">
            <span>{clientName}</span>
            {clientRole && (
              <span className="ml-2 inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {enumPretty(clientRole)}
              </span>
            )}
          </Field>
          <Field label="Opposing party">{em(opposingParty)}</Field>
          <Field label="Opposing counsel">{em(opposingCounsel)}</Field>
          <Field label="Third parties / witnesses">
            <TagList items={thirdParties.filter(Boolean)} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Court & jurisdiction</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Court name">{em(courtName)}</Field>
          <Field label="Jurisdiction / city">{em(jurisdiction)}</Field>
          <Field label="Chamber / division">{em(chamber)}</Field>
          <Field label="Judge name">{em(judgeName)}</Field>
        </div>
      </section>

      <section>
        <SectionTitle>Legal team</SectionTitle>
        <div className="space-y-4">
          <Field label="Lead attorney">
            {lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || em(lead.email) : '—'}
          </Field>
          <Field label="Co-counsel">
            <TagList items={coCounsel} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Timeline & deadlines</SectionTitle>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 px-2">
          <TimelineRow label="Filing date" dateIso={filingDate} />
          <TimelineRow label="First hearing date" dateIso={firstHearing} />
          <TimelineRow label="Next hearing date" dateIso={nextHearing} highlight />
          <TimelineRow label="Statute of limitations" dateIso={statute} />
          {keyDeadlines.map((kd, i) => (
            <TimelineRow
              key={`${kd?.label ?? 'd'}-${i}`}
              label={kd?.label ? String(kd.label) : 'Deadline'}
              dateIso={kd?.date as string}
            />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Calculated legal deadlines
          </p>
          <CaseLegalDeadlinesList caseId={c.id} />
        </div>
      </section>

      <section>
        <SectionTitle>Case details</SectionTitle>
        <div className="space-y-4">
          <Field label="Description / facts">
            {c.description?.trim() ? <LongText>{c.description}</LongText> : '—'}
          </Field>
          <Field label="Legal arguments">
            {legalArguments.trim() ? <LongText>{legalArguments}</LongText> : '—'}
          </Field>
        </div>
      </section>
    </div>
  );
}
