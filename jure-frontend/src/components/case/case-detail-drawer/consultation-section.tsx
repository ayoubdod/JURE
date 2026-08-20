import React from 'react';
import { Building2, Phone, Video } from 'lucide-react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { ConvertedCaseLink, getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { em, formatDrawerDate, formatDrawerDateTime } from './format';
import { BoolTag, Field, LongText, SectionTitle } from './primitives';
import { useAppTranslation } from '@/i18n';

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  IN_PERSON: <Building2 className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-500" aria-hidden />,
  PHONE: <Phone className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-500" aria-hidden />,
  VIDEO: <Video className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-500" aria-hidden />,
};

export function ConsultationSection({
  c,
  onOpenCaseById,
}: {
  c: API.Case;
  onOpenCaseById?: (id: number) => void;
}) {
  const { enumPretty } = useAppTranslation();
  const consultationDate = getCaseData(c, 'consultation_date') as string | undefined;
  const duration = getCaseData(c, 'duration') as string | undefined;
  const format = getCaseData(c, 'format') as string | undefined;
  const consultationType = getCaseData(c, 'consultation_type') as string | undefined;
  const legalDomain = getCaseData(c, 'legal_domain') as string | undefined;
  const legalQuestion = getCaseData(c, 'legal_question') as string | undefined;
  const outcome = (getCaseData(c, 'outcome') as string) ?? (getCaseData(c, 'status') as string) ?? c.status;
  const adviceSummary = getCaseData(c, 'advice_summary') as string | undefined;
  const followUpRequired = getCaseData(c, 'follow_up_required') as boolean | undefined;
  const followUpDate = getCaseData(c, 'follow_up_date') as string | undefined;

  const assigned = c.assigned_to as API.User | null | undefined;
  const client = c.client as API.User | null | undefined;
  const clientName = client
    ? [client.first_name, client.last_name].filter(Boolean).join(' ') || em(client.email)
    : '—';

  const formatLabel = format ? enumPretty(format) : null;
  const formatDisplay = formatLabel ? (
    <span className="inline-flex items-center gap-1">
      {FORMAT_ICONS[format ?? ''] ?? null}
      {formatLabel}
    </span>
  ) : (
    '—'
  );

  const converted = getConvertedToCase(c);

  return (
    <div className="space-y-8">
      {converted && onOpenCaseById && (
        <section>
          <SectionTitle>Converted to case</SectionTitle>
          <ConvertedCaseLink variant="converted" link={converted} onViewCase={onOpenCaseById} />
        </section>
      )}
      <section>
        <SectionTitle>Scheduling</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Consultation date & time">
            {consultationDate ? formatDrawerDateTime(consultationDate) : '—'}
          </Field>
          <Field label="Duration">{em(duration)}</Field>
          <Field label="Format">{formatDisplay}</Field>
          <Field label="Consultation type">
            {consultationType ? enumPretty(consultationType) : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>People</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Related client">{clientName}</Field>
          <Field label="Assigned attorney">
            {assigned ? `${assigned.first_name ?? ''} ${assigned.last_name ?? ''}`.trim() || em(assigned.email) : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Legal context</SectionTitle>
        <div className="space-y-4">
          <Field label="Legal domain">
            {legalDomain ? enumPretty(legalDomain) : '—'}
          </Field>
          <Field label="Legal question / subject">
            {legalQuestion?.trim() ? <LongText>{legalQuestion}</LongText> : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Outcome</SectionTitle>
        <div className="space-y-4">
          <Field label="Status">{em(outcome ? enumPretty(outcome) : outcome)}</Field>
          <Field label="Advice summary / notes">
            {adviceSummary?.trim() ? <LongText>{adviceSummary}</LongText> : '—'}
          </Field>
          <Field label="Follow-up required">
            <BoolTag value={followUpRequired ?? null} />
          </Field>
          {followUpRequired === true && (
            <Field label="Follow-up date">{followUpDate ? formatDrawerDate(followUpDate) : '—'}</Field>
          )}
        </div>
      </section>
    </div>
  );
}
