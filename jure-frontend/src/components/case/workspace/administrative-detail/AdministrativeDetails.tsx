import { Field, LongText } from '@/components/case/case-detail-drawer/primitives';
import { ConvertedCaseLink, getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { formatDrawerDate } from '@/components/case/case-detail-drawer/format';
import { getCaseData, getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { WorkspaceCard } from '@/components/case/workspace/litigation-detail/ui';
import { leadAttorney, personName, requiredDocumentsOf } from '@/components/case/workspace/litigation-detail/helpers';
import {
  adminStatusOf,
  completionDateOf,
  dueDateOf,
  dutyTypeOf,
  institutionOf,
  institutionRefOf,
  startDateOf,
} from './helpers';

export default function AdministrativeDetails({
  caseItem,
  onOpenCase,
}: {
  caseItem: API.Case;
  onOpenCase: (id: number) => void;
}) {
  const { t, tf, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.administrative.detail;
  const origin = getConvertedFromCase(caseItem);
  const duty = dutyTypeOf(caseItem);
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const status = adminStatusOf(caseItem);
  const institution = institutionOf(caseItem);
  const instRef = institutionRefOf(caseItem);
  const start = startDateOf(caseItem);
  const due = dueDateOf(caseItem);
  const completion = completionDateOf(caseItem);
  const lead = leadAttorney(caseItem);
  const required = requiredDocumentsOf(caseItem);
  const missing = required.filter((d) => !d.completed).length;
  const dueDays = getCountdownDays(due);
  const dueStyle = dueDays == null ? 'normal' : getCountdownStyle(dueDays);

  return (
    <div className="space-y-4">
      {origin ? (
        <WorkspaceCard title={copy.origin}>
          <ConvertedCaseLink variant="origin" link={origin} onViewConsultation={onOpenCase} />
        </WorkspaceCard>
      ) : null}

      <WorkspaceCard title={copy.generalInfo}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.cases.modal.fields.reference}>{caseItem.reference || '—'}</Field>
          <Field label={t.cases.modal.fields.title}>{caseItem.title || '—'}</Field>
          <Field label={copy.snapshotDuty}>{duty ? enumPretty(duty) : '—'}</Field>
          <Field label={t.cases.modal.fields.status}>{enumPretty(status) || status}</Field>
          <Field label={copy.snapshotPriority}>{priority ? enumPretty(priority) : '—'}</Field>
          <Field label={copy.institution}>{institution || '—'}</Field>
          <Field label={copy.institutionRef}>
            {instRef ? <span className="font-mono text-[12px]">{instRef}</span> : '—'}
          </Field>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={copy.people}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.snapshotClient}>
            <CaseClientLabel client={caseItem.client} fallback={copy.noneAssigned} />
          </Field>
          <Field label={copy.leadAttorney}>{lead ? personName(lead) : copy.noneAssigned}</Field>
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

      <WorkspaceCard title={copy.requiredDocuments}>
        {required.length ? (
          <>
            <p className="mb-2 text-[12px] text-slate-500">
              {tf(copy.docsProgress, { done: required.length - missing, total: required.length })}
            </p>
            <ul className="space-y-2">
              {required.map((doc) => (
                <li key={doc.label} className="flex items-start gap-2 text-[13px]">
                  {doc.completed ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <span className={doc.completed ? '' : 'text-slate-500'}>{doc.label}</span>
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
