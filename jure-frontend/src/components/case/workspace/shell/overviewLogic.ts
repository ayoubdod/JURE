import { getCountdownDays } from '@/utils/caseCardHelpers';
import {
  incompleteTasks,
  keyDeadlinesOf,
  overdueTasks,
  requiredDocumentsOf,
} from '@/components/case/workspace/litigation-detail/helpers';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import type { CaseSummary } from './types';

export type NextCriticalKind = 'hearing' | 'deadline' | 'empty';

export type NextCritical = {
  kind: NextCriticalKind;
  iso: string | null;
  days: number | null;
  label?: string;
};

/** Hearing wins when upcoming; else next deadline; else empty. */
export function selectNextCritical(
  summary: Pick<
    CaseSummary,
    'hasUpcomingHearing' | 'nextHearingIso' | 'nextHearingDays' | 'nextDeadlineIso' | 'nextDeadlineDays'
  >
): NextCritical {
  if (summary.hasUpcomingHearing && summary.nextHearingIso) {
    return {
      kind: 'hearing',
      iso: summary.nextHearingIso,
      days: summary.nextHearingDays,
    };
  }
  if (summary.nextDeadlineIso) {
    return {
      kind: 'deadline',
      iso: summary.nextDeadlineIso,
      days: summary.nextDeadlineDays,
    };
  }
  return { kind: 'empty', iso: null, days: null };
}

export type NeedsAttentionItem = {
  id: string;
  kind: 'task' | 'deadline' | 'document';
  title: string;
  iso?: string | null;
  days?: number | null;
  leaf: 'tasks' | 'deadlines' | 'documents';
};

/** Overdue tasks + deadlines due ≤ 3 days + missing required docs (as a single line when > 0). */
export function selectNeedsAttention(
  caseItem: API.Case,
  legalDeadlines: CalculatedDeadline[] | null | undefined,
  copy: { missingDocuments: string }
): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];

  for (const task of overdueTasks(caseItem)) {
    items.push({
      id: `task-${task.id}`,
      kind: 'task',
      title: task.title || `Task #${task.id}`,
      iso: task.due_date,
      days: getCountdownDays(task.due_date),
      leaf: 'tasks',
    });
  }

  for (const d of keyDeadlinesOf(caseItem)) {
    const days = getCountdownDays(d.date);
    if (days != null && days <= 3) {
      items.push({
        id: `manual-${d.date}-${d.label}`,
        kind: 'deadline',
        title: d.label || d.date,
        iso: d.date,
        days,
        leaf: 'deadlines',
      });
    }
  }

  for (const d of legalDeadlines ?? []) {
    if (d.status === 'cancelled' || d.status === 'completed') continue;
    const iso = d.final_deadline || d.calculated_deadline;
    const days = getCountdownDays(iso);
    if (days != null && days <= 3) {
      items.push({
        id: `legal-${d.id}`,
        kind: 'deadline',
        title: String(d.rule?.name ?? d.rule?.code ?? d.triggering_event_type ?? iso),
        iso,
        days,
        leaf: 'deadlines',
      });
    }
  }

  const missing = requiredDocumentsOf(caseItem).filter((d) => !d.completed).length;
  if (missing > 0) {
    items.push({
      id: 'missing-docs',
      kind: 'document',
      title: `${copy.missingDocuments} · ${missing}`,
      leaf: 'documents',
    });
  }

  // Deduplicate by id, keep order, cap for overview density
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 8);
}

export function openTasksTop(caseItem: API.Case, limit = 5): API.Task[] {
  return incompleteTasks(caseItem).slice(0, limit);
}
