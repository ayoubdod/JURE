'use client';

import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { formatDuration } from '@/services/case/caseType';
import { getCaseData } from '@/utils/caseCardHelpers';
import { formatMAD } from '@/utils/formatMAD';
import { TaskStatus } from '@/utils/constants';
import { cn } from '@/lib/utils';
import {
  OverviewCard,
  OverviewEmpty,
  OverviewTextLink,
} from '@/components/case/workspace/shell/OverviewCards';
import { openTasksTop } from '@/components/case/workspace/shell/overviewLogic';
import type { CaseWorkspaceLeaf } from '@/components/case/workspace/shell/types';
import {
  attorneysOf,
  consultationWhen,
  convertedCaseDisplayLabel,
  formatRelativeSession,
  personName,
  selectConsultationNeedsAttention,
} from './helpers';

export default function ConsultationOverview({
  caseItem,
  showFinance,
  finance,
  canEdit,
  onOpenSection,
  onOpenClient,
  onOpenCase,
  onAddTask,
  onAddFollowUp,
  onEditSession,
}: {
  caseItem: API.Case;
  showFinance: boolean;
  finance: API.FinanceCaseSummary | null;
  canEdit: boolean;
  onOpenSection: (id: CaseWorkspaceLeaf) => void;
  onOpenClient: () => void;
  onOpenCase: (id: number) => void;
  onAddTask: () => void;
  onAddFollowUp?: () => void;
  onEditSession?: () => void;
}) {
  const { t, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.consultation.detail;
  const shell = t.cases.workspaces.shell;
  const lit = t.cases.workspaces.litigation.detail;
  const cw = t.cases.modal.consultationWorkflow;
  const actions = t.cases.workspaces.consultation.actions;

  const dt = getCaseData(caseItem, 'consultation_date') as string | undefined;
  const when = consultationWhen(dt, lang);
  const relative = formatRelativeSession(dt, lang);
  const attention = selectConsultationNeedsAttention(caseItem, { datePassed: copy.datePassed });
  const format = getCaseData(caseItem, 'format') as string | undefined;
  const duration =
    (getCaseData(caseItem, 'duration_minutes') as number | undefined) ??
    (getCaseData(caseItem, 'duration') as string | undefined);
  const legalQuestion = String(getCaseData(caseItem, 'legal_question') || '');
  const lead = attorneysOf(caseItem)[0];
  const converted = getConvertedToCase(caseItem);
  const convertedLabel = converted ? convertedCaseDisplayLabel(converted) : '';
  const nextFollowUp = (caseItem.followUps ?? [])[0];
  const tasks = openTasksTop(caseItem, 3);
  const activity = (caseItem.activity ?? []).slice(0, 3);
  const addFu = canEdit && onAddFollowUp ? onAddFollowUp : undefined;

  return (
    <div className="space-y-3">
      <OverviewCard
        title={shell.groups.session}
        action={<OverviewTextLink onClick={() => onOpenSection('consultation')}>{copy.openSession}</OverviewTextLink>}
      >
        {when.date ? (
          <div className="space-y-3 text-start">
            <div>
              <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                {when.date}
                {when.time ? ` · ${when.time}` : ''}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-600">
                <span>
                  {[format ? enumPretty(format) : null, formatDuration(duration) || null, relative || null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {attention[0] ? (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50">
                    {attention[0].title}
                  </span>
                ) : null}
              </p>
            </div>
            <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
              {caseItem.client ? (
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.clientLabel}</dt>
                  <dd className="mt-0.5">
                    <button type="button" onClick={onOpenClient} className="min-h-11 font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40">
                      <CaseClientLabel client={caseItem.client} fallback="—" />
                    </button>
                  </dd>
                </div>
              ) : null}
              {lead ? (
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.primaryAttorney}</dt>
                  <dd className="mt-0.5 font-medium text-slate-800 dark:text-zinc-100">{personName(lead)}</dd>
                </div>
              ) : null}
              {legalQuestion ? (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.legalQuestion}</dt>
                  <dd className="mt-0.5">
                    <button type="button" onClick={() => onOpenSection('consultation')} className="line-clamp-2 min-h-11 w-full text-start text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40">
                      {legalQuestion}
                    </button>
                  </dd>
                </div>
              ) : null}
            </dl>
            {converted && convertedLabel ? (
              <div className="border-t border-slate-100 pt-2 dark:border-zinc-800">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.convertedToCase}</p>
                <button type="button" onClick={() => onOpenCase(converted.id)} className="mt-0.5 min-h-11 text-start text-[13px] font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40">
                  {convertedLabel}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <OverviewEmpty message={shell.overview.noCritical} actionLabel={canEdit && onEditSession ? copy.edit : undefined} onAction={canEdit ? onEditSession : undefined} />
        )}
      </OverviewCard>

      <div className="grid gap-3 lg:grid-cols-3">
        <OverviewCard title={copy.followUps} action={<OverviewTextLink onClick={() => onOpenSection('consultation')}>{copy.viewAll}</OverviewTextLink>}>
          {nextFollowUp ? (
            <button type="button" onClick={() => onOpenSection('consultation')} className="min-h-11 w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40">
              <p className="text-[13px] font-medium">
                {nextFollowUp.consultationDate
                  ? `${formatDate(nextFollowUp.consultationDate, lang, { day: 'numeric', month: 'short' })} · ${formatTime(nextFollowUp.consultationDate, lang, { hour: '2-digit', minute: '2-digit' })}`
                  : nextFollowUp.reference || '—'}
              </p>
            </button>
          ) : (
            <OverviewEmpty message={cw.noFollowUp} actionLabel={addFu ? actions.addFollowUp : undefined} onAction={addFu} />
          )}
        </OverviewCard>

        <OverviewCard title={lit.todoTasks} action={<OverviewTextLink onClick={() => onOpenSection('tasks')}>{copy.viewAll}</OverviewTextLink>}>
          {tasks.length ? (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="text-[13px]">
                  <p className={cn('font-medium', task.status === TaskStatus.DONE && 'line-through text-slate-400')}>{task.title}</p>
                </li>
              ))}
            </ul>
          ) : (
            <OverviewEmpty message={copy.noTasks} actionLabel={copy.addTask} onAction={onAddTask} />
          )}
        </OverviewCard>

        <OverviewCard title={lit.recentActivity} action={<OverviewTextLink onClick={() => onOpenSection('activity')}>{copy.viewAll}</OverviewTextLink>}>
          {activity.length ? (
            <ol className="space-y-2">
              {activity.map((item) => (
                <li key={item.id} className="text-[13px]">
                  <p className="font-medium">{item.message}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.created ? formatDate(item.created, lang, { day: 'numeric', month: 'short' }) : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <OverviewEmpty message={copy.noActivity} />
          )}
        </OverviewCard>
      </div>

      {showFinance && finance ? (
        <OverviewCard title={lit.finance} action={<OverviewTextLink onClick={() => onOpenSection('finance')}>{lit.viewFinance}</OverviewTextLink>}>
          <p className="text-[15px] font-semibold">{formatMAD(finance.remaining, lang)}</p>
          <p className="text-[12px] text-slate-500">{lit.remaining}</p>
        </OverviewCard>
      ) : null}
    </div>
  );
}
