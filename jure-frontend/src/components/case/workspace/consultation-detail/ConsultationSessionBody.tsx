'use client';

import React from 'react';
import { Building2, Phone, Video } from 'lucide-react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { em, formatDrawerDateTime } from '@/components/case/case-detail-drawer/format';
import { Field, LongText } from '@/components/case/case-detail-drawer/primitives';
import { formatDuration } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { useAppTranslation } from '@/i18n';
import { EmptyAction, WorkspaceCard } from '@/components/case/workspace/litigation-detail/ui';

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  IN_PERSON: <Building2 className="inline h-3.5 w-3.5 me-1 align-text-bottom text-slate-500" aria-hidden />,
  PHONE: <Phone className="inline h-3.5 w-3.5 me-1 align-text-bottom text-slate-500" aria-hidden />,
  VIDEO: <Video className="inline h-3.5 w-3.5 me-1 align-text-bottom text-slate-500" aria-hidden />,
};

/** Session leaf body: scheduling, people, legal context, notes, follow-ups. Convert lives in ConsultationSession. */
export default function ConsultationSessionBody({
  c,
  onOpenCaseById,
  onAddFollowUp,
}: {
  c: API.Case;
  onOpenCaseById?: (id: number) => void;
  onAddFollowUp?: () => void;
}) {
  const { enumPretty, t } = useAppTranslation();
  const cw = t.cases.modal.consultationWorkflow;
  const consultationDate = getCaseData(c, 'consultation_date') as string | undefined;
  const duration =
    (getCaseData(c, 'duration_minutes') as number | undefined) ??
    (getCaseData(c, 'duration') as string | undefined);
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
    <div className="space-y-4">
      <WorkspaceCard title={cw.sectionScheduling}>
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
            <Field label={cw.address}>{[address, city].filter(Boolean).join(', ') || '—'}</Field>
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
              {/* Join CTA lives in the header only */}
              <span className="break-all font-mono text-[12px] text-slate-600">{videoLink}</span>
            </Field>
          ) : null}
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={cw.sectionClient}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.cases.modal.fields.relatedClient}>
            <CaseClientLabel client={client} fallback={em(client?.email) || '—'} />
          </Field>
          <Field label={cw.assignedAttorneys}>{attorneyNames || '—'}</Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={t.cases.modal.sections.legalContext}>
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
      </WorkspaceCard>

      <WorkspaceCard title={cw.notes}>
        <div className="space-y-4">
          <Field label={t.cases.modal.fields.status}>{em(outcome ? enumPretty(outcome) : outcome)}</Field>
          <Field label={cw.notes}>
            {adviceSummary?.trim() ? <LongText>{adviceSummary}</LongText> : '—'}
          </Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard
        title={cw.followUp}
        action={
          onAddFollowUp ? (
            <button
              type="button"
              className="min-h-11 text-[12px] font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
              onClick={onAddFollowUp}
            >
              {cw.addFollowUp}
            </button>
          ) : null
        }
      >
        <div id="follow-ups">
          {followUps.length === 0 ? (
            <EmptyAction
              message={cw.noFollowUp}
              actionLabel={onAddFollowUp ? cw.addFollowUp : undefined}
              onAction={onAddFollowUp}
            />
          ) : (
            <ul className="space-y-2">
              {followUps.map((item) => {
                const itemAttorneys = item.assigned_attorneys?.length
                  ? item.assigned_attorneys
                  : item.assigned_to
                    ? [item.assigned_to]
                    : [];
                const names = itemAttorneys
                  .map((u) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-zinc-800"
                  >
                    <button
                      type="button"
                      className="w-full min-h-11 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
                      onClick={onOpenCaseById ? () => onOpenCaseById(item.id) : undefined}
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
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </WorkspaceCard>
    </div>
  );
}
