import { Field, LongText } from '@/components/case/case-detail-drawer/primitives';
import { formatDrawerDate } from '@/components/case/case-detail-drawer/format';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { WorkspaceCard } from '@/components/case/workspace/litigation-detail/ui';
import { requiredDocumentsOf } from '@/components/case/workspace/litigation-detail/helpers';
import {
  completionDateOf,
  dueDateOf,
  dutyTypeOf,
  institutionOf,
  institutionRefOf,
  startDateOf,
} from './helpers';

/** Canonical home for institution, duty type, purpose, chronology, required docs. */
export default function AdministrativeDutyFile({
  caseItem,
  onOpenDocuments,
}: {
  caseItem: API.Case;
  onOpenDocuments?: () => void;
}) {
  const { t, tf, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.administrative.detail;
  const duty = dutyTypeOf(caseItem);
  const institution = institutionOf(caseItem);
  const instRef = institutionRefOf(caseItem);
  const start = startDateOf(caseItem);
  const due = dueDateOf(caseItem);
  const completion = completionDateOf(caseItem);
  const required = requiredDocumentsOf(caseItem);
  const missing = required.filter((d) => !d.completed).length;
  const dueDays = getCountdownDays(due);
  const dueStyle = dueDays == null ? 'normal' : getCountdownStyle(dueDays);

  return (
    <div className="space-y-4">
      <WorkspaceCard title={copy.generalInfo}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.snapshotDuty}>{duty ? enumPretty(duty) : '—'}</Field>
          <Field label={copy.institution}>{institution || '—'}</Field>
          <Field label={copy.institutionRef}>
            {instRef ? <span className="font-mono text-[12px]">{instRef}</span> : '—'}
          </Field>
          <Field label={t.cases.modal.fields.reference}>{caseItem.reference || '—'}</Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.purpose}>
        {caseItem.description?.trim() ? <LongText>{caseItem.description}</LongText> : '—'}
      </WorkspaceCard>

      <WorkspaceCard title={copy.chronology}>
        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">{copy.startDate}</span>
            <span>{start ? formatDrawerDate(start) : '—'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-500">{copy.dueDate}</span>
            <div className="flex items-center gap-2">
              <span>{due ? formatDrawerDate(due) : '—'}</span>
              {dueDays != null ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    dueDays < 0 && 'bg-slate-200 text-slate-600 line-through',
                    dueDays >= 0 && dueStyle === 'critical' && 'bg-red-600 text-white',
                    dueDays >= 0 && dueStyle === 'warning' && 'bg-amber-500/90 text-amber-950',
                    dueDays >= 0 && dueStyle === 'normal' && 'bg-slate-100 text-slate-700'
                  )}
                >
                  {dueDays < 0 ? copy.overdue : dueDays === 0 ? copy.today : tf(copy.inDays, { count: dueDays })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">{copy.completion}</span>
            <span className={completion ? 'font-medium text-emerald-700' : 'text-slate-500'}>
              {completion ? tf(copy.completedOn, { date: formatDrawerDate(completion) }) : copy.notCompleted}
            </span>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard
        title={copy.requiredDocuments}
        action={
          onOpenDocuments ? (
            <button
              type="button"
              onClick={onOpenDocuments}
              className="min-h-11 text-[12px] font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
            >
              {t.cases.workspaces.shell.groups.documents}
            </button>
          ) : null
        }
      >
        {required.length ? (
          <>
            <p className="mb-2 text-[12px] text-slate-500">
              {tf(copy.docsProgress, { done: required.length - missing, total: required.length })}
            </p>
            <ul className="space-y-2">
              {required.map((doc) => (
                <li key={doc.label} className="flex items-start gap-2 text-[13px]">
                  {doc.completed ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  )}
                  <button
                    type="button"
                    className={cn(
                      'min-h-11 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40',
                      doc.completed ? '' : 'text-slate-500 hover:underline'
                    )}
                    onClick={doc.completed ? undefined : onOpenDocuments}
                  >
                    {doc.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[13px] text-slate-500">{copy.noDocuments}</p>
        )}
      </WorkspaceCard>
    </div>
  );
}
