'use client';

import { formatDate, useAppTranslation } from '@/i18n';
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
} from '@/components/case/workspace/shell/overviewLogic';
import { selectAdminNextCritical } from '@/components/case/workspace/shell/adminOverviewLogic';
import { requiredDocumentsOf } from '@/components/case/workspace/litigation-detail/helpers';
import type { CaseSummary, CaseWorkspaceLeaf } from '@/components/case/workspace/shell/types';
import { relativeDayLabel } from '@/components/case/workspace/litigation-detail/helpers';
import { dueDateOf, dutyTypeOf, institutionOf } from './helpers';

export default function AdministrativeOverview({
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
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.administrative.detail;
  const shell = t.cases.workspaces.shell;
  const litCopy = t.cases.workspaces.litigation.detail;
  const due = dueDateOf(caseItem) || null;
  const next = selectAdminNextCritical(summary, due);
  const duty = dutyTypeOf(caseItem);
  const institution = institutionOf(caseItem);
  const checklist = requiredDocumentsOf(caseItem, (count) =>
    tf(shell.documentUntitled, { count })
  );
  const missingDocs = checklist.filter((d) => !d.completed).slice(0, 5);
  const needs = selectNeedsAttention(caseItem, legalDeadlines, {
    missingDocuments: copy.missingDocuments,
  }).filter((i) => i.kind !== 'document');
  const tasks = openTasksTop(caseItem, 5);
  const activity = (caseItem.activity ?? []).slice(0, 3);
  const origin = getConvertedFromCase(caseItem);
  const lead = assignedDisplayName(caseItem);

  const rel = (iso?: string | null) =>
    iso ? relativeDayLabel(iso, lang, litCopy, tf) : '';

  return (
    <div className="space-y-4">
      <OverviewCard
        title={shell.overview.nextCritical}
        action={
          <OverviewTextLink onClick={() => onOpenSection(next.kind === 'due' ? 'administrative' : 'deadlines')}>
            {copy.viewAll}
          </OverviewTextLink>
        }
      >
        {next.kind === 'due' && next.iso ? (
          <button
            type="button"
            onClick={() => onOpenSection('administrative')}
            className="w-full min-h-11 rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            <p className={cn('text-[15px] font-semibold', (next.days ?? 0) < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white')}>
              {formatDate(next.iso, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-0.5 text-[13px] text-slate-600">
              {rel(next.iso)}
              {institution ? ` · ${institution}` : ''}
              {duty ? ` · ${enumPretty(duty)}` : ''}
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

      {checklist.length ? (
        <OverviewCard
          title={copy.requiredDocuments}
          action={
            <OverviewTextLink onClick={() => onOpenSection('administrative')}>{copy.viewAll}</OverviewTextLink>
          }
        >
          <p className="mb-2 text-[12px] text-slate-500">
            {tf(copy.docsProgress, {
              done: checklist.filter((d) => d.completed).length,
              total: checklist.length,
            })}
          </p>
          {missingDocs.length ? (
            <ul className="space-y-2">
              {missingDocs.map((doc) => (
                <li key={doc.label}>
                  <button
                    type="button"
                    onClick={() => onOpenSection('documents')}
                    className="min-h-11 text-start text-[13px] font-medium text-amber-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
                  >
                    {doc.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <OverviewEmpty message={shell.overview.nothingUrgent} />
          )}
        </OverviewCard>
      ) : null}

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
                    <span className="font-medium">{item.title}</span>
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
            <OverviewEmpty message={litCopy.noActivity} />
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
          {lead ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {copy.snapshotLead}
              </dt>
              <dd className="mt-0.5 font-medium">{lead}</dd>
            </div>
          ) : null}
          {origin ? (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{copy.origin}</dt>
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
