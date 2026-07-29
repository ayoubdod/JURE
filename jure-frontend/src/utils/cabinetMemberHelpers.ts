import { getCaseData } from '@/utils/caseCardHelpers';
import { CaseStatus } from '@/utils/constants';

/**
 * Normalizes numeric case counts from cabinet member payloads (snake_case / camelCase).
 */
function pickDefinedCount(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.max(0, Math.floor(v));
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return Math.max(0, n);
    }
  }
  return undefined;
}

function normalizeCaseStatus(s: unknown): string {
  return String(s ?? '')
    .toUpperCase()
    .replace(/\s+/g, '_');
}

/** True when the case is assigned to this auth user id (primary assignee or litigation lead). */
export function caseIsAssignedToUserId(c: API.Case, userId: number): boolean {
  const assignedToId =
    (c.assigned_to as API.User | null)?.id ?? (c.assigned_to as { id?: number } | null)?.id;
  if (assignedToId === userId) return true;
  const caseType = c.caseType ?? c.case_type;
  if (caseType === 'LITIGATION' || caseType === 'ADMINISTRATIVE_DUTY' || caseType === 'ADMINISTRATIVE') {
    const leadAttorney = getCaseData(c, 'lead_attorney') as number | null | undefined;
    if (leadAttorney === userId) return true;
  }
  return false;
}

/** Linked User id for a cabinet member (expand=user on list). */
export function getUserIdFromCabinetMember(m: API.CabinetMember): number | null {
  const r = m as Record<string, unknown>;
  const u = r.user;
  if (typeof u === 'number' && Number.isFinite(u)) return u;
  if (u && typeof u === 'object' && u !== null && 'id' in u) {
    const id = (u as { id: unknown }).id;
    if (typeof id === 'number' && Number.isFinite(id)) return id;
  }
  return null;
}

/**
 * Id for `/cabinets/members/{id}/` URLs — backend contract: User primary key.
 * Falls back to `member.id` when `user` is not expanded (serializers often use the same value).
 */
export function getCabinetMemberRouteId(m: API.CabinetMember): number {
  return getUserIdFromCabinetMember(m) ?? m.id;
}

function countInProgressFromStatus(statusRaw: unknown): boolean {
  const s = normalizeCaseStatus(statusRaw);
  return s === CaseStatus.IN_PROGRESS;
}

/**
 * In-progress vs total assigned from list/detail API fields or embedded assigned_cases.
 */
export function getMemberCaseCounts(m: API.CabinetMember): {
  inProgress: number;
  assignedTotal: number;
} {
  const r = m as Record<string, unknown>;
  const assignedArr = r.assigned_cases;
  if (Array.isArray(assignedArr) && assignedArr.length > 0) {
    let inProgress = 0;
    for (const item of assignedArr) {
      const c = item as API.Case;
      if (countInProgressFromStatus(c.status)) inProgress += 1;
    }
    return { inProgress, assignedTotal: assignedArr.length };
  }

  const inProgress =
    pickDefinedCount(r.assigned_in_progress_cases_count, r.assignedInProgressCasesCount) ?? 0;
  const assignedTotal =
    pickDefinedCount(
      r.assigned_cases_count,
      r.assignedCasesCount,
      r.assigned_open_cases_count,
      r.assignedOpenCasesCount
    ) ?? 0;
  return { inProgress, assignedTotal };
}

/**
 * Computes workload from the full cases list (same source as the Cases page).
 * Use when GET /cabinets/members/ omits or zeros count fields.
 */
export function getMemberWorkloadFromCases(
  m: API.CabinetMember,
  cases: API.Case[]
): { inProgress: number; assignedTotal: number } {
  const uid = getUserIdFromCabinetMember(m);
  if (uid != null) {
    let assignedTotal = 0;
    let inProgress = 0;
    for (const c of cases) {
      if (!caseIsAssignedToUserId(c, uid)) continue;
      assignedTotal += 1;
      if (countInProgressFromStatus(c.status)) inProgress += 1;
    }
    return { inProgress, assignedTotal };
  }

  const email = (m.email || '').trim().toLowerCase();
  if (email) {
    let assignedTotal = 0;
    let inProgress = 0;
    for (const c of cases) {
      const assignee = c.assigned_to as API.User | null | undefined;
      const aem = (assignee?.email || '').trim().toLowerCase();
      if (aem !== email) continue;
      assignedTotal += 1;
      if (countInProgressFromStatus(c.status)) inProgress += 1;
    }
    return { inProgress, assignedTotal };
  }

  return getMemberCaseCounts(m);
}

/** Prefer live aggregation when cases were loaded; otherwise serializer counts. */
export function getMemberWorkloadDisplay(
  m: API.CabinetMember,
  allCases: API.Case[] | null
): { inProgress: number; assignedTotal: number } {
  if (allCases) return getMemberWorkloadFromCases(m, allCases);
  return getMemberCaseCounts(m);
}
