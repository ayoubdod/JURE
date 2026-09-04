import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { getCaseData, getCountdownDays, getStatusColor } from '@/utils/caseCardHelpers';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { formatMAD } from '@/utils/formatMAD';
import { TaskStatus } from '@/utils/constants';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import { deadlineEventLabel, deadlineRuleTitle } from '@/lib/legalDeadlineLabels';
import type { ResearchNote } from '@/services/research-notes/api';
import { EmptyAction, PersonAvatar, TextLink, WorkspaceCard } from './ui';
import {
  collaboratorsOf,
  courtLabels,
  formatShortDate,
  incompleteTasks,
  keyDeadlinesOf,
  leadAttorney,
  overdueTasks,
  personName,
  relativeDayLabel,
  requiredDocumentsOf,
  splitDateParts,
  thirdPartyLabels,
  type LitigationDetailSection,
} from './helpers';

type Copy = ReturnType<typeof useAppTranslation>['t']['cases']['workspaces']['litigation']['detail'];

export default function LitigationOverview({
  caseItem,
  canEdit,
  showFinance,
  juriaEnabled,
  legalDeadlines,
  researchNotes,
  finance,
  onOpenSection,
  onOpenClient,
  onOpenCase,
  onAddTask,
  onAddHearing,
  onAddDeadline,
  onAddAppointment,
  onUpload,
  onEdit,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  showFinance: boolean;
  juriaEnabled: boolean;
  legalDeadlines: CalculatedDeadline[] | null;
  researchNotes: ResearchNote[] | null;
  finance: API.FinanceCaseSummary | null;
  onOpenSection: (id: LitigationDetailSection) => void;
  onOpenClient: () => void;
  onOpenCase: (id: number) => void;
  onAddTask: () => void;
  onAddHearing: () => void;
  onAddDeadline: () => void;
  onAddAppointment: () => void;
  onUpload: () => void;
  onEdit: () => void;
}) {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const modal = t.cases.modal;
  const court = courtLabels(caseItem, t);
  const origin = getConvertedFromCase(caseItem);
  const clientRole = getCaseData(caseItem, 'client_role') as string | undefined;
  const opposing = String(getCaseData(caseItem, 'opposing_party_name') ?? getCaseData(caseItem, 'opposing_party') ?? '');
  const opposingCounsel = String(getCaseData(caseItem, 'opposing_counsel') ?? '');
  const thirds = thirdPartyLabels(caseItem);
  const lead = leadAttorney(caseItem);
  const collabs = collaboratorsOf(caseItem);
  const nextHearing = (getCaseData(caseItem, 'next_hearing_date') as string) || '';
  const litigationType = getCaseData(caseItem, 'litigation_type') as string | undefined;
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const hearingParts = splitDateParts(nextHearing, lang);
  const hearingDays = getCountdownDays(nextHearing);
  const tasksOpen = incompleteTasks(caseItem).slice(0, 5);
  const overdue = overdueTasks(caseItem);
  const required = requiredDocumentsOf(caseItem);
  const missingDocs = required.filter((d) => !d.completed);
  const attachments = caseItem.attachments ?? [];
  const activity = (caseItem.activity ?? []).slice(0, 6);

  const manualUpcoming = keyDeadlinesOf(caseItem)
    .map((d) => ({ label: d.label, date: d.date, source: 'manual' as const }))
    .filter((d) => {
      const days = getCountdownDays(d.date);
      return days == null || days >= 0;
    });
  const legalUpcoming = (legalDeadlines ?? [])
    .filter((d) => d.status !== 'completed' && d.status !== 'cancelled')
    .map((d) => ({
      label: deadlineRuleTitle(
        lang,
        d.rule,
        deadlineEventLabel(lang, d.triggering_event_type, d.triggering_event_type) || copy.calculated
      ),
      date: d.final_deadline || d.calculated_deadline,
      source: 'calculated' as const,
    }));
  const upcomingDeadlines = [...manualUpcoming, ...legalUpcoming]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
  const nextDeadline = upcomingDeadlines[0];

  const urgency = (iso: string) => {
    const days = getCountdownDays(iso);
    if (days == null) return 'text-slate-500';
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-red-600';
    if (days <= 14) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const rel = (iso?: string) =>
    iso ? relativeDayLabel(iso, lang, copy, tf) : '';

  const quick = useMemo(() => {
    const items = [
      { key: 'task', label: copy.addTask, onClick: onAddTask, show: true },
      { key: 'hearing', label: copy.addHearing, onClick: onAddHearing, show: canEdit },
      { key: 'deadline', label: copy.addDeadline, onClick: onAddDeadline, show: canEdit },
      { key: 'doc', label: copy.addDocument, onClick: onUpload, show: canEdit },
      { key: 'note', label: copy.addNote, onClick: onEdit, show: canEdit },
      { key: 'appt', label: copy.addAppointment, onClick: onAddAppointment, show: true },
    ];
    return items.filter((i) => i.show);
  }, [canEdit, copy, onAddAppointment, onAddDeadline, onAddHearing, onAddTask, onEdit, onUpload]);

  const shownCollabs = collabs.slice(0, 3);
  const extraCollabs = collabs.length - shownCollabs.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <Button key={q.key} type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={q.onClick}>
            {q.label}
          </Button>
        ))}
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
              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset', getStatusColor(String(caseItem.status ?? '')))}>
                {enumPretty(String(caseItem.status ?? '')) || caseItem.status}
              </span>
            </dd>
          </div>
          {priority ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{modal.fields.priority}</dt>
              <dd className="mt-1 text-[13px] font-medium">{enumPretty(priority)}</dd>
            </div>
          ) : null}
          {litigationType ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{modal.fields.litigationType}</dt>
              <dd className="mt-1 text-[13px] font-medium">{enumPretty(litigationType)}</dd>
            </div>
          ) : null}
          {court.composed ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.snapshotCourt}</dt>
              <dd className="mt-1 text-[13px] font-medium">{court.composed}</dd>
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
        <button type="button" onClick={() => onOpenSection('hearings')} className="rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.nextHearing}</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">
            {nextHearing ? formatShortDate(nextHearing, lang) : copy.noneScheduled}
          </p>
          {nextHearing ? <p className={cn('mt-0.5 text-[12px]', urgency(nextHearing))}>{rel(nextHearing)}</p> : null}
        </button>
        <button type="button" onClick={() => onOpenSection('deadlines')} className="rounded-xl border border-slate-200 bg-white p-3 text-start dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.nextDeadline}</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">
            {nextDeadline ? formatShortDate(nextDeadline.date, lang) : copy.noneScheduled}
          </p>
          {nextDeadline ? (
            <p className={cn('mt-0.5 truncate text-[12px]', urgency(nextDeadline.date))}>
              {nextDeadline.label || rel(nextDeadline.date)}
            </p>
          ) : null}
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
          title={copy.nextHearing}
          action={<TextLink onClick={() => onOpenSection('hearings')}>{copy.viewAll}</TextLink>}
        >
          {hearingParts ? (
            <div className="flex gap-4">
              <div
                className={cn(
                  'flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-xl ring-1',
                  hearingDays === 0
                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                    : hearingDays != null && hearingDays < 0
                      ? 'bg-red-50 text-red-700 ring-red-200'
                      : 'bg-[#F7F4FF] text-[#64499D] ring-[#64499D]/15'
                )}
              >
                <span className="text-lg font-semibold leading-none">{hearingParts.day}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase">{hearingParts.month}</span>
                <span className="text-[10px]">{hearingParts.year}</span>
              </div>
              <div className="min-w-0">
                {hearingDays === 0 ? <p className="text-[12px] font-semibold text-amber-700">{copy.hearingToday}</p> : null}
                {hearingDays != null && hearingDays < 0 ? (
                  <p className="text-[12px] font-semibold text-red-600">{copy.hearingPassed}</p>
                ) : null}
                {court.composed ? <p className="text-[13px] font-medium">{court.composed}</p> : null}
                {court.chamber ? <p className="text-[12px] text-slate-500">{court.chamber}</p> : null}
                <TextLink onClick={() => onOpenSection('hearings')}>{copy.viewHearing}</TextLink>
              </div>
            </div>
          ) : (
            <EmptyAction message={copy.noHearing} actionLabel={canEdit ? copy.addHearing : undefined} onAction={canEdit ? onAddHearing : undefined} />
          )}
        </WorkspaceCard>

        <WorkspaceCard
          title={copy.upcomingDeadlines}
          action={<TextLink onClick={() => onOpenSection('deadlines')}>{copy.viewAll}</TextLink>}
        >
          {upcomingDeadlines.length ? (
            <ul className="space-y-2">
              {upcomingDeadlines.map((d, i) => (
                <li key={`${d.date}-${i}`} className="flex items-start gap-2 text-[13px]">
                  <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', urgency(d.date).includes('red') ? 'bg-red-500' : urgency(d.date).includes('amber') ? 'bg-amber-500' : 'bg-emerald-500')} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-zinc-100">{d.label || copy.caseDeadlines}</p>
                    <p className={cn('text-[12px]', urgency(d.date))}>
                      {formatShortDate(d.date, lang)} · {rel(d.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyAction message={copy.noDeadlines} actionLabel={canEdit ? copy.addDeadline : undefined} onAction={canEdit ? onAddDeadline : undefined} />
          )}
        </WorkspaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard
          title={copy.todoTasks}
          action={<TextLink onClick={() => onOpenSection('tasks')}>{copy.viewAll}</TextLink>}
        >
          {tasksOpen.length ? (
            <ul className="space-y-2">
              {tasksOpen.map((task) => {
                const assignee =
                  personName(task.assigned_to_details) ||
                  personName(task.assignees?.[0]) ||
                  '';
                return (
                  <li key={task.id} className="text-[13px]">
                    <p className="font-medium text-slate-800 dark:text-zinc-100">
                      {task.status === TaskStatus.DONE ? '☑' : '☐'} {task.title}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {[assignee, task.due_date ? `${copy.due} : ${formatDate(task.due_date, lang, { day: 'numeric', month: 'short' })}` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyAction message={copy.noTasks} actionLabel={copy.addTask} onAction={onAddTask} />
          )}
        </WorkspaceCard>

        <WorkspaceCard
          title={copy.parties}
          action={<TextLink onClick={() => onOpenSection('parties')}>{copy.viewAll}</TextLink>}
        >
          <dl className="space-y-3 text-[13px]">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.snapshotClient}</dt>
              <dd className="mt-0.5 font-medium">
                <CaseClientLabel client={caseItem.client} fallback="—" />
                {clientRole ? (
                  <span className="ms-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase dark:bg-zinc-800">
                    {enumPretty(clientRole)}
                  </span>
                ) : null}
              </dd>
            </div>
            {opposing ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.opposingParty}</dt>
                <dd className="mt-0.5 font-medium">{opposing}</dd>
              </div>
            ) : null}
            {opposingCounsel ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.opposingCounsel}</dt>
                <dd className="mt-0.5 font-medium">{opposingCounsel}</dd>
              </div>
            ) : null}
            {thirds.length ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.thirdParties}</dt>
                <dd className="mt-0.5 font-medium">{thirds.length}</dd>
              </div>
            ) : null}
          </dl>
        </WorkspaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard
          title={copy.team}
          action={<TextLink onClick={() => onOpenSection('caseDetails')}>{copy.viewAll}</TextLink>}
        >
          {lead || collabs.length ? (
            <div className="space-y-3">
              {lead ? (
                <div className="flex items-center gap-2">
                  <PersonAvatar name={personName(lead)} src={lead.image} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.leadAttorney}</p>
                    <p className="text-[13px] font-medium">{personName(lead)}</p>
                  </div>
                </div>
              ) : null}
              {collabs.length ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.collaborators}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {shownCollabs.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 text-[13px]">
                        <PersonAvatar name={personName(u)} src={u.image} />
                        {personName(u)}
                      </span>
                    ))}
                    {extraCollabs > 0 ? (
                      <span className="text-[12px] text-slate-500">{tf(copy.plusMore, { count: extraCollabs })}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">{copy.noneAssigned}</p>
          )}
        </WorkspaceCard>

        <WorkspaceCard
          title={copy.jurisdictionCard}
          action={<TextLink onClick={() => onOpenSection('caseDetails')}>{copy.viewAll}</TextLink>}
        >
          <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
            {court.composed ? (
              <div className="sm:col-span-2 font-medium">{court.composed}</div>
            ) : null}
            {court.specialty ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.specialty}</dt>
                <dd>{court.specialty}</dd>
              </div>
            ) : null}
            {court.jurisdiction ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.level}</dt>
                <dd>{court.jurisdiction}</dd>
              </div>
            ) : null}
            {court.chamber ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.chamber}</dt>
                <dd>{court.chamber}</dd>
              </div>
            ) : null}
            {court.city ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.city}</dt>
                <dd>{court.city}</dd>
              </div>
            ) : null}
            {court.judge ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.judge}</dt>
                <dd>{court.judge}</dd>
              </div>
            ) : null}
            {court.courtCaseNumber ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.courtCaseNumber}</dt>
                <dd className="font-mono text-[12px]">{court.courtCaseNumber}</dd>
              </div>
            ) : null}
          </dl>
        </WorkspaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard
          title={copy.documents}
          action={<TextLink onClick={() => onOpenSection('documents')}>{copy.viewAll}</TextLink>}
        >
          <p className="text-[13px] text-slate-600">
            {attachments.length} {copy.documents.toLowerCase()}
          </p>
          {required.length ? (
            <ul className="mt-2 space-y-1 text-[13px]">
              {required.slice(0, 5).map((doc) => (
                <li key={doc.label} className="flex items-center justify-between gap-2">
                  <span>{doc.label}</span>
                  <span className={doc.completed ? 'text-emerald-600' : 'text-amber-600'}>
                    {doc.completed ? copy.complete : copy.missing}
                  </span>
                </li>
              ))}
            </ul>
          ) : attachments.length === 0 ? (
            <EmptyAction message={copy.noDocuments} actionLabel={canEdit ? copy.addDocument : undefined} onAction={canEdit ? onUpload : undefined} />
          ) : (
            <ul className="mt-2 space-y-1 text-[13px]">
              {attachments.slice(0, 4).map((att) => (
                <li key={att.id} className="truncate">{att.file_name}</li>
              ))}
            </ul>
          )}
        </WorkspaceCard>

        <WorkspaceCard
          title={copy.recentActivity}
          action={<TextLink onClick={() => onOpenSection('activity')}>{copy.viewAll}</TextLink>}
        >
          {activity.length ? (
            <ol className="space-y-2">
              {activity.map((item) => (
                <li key={item.id} className="text-[13px]">
                  <p className="font-medium text-slate-800 dark:text-zinc-100">{item.message}</p>
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
      </div>

      <div className={cn('grid gap-4', showFinance || juriaEnabled ? 'lg:grid-cols-2' : '')}>
        <WorkspaceCard
          title={copy.research}
          action={<TextLink onClick={() => onOpenSection('research')}>{copy.openResearch}</TextLink>}
        >
          {researchNotes && researchNotes.length ? (
            <ul className="space-y-1 text-[13px]">
              {researchNotes.slice(0, 3).map((n) => (
                <li key={n.id} className="truncate">• {n.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-slate-500">{copy.noResearch}</p>
          )}
          {juriaEnabled ? (
            <div className="mt-3">
              <Button type="button" variant="outline" className="h-8 rounded-lg text-[12px]" onClick={() => onOpenSection('juria')}>
                {copy.analyzeJuria}
              </Button>
            </div>
          ) : null}
        </WorkspaceCard>

        {showFinance ? (
          <WorkspaceCard
            title={copy.finance}
            action={<TextLink onClick={() => onOpenSection('finance')}>{copy.viewFinance}</TextLink>}
          >
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

export type { Copy };
