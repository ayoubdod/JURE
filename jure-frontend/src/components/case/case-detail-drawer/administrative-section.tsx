import React from 'react';
import { Check, Circle } from 'lucide-react';
import { getCaseData, getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { ConvertedCaseLink, getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { em, formatDrawerDate } from './format';
import { Field, LongText, SectionTitle } from './primitives';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

function DueCountdown({ dateIso }: { dateIso: string | undefined }) {
  if (!dateIso) return <span className="text-[13px]">—</span>;
  const days = getCountdownDays(dateIso);
  if (days === null) return <span className="text-[13px]">—</span>;
  if (days < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 line-through decoration-slate-500">
        Passed
      </span>
    );
  }
  const st = getCountdownStyle(days);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
        st === 'critical' && 'bg-red-600 text-white',
        st === 'warning' && 'bg-amber-500/90 text-amber-950',
        st === 'normal' && 'bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
      )}
    >
      {st === 'normal' ? `in ${days} days` : days === 0 ? 'Today' : `${days} days`}
    </span>
  );
}

export function AdministrativeSection({
  c,
  onOpenCaseById,
}: {
  c: API.Case;
  onOpenCaseById?: (id: number) => void;
}) {
  const { enumPretty } = useAppTranslation();
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
  const clientName = client
    ? [client.first_name, client.last_name].filter(Boolean).join(' ') || em(client.email)
    : '—';

  const done = docs.filter((d) => d?.completed).length;
  const total = docs.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
        <SectionTitle>Task overview</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duty type">{dutyType ? enumPretty(dutyType) : '—'}</Field>
          <Field label="Status">
            {em(
              enumPretty(String((getCaseData(c, 'status') as string) ?? c.status ?? '')) ||
                ((getCaseData(c, 'status') as string) ?? c.status)
            )}
          </Field>
          <Field label="Priority">{em(priority ? enumPretty(priority) : priority)}</Field>
          <Field label="Institution / authority">{em(institution)}</Field>
          <Field label="Institution reference number">
            {instRef ? <span className="font-mono text-[12px]">{instRef}</span> : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>People</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Related client">{clientName}</Field>
          <Field label="Assigned to">
            {assigned ? `${assigned.first_name ?? ''} ${assigned.last_name ?? ''}`.trim() || em(assigned.email) : '—'}
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Description</SectionTitle>
        <Field label="Purpose / description">
          {c.description?.trim() ? <LongText>{c.description}</LongText> : '—'}
        </Field>
      </section>

      <section>
        <SectionTitle>Dates</SectionTitle>
        <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Start date</span>
            <span className="text-[13px] text-slate-900 dark:text-slate-100">{startDate ? formatDrawerDate(startDate) : '—'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Due date / legal deadline</span>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <span className="text-[13px] text-slate-900 dark:text-slate-100">{dueDate ? formatDrawerDate(dueDate) : '—'}</span>
              <DueCountdown dateIso={dueDate} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Completion</span>
            <span className="text-[13px] text-emerald-700 dark:text-emerald-400 font-medium">
              {completionDate ? `Completed on ${formatDrawerDate(completionDate)}` : '—'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Documents checklist</SectionTitle>
        {total === 0 ? (
          <p className="text-[13px] text-slate-600 dark:text-slate-400">—</p>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-700 dark:text-slate-300">
              {done} of {total} documents completed
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
