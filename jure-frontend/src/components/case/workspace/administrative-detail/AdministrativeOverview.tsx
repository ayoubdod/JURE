import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { getCaseData, getCountdownDays, getStatusColor } from '@/utils/caseCardHelpers';
import { clientDisplayName } from '@/services/case/caseType';
import { getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { formatMAD } from '@/utils/formatMAD';
import { TaskStatus } from '@/utils/constants';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import { EmptyAction, PersonAvatar, TextLink, WorkspaceCard } from '@/components/case/workspace/litigation-detail/ui';
import {
  formatShortDate,
  incompleteTasks,
  leadAttorney,
  overdueTasks,
  personName,
  relativeDayLabel,
  requiredDocumentsOf,
} from '@/components/case/workspace/litigation-detail/helpers';
import {
  adminStatusOf,
  dueDateOf,
  dutyTypeOf,
  institutionOf,
  institutionRefOf,
  type AdministrativeDetailSection,
} from './helpers';

export default function AdministrativeOverview({
  caseItem,
  canEdit,
  showFinance,
  legalDeadlines,
  finance,
  onOpenSection,
  onOpenClient,
  onOpenCase,
  onAddTask,
  onAddDeadline,
  onAddAppointment,
  onUpload,
  onEdit,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  showFinance: boolean;
  legalDeadlines: CalculatedDeadline[] | null;
  finance: API.FinanceCaseSummary | null;
  onOpenSection: (id: AdministrativeDetailSection) => void;
  onOpenClient: () => void;
  onOpenCase: (id: number) => void;
  onAddTask: () => void;
  onAddDeadline: () => void;
  onAddAppointment: () => void;
  onUpload: () => void;
  onEdit: () => void;
}) {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.administrative.detail;
  const modal = t.cases.modal;
  const origin = getConvertedFromCase(caseItem);
  const status = adminStatusOf(caseItem);
  const duty = dutyTypeOf(caseItem);
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const institution = institutionOf(caseItem);
  const instRef = institutionRefOf(caseItem);
  const due = dueDateOf(caseItem);
  const dueDays = getCountdownDays(due);
  const lead = leadAttorney(caseItem);
  const tasksOpen = incompleteTasks(caseItem).slice(0, 5);
  const overdue = overdueTasks(caseItem);
  const required = requiredDocumentsOf(caseItem);
  const missingDocs = required.filter((d) => !d.completed);
  const attachments = caseItem.attachments ?? [];
  const activity = (caseItem.activity ?? []).slice(0, 6);
  const nextLegal = (legalDeadlines ?? [])
    .filter((d) => d.status !== 'completed' && d.status !== 'cancelled')
    .sort((a, b) => new Date(a.final_deadline || a.calculated_deadline).getTime() - new Date(b.final_deadline || b.calculated_deadline).getTime())[0];

  const urgency = (iso: string) => {
    const days = getCountdownDays(iso);
    if (days == null) return 'text-slate-500';
    if (days < 0 || days <= 3) return 'text-red-600';
    if (days <= 14) return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={onAddTask}>
          {copy.addTask}
        </Button>
        {canEdit ? (
          <Button type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={onAddDeadline}>
            {copy.addDeadline}
          </Button>
        ) : null}
        {canEdit ? (
          <Button type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={onUpload}>
            {copy.addDocument}
          </Button>
        ) : null}
        {canEdit ? (
          <Button type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={onEdit}>
            {copy.addNote}
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={onAddAppointment}>
          {copy.addAppointment}
        </Button>
      </div>

      <WorkspaceCard title={copy.dossier}>
        <p className="font-mono text-[12px] text-slate-500">{caseItem.reference || '—'}</p>
        <p className="mt-1 text-[16px] font-semibold text-slate-900 dark:text-white">
          {caseItem.title || t.cases.untitledCase}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{modal.fields.status}</dt>
            <dd className="mt-1">
              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset', getStatusColor(status))}>
                {enumPretty(status) || status}
              </span>
            </dd>
          </div>
          {duty ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.snapshotDuty}</dt>
              <dd className="mt-1 text-[13px] font-medium">{enumPretty(duty)}</dd>
            </div>
          ) : null}
          {priority ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.snapshotPriority}</dt>
              <dd className="mt-1 text-[13px] font-medium">{enumPretty(priority)}</dd>
            </div>
          ) : null}
          {institution ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.institution}</dt>
              <dd className="mt-1 text-[13px] font-medium">{institution}</dd>
            </div>
          ) : null}
        </dl>
        {origin ? (
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-zinc-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.origin}</p>
            <p className="mt-1 text-[13px]">
              {copy.convertedFrom}
              {origin.reference ? ` · ${origin.reference}` : ''}
            </p>
            <TextLink onClick={() => onOpenCase(origin.id)}>{copy.viewConsultation}</TextLink>
          </div>
        ) : null}
      </WorkspaceCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => onOpenSection('deadlines')} className="rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.dueDate}</p>
          <p className={cn('mt-1 text-[15px] font-semibold', due && urgency(due))}>
            {due ? formatShortDate(due, lang) : copy.noneScheduled}
          </p>
          {due ? <p className={cn('mt-0.5 text-[12px]', urgency(due))}>{relativeDayLabel(due, lang, copy, tf)}</p> : null}
        </button>
        <button type="button" onClick={() => onOpenSection('deadlines')} className="rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{t.cases.pageWorkspace.tabs.deadlines}</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">
            {nextLegal ? formatShortDate(nextLegal.final_deadline || nextLegal.calculated_deadline, lang) : copy.noneScheduled}
          </p>
        </button>
        <button type="button" onClick={() => onOpenSection('tasks')} className="rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.overdueTasks}</p>
          <p className={cn('mt-1 text-[15px] font-semibold', overdue.length ? 'text-red-600' : 'text-slate-900 dark:text-white')}>
            {overdue.length}
          </p>
        </button>
        <button type="button" onClick={() => onOpenSection('documents')} className="rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.missingDocuments}</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">{missingDocs.length}</p>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard
          title={copy.todoTasks}
          action={<TextLink onClick={() => onOpenSection('tasks')}>{copy.viewAll}</TextLink>}
        >
          {tasksOpen.length ? (
            <ul className="space-y-2">
              {tasksOpen.map((task) => (
                <li key={task.id} className="text-[13px]">
                  <p className="font-medium">
                    {task.status === TaskStatus.DONE ? '☑' : '☐'} {task.title}
                  </p>
                  <p className="text-[12px] text-slate-500">
                    {[
                      personName(task.assigned_to_details) || personName(task.assignees?.[0]),
                      task.due_date ? formatDate(task.due_date, lang, { day: 'numeric', month: 'short' }) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyAction message={copy.noTasks} actionLabel={copy.addTask} onAction={onAddTask} />
          )}
        </WorkspaceCard>

        <WorkspaceCard
          title={copy.requiredDocuments}
          action={<TextLink onClick={() => onOpenSection('documents')}>{copy.viewAll}</TextLink>}
        >
          {required.length ? (
            <>
              <p className="mb-2 text-[12px] text-slate-500">
                {tf(copy.docsProgress, { done: required.length - missingDocs.length, total: required.length })}
              </p>
              <ul className="space-y-1 text-[13px]">
                {required.slice(0, 6).map((doc) => (
                  <li key={doc.label} className="flex items-center justify-between gap-2">
                    <span>{doc.label}</span>
                    <span className={doc.completed ? 'text-emerald-600' : 'text-amber-600'}>
                      {doc.completed ? copy.complete : copy.missing}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : attachments.length ? (
            <p className="text-[13px]">{attachments.length} {copy.documents.toLowerCase()}</p>
          ) : (
            <EmptyAction message={copy.noDocuments} actionLabel={canEdit ? copy.addDocument : undefined} onAction={canEdit ? onUpload : undefined} />
          )}
        </WorkspaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard title={copy.institution} action={<TextLink onClick={() => onOpenSection('administrative')}>{copy.viewAll}</TextLink>}>
          {institution || instRef ? (
            <dl className="space-y-2 text-[13px]">
              {institution ? <dd className="font-medium">{institution}</dd> : null}
              {instRef ? (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.institutionRef}</dt>
                  <dd className="font-mono text-[12px]">{instRef}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-[13px] text-slate-500">{copy.noneAssigned}</p>
          )}
        </WorkspaceCard>

        <WorkspaceCard title={copy.team} action={caseItem.client?.id ? <TextLink onClick={onOpenClient}>{copy.viewClient}</TextLink> : undefined}>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.snapshotClient}</p>
              <p className="text-[13px] font-medium">{clientDisplayName(caseItem.client) || copy.noneAssigned}</p>
            </div>
            {lead ? (
              <div className="flex items-center gap-2">
                <PersonAvatar name={personName(lead)} src={lead.image} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.leadAttorney}</p>
                  <p className="text-[13px] font-medium">{personName(lead)}</p>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">{copy.noneAssigned}</p>
            )}
          </div>
        </WorkspaceCard>
      </div>

      <div className={cn('grid gap-4', showFinance ? 'lg:grid-cols-2' : '')}>
        <WorkspaceCard
          title={copy.recentActivity}
          action={<TextLink onClick={() => onOpenSection('activity')}>{copy.viewAll}</TextLink>}
        >
          {activity.length ? (
            <ol className="space-y-2">
              {activity.map((item) => (
                <li key={item.id} className="text-[13px]">
                  <p className="font-medium">{item.message}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.created ? formatDate(item.created, lang, { day: 'numeric', month: 'short' }) : ''}
                    {item.actor ? ` · ${[item.actor.first_name, item.actor.last_name].filter(Boolean).join(' ')}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-slate-500">{copy.noActivity}</p>
          )}
        </WorkspaceCard>

        {showFinance ? (
          <WorkspaceCard title={copy.finance} action={<TextLink onClick={() => onOpenSection('finance')}>{copy.viewFinance}</TextLink>}>
            {finance ? (
              <dl className="grid gap-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-slate-500">{copy.billed}</dt>
                  <dd className="font-medium">{formatMAD(finance.invoiced ?? finance.total_billed, lang)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">{copy.collected}</dt>
                  <dd className="font-medium">{formatMAD(finance.paid ?? finance.total_paid, lang)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">{copy.remaining}</dt>
                  <dd className="font-medium">{formatMAD(finance.remaining, lang)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-[13px] text-slate-500">{copy.noFinance}</p>
            )}
          </WorkspaceCard>
        ) : null}
      </div>
    </div>
  );
}
