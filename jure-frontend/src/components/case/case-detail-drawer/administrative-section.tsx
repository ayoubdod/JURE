import React from 'react';
import { Check, Circle } from 'lucide-react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { ConvertedCaseLink, getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { em, formatDrawerDate } from './format';
import { CountdownBadge, Field, LongText, SectionTitle } from './primitives';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { useAppTranslation } from '@/i18n';

export function AdministrativeSection({
  c,
  onOpenCaseById,
}: {
  c: API.Case;
  onOpenCaseById?: (id: number) => void;
}) {
  const { enumPretty, t, tf } = useAppTranslation();
  const fields = t.cases.modal.fields;
  const sections = t.cases.modal.sections;
  const d = t.cases.workspace.administrative.detail;
  const dutyType = getCaseData(c, 'duty_type') as string | undefined;
  const priority = getCaseData(c, 'priority') as string | undefined;
  const institution =
    (getCaseData(c, 'institution') as string) ?? (getCaseData(c, 'institution_authority') as string) ?? '';
  const instRef = (getCaseData(c, 'institution_reference_number') as string) ?? '';
  const startDate = getCaseData(c, 'start_date') as string | undefined;
  const dueDate = getCaseData(c, 'due_date') as string | undefined;
  const completionDate = getCaseData(c, 'completion_date') as string | undefined;
  const rawDocs = getCaseData(c, 'required_documents');
  const docs = Array.isArray(rawDocs) ? rawDocs : [];

  const assigned = c.assigned_to as API.User | null | undefined;
  const client = c.client as API.User | null | undefined;

  const done = docs.filter((d) => d?.completed).length;
  const total = docs.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
        <SectionTitle>{sections.taskDetails}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.dutyType}>{dutyType ? enumPretty(dutyType) : '—'}</Field>
          <Field label={fields.status}>
            {em(
              enumPretty(String((getCaseData(c, 'status') as string) ?? c.status ?? '')) ||
                ((getCaseData(c, 'status') as string) ?? c.status)
            )}
          </Field>
          <Field label={fields.priority}>{em(priority ? enumPretty(priority) : priority)}</Field>
          <Field label={fields.institutionAuthority}>{em(institution)}</Field>
          <Field label={fields.institutionReferenceNumber}>
            {instRef ? <span className="font-mono text-[12px]">{instRef}</span> : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>{d.people}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.relatedClient}>
            <CaseClientLabel client={client} fallback={em(client?.email) || '—'} />
          </Field>
          <Field label={fields.assignedTo}>
            {assigned ? `${assigned.first_name ?? ''} ${assigned.last_name ?? ''}`.trim() || em(assigned.email) : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>{fields.description}</SectionTitle>
        <Field label={d.purpose}>
          {c.description?.trim() ? <LongText>{c.description}</LongText> : '—'}
        </Field>
      </section>

      <section>
        <SectionTitle>{sections.dates}</SectionTitle>
        <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{d.startDate}</span>
            <span className="text-[13px] text-slate-900 dark:text-slate-100">{startDate ? formatDrawerDate(startDate) : '—'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{fields.dueDateLegalDeadline}</span>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <span className="text-[13px] text-slate-900 dark:text-slate-100">{dueDate ? formatDrawerDate(dueDate) : '—'}</span>
              <CountdownBadge dateIso={dueDate} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{d.completion}</span>
            <span className="text-[13px] text-emerald-700 dark:text-emerald-400 font-medium">
              {completionDate ? tf(d.completedOn, { date: formatDrawerDate(completionDate) }) : '—'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>{sections.documentsChecklist}</SectionTitle>
        {total === 0 ? (
          <p className="text-[13px] text-slate-600 dark:text-slate-400">—</p>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-700 dark:text-slate-300">
              {tf(d.docsProgress, { done, total })}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-600/85 transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <ul className="space-y-2 pt-1">
              {docs.map((d, i) => (
                <li key={`${d?.label ?? i}-${i}`} className="flex items-start gap-2 text-[13px]">
                  {d?.completed ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden />
                  )}
                  <span className={d?.completed ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}>
                    {d?.label ? String(d.label) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
