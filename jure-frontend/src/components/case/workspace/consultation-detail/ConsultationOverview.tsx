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
  hoursUntil,
  personName,
} from './helpers';

export default function ConsultationOverview({
  caseItem,
  showFinance,
  finance,
  onOpenSection,
  onOpenClient,
  onOpenCase,
  onAddTask,
}: {
  caseItem: API.Case;
  showFinance: boolean;
  finance: API.FinanceCaseSummary | null;
  onOpenSection: (id: CaseWorkspaceLeaf) => void;
  onOpenClient: () => void;
  onOpenCase: (id: number) => void;
  onAddTask: () => void;
}) {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.consultation.detail;
  const shell = t.cases.workspaces.shell;
  const litCopy = t.cases.workspaces.litigation.detail;
  const cw = t.cases.modal.consultationWorkflow;

  const dt = getCaseData(caseItem, 'consultation_date') as string | undefined;
  const when = consultationWhen(dt, lang);
  const format = getCaseData(caseItem, 'format') as string | undefined;
  const duration =
    (getCaseData(caseItem, 'duration_minutes') as number | undefined) ??
    (getCaseData(caseItem, 'duration') as string | undefined);
  const videoLink = getCaseData(caseItem, 'video_link') as string | undefined;
  const legalQuestion = String(getCaseData(caseItem, 'legal_question') || '');
  const attorneys = attorneysOf(caseItem);
  const lead = attorneys[0];
  const converted = getConvertedToCase(caseItem);
  const nextFollowUp = (caseItem.followUps ?? [])[0];
  const tasks = openTasksTop(caseItem, 3);
  const activity = (caseItem.activity ?? []).slice(0, 3);
  const hours = hoursUntil(dt);
  const relative =
    hours == null ? '' : hours >= 0 ? tf(copy.inHours, { hours: Math.max(1, Math.round(hours)) }) : copy.overduePast;
  const joinText =
    format === 'VIDEO' && videoLink
      ? hours != null && hours > -4
        ? copy.joinVideo
        : null
      : null;

  return (
    <div className="space-y-4">
      <OverviewCard
        title={shell.groups.session}
        action={
          <OverviewTextLink onClick={() => onOpenSection('consultation')}>{copy.viewAll}</OverviewTextLink>
        }
      >
        {when.date ? (
          <div className="text-start">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
              {when.date}
              {when.time ? ` · ${when.time}` : ''}
            </p>
            <p className="mt-0.5 text-[13px] text-slate-600">
              {[format ? enumPretty(format) : null, formatDuration(duration) || null, relative || null, joinText]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ) : (
          <OverviewEmpty message={shell.overview.noCritical} />
        )}
      </OverviewCard>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        {caseItem.client ? (
          <button
            type="button"
            onClick={onOpenClient}
            className="min-h-11 font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            <CaseClientLabel client={caseItem.client} fallback="—" />
          </button>
        ) : null}
        {lead ? (
          <span className="text-slate-700 dark:text-zinc-200">
            {copy.assignedTo} {personName(lead)}
          </span>
        ) : null}
        {legalQuestion ? (
          <button
            type="button"
            onClick={() => onOpenSection('consultation')}
            className="line-clamp-2 min-h-11 max-w-full text-start text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            {legalQuestion}
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <OverviewCard
          title={copy.followUps}
          action={
            <OverviewTextLink onClick={() => onOpenSection('consultation')}>{copy.viewAll}</OverviewTextLink>
          }
        >
          {nextFollowUp ? (
            <button
              type="button"
              onClick={() => onOpenSection('consultation')}
              className="min-h-11 w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
            >
              <p className="text-[13px] font-medium">
                {nextFollowUp.consultationDate
                  ? `${formatDate(nextFollowUp.consultationDate, lang, { day: 'numeric', month: 'short' })} · ${formatTime(nextFollowUp.consultationDate, lang, { hour: '2-digit', minute: '2-digit' })}`
                  : nextFollowUp.reference || '—'}
              </p>
            </button>
          ) : (
            <OverviewEmpty message={cw.noFollowUp} />
          )}
        </OverviewCard>

        <OverviewCard
          title={litCopy.todoTasks}
          action={<OverviewTextLink onClick={() => onOpenSection('tasks')}>{copy.viewAll}</OverviewTextLink>}
        >
          {tasks.length ? (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="text-[13px]">
                  <p className={cn('font-medium', task.status === TaskStatus.DONE && 'line-through text-slate-400')}>
                    {task.title}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <OverviewEmpty message={copy.noTasks} actionLabel={copy.addTask} onAction={onAddTask} />
          )}
        </OverviewCard>

        <OverviewCard
          title={litCopy.recentActivity}
          action={<OverviewTextLink onClick={() => onOpenSection('activity')}>{copy.viewAll}</OverviewTextLink>}
        >
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

      <OverviewCard title={cw.openCase}>
        {converted ? (
          <button
            type="button"
            onClick={() => onOpenCase(converted.id)}
            className="min-h-11 text-start font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            {converted.reference || `#${converted.id}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenSection('consultation')}
            className="min-h-11 text-start text-[13px] text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            {copy.notConverted}
          </button>
        )}
      </OverviewCard>

      {showFinance && finance ? (
        <OverviewCard
          title={litCopy.finance}
          action={<OverviewTextLink onClick={() => onOpenSection('finance')}>{litCopy.viewFinance}</OverviewTextLink>}
        >
          <p className="text-[15px] font-semibold">{formatMAD(finance.remaining, lang)}</p>
          <p className="text-[12px] text-slate-500">{litCopy.remaining}</p>
        </OverviewCard>
      ) : null}
    </div>
  );
}
