import React from 'react';
import { Building2, Phone, Video } from 'lucide-react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { ConvertedCaseLink, getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { em, formatDrawerDateTime } from './format';
import { Field, LongText, SectionTitle } from './primitives';
import { formatDuration } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { useAppTranslation } from '@/i18n';

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  IN_PERSON: <Building2 className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-500" aria-hidden />,
  PHONE: <Phone className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-500" aria-hidden />,
  VIDEO: <Video className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-500" aria-hidden />,
};

export function ConsultationSection({
  c,
  onOpenCaseById,
  onAddFollowUp,
  anchorFollowUps,
  hideConversion,
}: {
  c: API.Case;
  onOpenCaseById?: (id: number) => void;
  onAddFollowUp?: () => void;
  anchorFollowUps?: boolean;
  hideConversion?: boolean;
}) {
  const { enumPretty, t } = useAppTranslation();
  const cw = t.cases.modal.consultationWorkflow;
  const consultationDate = getCaseData(c, 'consultation_date') as string | undefined;
  const duration = (getCaseData(c, 'duration_minutes') as number | undefined) ?? (getCaseData(c, 'duration') as string | undefined);
  const format = getCaseData(c, 'format') as string | undefined;
  const consultationType = getCaseData(c, 'consultation_type') as string | undefined;
  const legalDomain = getCaseData(c, 'legal_domain') as string | undefined;
  const customDomain = getCaseData(c, 'custom_legal_domain') as string | undefined;
  const legalQuestion = getCaseData(c, 'legal_question') as string | undefined;
  const facts = getCaseData(c, 'facts_context') as string | undefined;
  const outcome = (getCaseData(c, 'outcome') as string) ?? (getCaseData(c, 'status') as string) ?? c.status;
  const adviceSummary = getCaseData(c, 'advice_summary') as string | undefined;
  const address = getCaseData(c, 'address') as string | undefined;
  const city = getCaseData(c, 'city') as string | undefined;
  const phoneNumber = getCaseData(c, 'phone_number') as string | undefined;
  const videoLink = getCaseData(c, 'video_link') as string | undefined;

  const assigned = c.assigned_to as API.User | null | undefined;
  const attorneys = c.assigned_attorneys?.length ? c.assigned_attorneys : assigned ? [assigned] : [];
  const converted = getConvertedToCase(c);
  const followUps = c.followUps ?? [];
  const client = c.client as API.User | null | undefined;

  const formatLabel = format ? enumPretty(format) : null;
  const formatDisplay = formatLabel ? (
    <span className="inline-flex items-center gap-1">
      {FORMAT_ICONS[format ?? ''] ?? null}
      {formatLabel}
    </span>
  ) : (
    '—'
  );

  const attorneyNames = attorneys
    .map((u) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-8">
      {converted && onOpenCaseById && !hideConversion && (
        <section>
          <SectionTitle>{cw.openCase}</SectionTitle>
          <ConvertedCaseLink variant="converted" link={converted} onViewCase={onOpenCaseById} />
        </section>
      )}
      <section>
        <SectionTitle>{cw.sectionScheduling}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.cases.modal.fields.consultationDateTime}>
            {consultationDate ? formatDrawerDateTime(consultationDate) : '—'}
          </Field>
          <Field label={t.cases.modal.fields.duration}>{em(formatDuration(duration) || duration)}</Field>
          <Field label={t.cases.modal.fields.format}>{formatDisplay}</Field>
          <Field label={t.cases.modal.fields.consultationType}>
            {consultationType ? enumPretty(consultationType) : '—'}
          </Field>
          {format === 'IN_PERSON' ? (
            <Field label={cw.address}>
              {[address, city].filter(Boolean).join(', ') || '—'}
            </Field>
          ) : null}
          {format === 'PHONE' ? (
            <Field label={cw.clientPhone}>
              {phoneNumber ? (
                <a className="text-[#64499D] underline-offset-2 hover:underline" href={`tel:${phoneNumber}`}>
                  {phoneNumber}
                </a>
              ) : (
                '—'
              )}
            </Field>
          ) : null}
          {format === 'VIDEO' && videoLink ? (
            <Field label={cw.videoLink}>
              <a
                className="inline-flex h-9 items-center rounded-lg bg-[#64499D] px-3 text-[12px] font-medium text-white"
                href={videoLink}
                target="_blank"
                rel="noreferrer"
              >
                {cw.joinConsultation}
              </a>
            </Field>
          ) : null}
        </div>
      </section>

      <section>
        <SectionTitle>{cw.sectionClient}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.cases.modal.fields.relatedClient}>
            <CaseClientLabel client={client} fallback={em(client?.email) || '—'} />
          </Field>
          <Field label={cw.assignedAttorneys}>{attorneyNames || '—'}</Field>
        </div>
      </section>

      <section>
        <SectionTitle>{t.cases.modal.sections.legalContext}</SectionTitle>
        <div className="space-y-4">
          <Field label={t.cases.modal.fields.legalDomain}>
            {legalDomain ? enumPretty(legalDomain) : '—'}
            {legalDomain === 'OTHER' && customDomain ? ` — ${customDomain}` : null}
          </Field>
          <Field label={t.cases.modal.fields.legalQuestion}>
            {legalQuestion?.trim() ? <LongText>{legalQuestion}</LongText> : '—'}
          </Field>
          <Field label={cw.facts}>{facts?.trim() ? <LongText>{facts}</LongText> : '—'}</Field>
        </div>
      </section>

      <section>
        <SectionTitle>{cw.notes}</SectionTitle>
        <div className="space-y-4">
          <Field label={t.cases.modal.fields.status}>{em(outcome ? enumPretty(outcome) : outcome)}</Field>
          <Field label={cw.notes}>
            {adviceSummary?.trim() ? <LongText>{adviceSummary}</LongText> : '—'}
          </Field>
        </div>
      </section>

      <section id={anchorFollowUps ? 'follow-ups' : undefined}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {cw.followUp}
          </h3>
          {onAddFollowUp ? (
            <button
              type="button"
              className="text-[12px] font-medium text-[#64499D] hover:underline"
              onClick={onAddFollowUp}
            >
              {cw.addFollowUp}
            </button>
          ) : null}
        </div>
        {followUps.length === 0 ? (
          <p className="text-[13px] text-slate-500">{cw.noFollowUp}</p>
        ) : (
          <ul className="space-y-2">
            {followUps.map((item) => {
              const attorneys = item.assigned_attorneys?.length
                ? item.assigned_attorneys
                : item.assigned_to
                  ? [item.assigned_to]
                  : [];
              const names = attorneys
                .map((u) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email)
                .filter(Boolean)
                .join(', ');
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[12px] text-slate-500">{item.reference}</span>
                    {item.outcome || item.status ? (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {enumPretty(String(item.outcome || item.status))}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                    {item.consultationDate ? formatDrawerDateTime(item.consultationDate) : '—'}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {[
                      item.format ? enumPretty(item.format) : null,
                      item.durationMinutes != null ? formatDuration(item.durationMinutes) : null,
                      names ? `${cw.assignedAttorneys}: ${names}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
