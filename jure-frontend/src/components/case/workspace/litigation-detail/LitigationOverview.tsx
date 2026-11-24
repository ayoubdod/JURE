'use client';

import { formatDate, useAppTranslation } from '@/i18n';
import { getCaseData } from '@/utils/caseCardHelpers';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { formatMAD } from '@/utils/formatMAD';
import { TaskStatus } from '@/utils/constants';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import { assignedDisplayName } from '@/services/case/caseType';
import { cn } from '@/lib/utils';
import {
  OverviewCard,
  OverviewEmpty,
  OverviewTextLink,
} from '@/components/case/workspace/shell/OverviewCards';
import {
  openTasksTop,
  selectNeedsAttention,
  selectNextCritical,
} from '@/components/case/workspace/shell/overviewLogic';
import type { CaseSummary, CaseWorkspaceLeaf } from '@/components/case/workspace/shell/types';
import { courtLabels, relativeDayLabel } from './helpers';

export default function LitigationOverview({
  caseItem,
  canEdit,
  showFinance,
  summary,
  legalDeadlines,
  finance,
  primaryActionLabel,
  onPrimaryAction,
  onOpenSection,
  onOpenClient,
  onOpenCase,
  onAddTask,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  showFinance: boolean;
  summary: CaseSummary;
  legalDeadlines: CalculatedDeadline[] | null;
  finance: API.FinanceCaseSummary | null;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onOpenSection: (id: CaseWorkspaceLeaf) => void;
  onOpenClient: () => void;
  onOpenCase: (id: number) => void;
  onAddTask: () => void;
}) {
  const { t, tf, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const shell = t.cases.workspaces.shell;
  const court = courtLabels(caseItem, t);
  const origin = getConvertedFromCase(caseItem);
  const opposing = String(
    getCaseData(caseItem, 'opposing_party_name') ?? getCaseData(caseItem, 'opposing_party') ?? ''
  );
  const next = selectNextCritical(summary);
  const needs = selectNeedsAttention(caseItem, legalDeadlines, {
    missingDocuments: copy.missingDocuments,
  });
  const tasks = openTasksTop(caseItem, 5);
  const activity = (caseItem.activity ?? []).slice(0, 3);
  const lead = assignedDisplayName(caseItem);

  const rel = (iso?: string | null) =>
    iso ? relativeDayLabel(iso, lang, copy, tf) : '';

  return (
    <div className="space-y-4">
      <OverviewCard
        title={shell.overview.nextCritical}
        action={<OverviewTextLink onClick={() => onOpenSection('hearings')}>{copy.viewAll}</OverviewTextLink>}
      >
        {next.kind === 'hearing' && next.iso ? (
          <button
            type="button"
            onClick={() => onOpenSection('hearings')}
            className="w-full text-start"
          >
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
              {formatDate(next.iso, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className={cn('mt-0.5 text-[13px]', (next.days ?? 99) <= 3 ? 'text-red-600' : 'text-slate-600')}>
              {rel(next.iso)}
              {court.composed ? ` · ${court.composed}` : ''}
            </p>
          </button>
        ) : next.kind === 'deadline' && next.iso ? (
          <button
            type="button"
            onClick={() => onOpenSection('deadlines')}
            className="w-full text-start"
          >
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
              {formatDate(next.iso, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className={cn('mt-0.5 text-[13px]', (next.days ?? 99) <= 3 ? 'text-red-600' : 'text-slate-600')}>
              {copy.nextDeadline} · {rel(next.iso)}
            </p>
          </button>
        ) : (
          <OverviewEmpty
            message={shell.overview.noCritical}
            actionLabel={canEdit ? primaryActionLabel : undefined}
            onAction={canEdit ? onPrimaryAction : undefined}
          />
        )}
      </OverviewCard>

      <div className="grid gap-3 lg:grid-cols-3">
        <OverviewCard title={shell.overview.needsAttention}>
          {needs.length ? (
            <ul className="space-y-2">
              {needs.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenSection(item.leaf)}
                    className="flex w-full items-start justify-between gap-2 text-start text-[13px] hover:underline"
                  >
                    <span className="font-medium text-slate-800 dark:text-zinc-100">{item.title}</span>
                    {item.days != null ? (
                      <span className={cn('shrink-0 text-[11px]', item.days <= 0 ? 'text-red-600' : 'text-amber-600')}>
                        {rel(item.iso)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <OverviewEmpty message={shell.overview.nothingUrgent} />
          )}
        </OverviewCard>

        <OverviewCard
          title={copy.todoTasks}
          action={<OverviewTextLink onClick={() => onOpenSection('tasks')}>{copy.viewAll}</OverviewTextLink>}
        >
          {tasks.length ? (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="text-[13px]">
                  <p className={cn('font-medium', task.status === TaskStatus.DONE && 'line-through text-slate-400')}>
                    {task.title}
                  </p>
                  {task.due_date ? (
                    <p className="text-[11px] text-slate-500">
                      {copy.due}{' '}
                      {formatDate(task.due_date, lang, { day: 'numeric', month: 'short' })}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <OverviewEmpty
              message={copy.noTasks}
              actionLabel={copy.addTask}
              onAction={onAddTask}
            />
          )}
        </OverviewCard>

        <OverviewCard
          title={copy.recentActivity}
          action={<OverviewTextLink onClick={() => onOpenSection('activity')}>{copy.viewAll}</OverviewTextLink>}
        >
          {activity.length ? (
            <ol className="space-y-2">
              {activity.map((item) => (
                <li key={item.id} className="text-[13px]">
                  <p className="font-medium text-slate-800 dark:text-zinc-100">{item.message}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.created
                      ? formatDate(item.created, lang, { day: 'numeric', month: 'short' })
                      : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <OverviewEmpty message={copy.noActivity} />
          )}
        </OverviewCard>
      </div>

      <OverviewCard title={shell.overview.keyFacts}>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {copy.snapshotClient}
            </dt>
            <dd className="mt-0.5">
              {caseItem.client ? (
                <button type="button" onClick={onOpenClient} className="font-medium text-[#64499D] hover:underline">
                  <CaseClientLabel client={caseItem.client} fallback="—" />
                </button>
              ) : (
                '—'
              )}
            </dd>
          </div>
          {opposing ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {copy.opposingParty}
              </dt>
              <dd className="mt-0.5 font-medium">
                <button type="button" onClick={() => onOpenSection('parties')} className="hover:underline">
                  {opposing}
                </button>
              </dd>
            </div>
          ) : null}
          {court.composed ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {copy.snapshotCourt}
              </dt>
              <dd className="mt-0.5 font-medium">
                <button type="button" onClick={() => onOpenSection('caseDetails')} className="hover:underline">
                  {court.composed}
                </button>
              </dd>
            </div>
          ) : null}
          {lead ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {copy.snapshotLead}
              </dt>
              <dd className="mt-0.5 font-medium">
                <button type="button" onClick={() => onOpenSection('caseDetails')} className="hover:underline">
                  {lead}
                </button>
              </dd>
            </div>
          ) : null}
          {origin ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {copy.origin}
              </dt>
              <dd className="mt-0.5">
                <button
                  type="button"
                  onClick={() => onOpenCase(origin.id)}
                  className="font-medium text-[#64499D] hover:underline"
                >
                  {copy.convertedFrom}
                  {origin.reference ? ` · ${origin.reference}` : ''}
                </button>
              </dd>
            </div>
          ) : null}
        </dl>
      </OverviewCard>

      {showFinance && finance ? (
        <OverviewCard
          title={copy.finance}
          action={<OverviewTextLink onClick={() => onOpenSection('finance')}>{copy.viewFinance}</OverviewTextLink>}
        >
          <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
            {formatMAD(finance.remaining, lang)}
          </p>
          <p className="text-[12px] text-slate-500">{copy.remaining}</p>
        </OverviewCard>
      ) : null}
    </div>
  );
}
