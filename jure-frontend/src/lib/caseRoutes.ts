import type { NavigateFunction } from 'react-router';
import { apiGetCase, apiGetCases } from '@/services/case/api';
import {
  getCaseType,
  normalizeCaseType,
  type BackendCaseType,
} from '@/services/case/caseType';

export type CaseRouteSegment = 'consultations' | 'litigation' | 'administrative';

export const CASE_TYPE_SEGMENT: Record<BackendCaseType, CaseRouteSegment> = {
  CONSULTATION: 'consultations',
  LITIGATION: 'litigation',
  ADMINISTRATIVE: 'administrative',
};

export const SEGMENT_CASE_TYPE: Record<CaseRouteSegment, BackendCaseType> = {
  consultations: 'CONSULTATION',
  litigation: 'LITIGATION',
  administrative: 'ADMINISTRATIVE',
};

export type CaseRouteInput = {
  id: number;
  title?: string | null;
  reference?: string | null;
  caseType?: string | null;
  case_type?: string | null;
};

export function slugifyCaseLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function caseSlug(c: CaseRouteInput): string {
  return slugifyCaseLabel(c.title) || slugifyCaseLabel(c.reference) || `case-${c.id}`;
}

export function caseTypeListPath(type: BackendCaseType): string {
  return `/dashboard/cases/${CASE_TYPE_SEGMENT[type]}`;
}

export function caseWorkspacePath(c: CaseRouteInput): string {
  const type = normalizeCaseType(c.caseType ?? c.case_type);
  const segment = type === 'UNKNOWN' ? 'litigation' : CASE_TYPE_SEGMENT[type];
  return `/dashboard/cases/${segment}/${caseSlug(c)}`;
}

export function expectedTypeFromPath(pathname: string): BackendCaseType | null {
  if (pathname.includes('/cases/consultations/')) return 'CONSULTATION';
  if (pathname.includes('/cases/litigation/')) return 'LITIGATION';
  if (pathname.includes('/cases/administrative/')) return 'ADMINISTRATIVE';
  return null;
}

export function sectionLabelKey(type: BackendCaseType): 'consultations' | 'litigation' | 'administrative' {
  if (type === 'CONSULTATION') return 'consultations';
  if (type === 'LITIGATION') return 'litigation';
  return 'administrative';
}

export function caseMatchesSlug(c: CaseRouteInput, slug: string): boolean {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return false;
  if (`case-${c.id}` === wanted) return true;
  return caseSlug(c) === wanted || slugifyCaseLabel(c.reference) === wanted;
}

function searchFromSlug(slug: string): string {
  if (slug.startsWith('case-')) return slug.slice(5);
  return slug.replace(/-/g, ' ').trim();
}

async function searchCases(params: {
  slug: string;
  caseType?: BackendCaseType;
}): Promise<API.Case[]> {
  const search = searchFromSlug(params.slug);
  const res = await apiGetCases({
    caseType: params.caseType,
    search: search || params.slug,
    page: 1,
    page_size: 50,
  });
  return res.data?.results ?? [];
}

export async function fetchCaseBySlug(
  expectedType: BackendCaseType,
  slug: string
): Promise<{ caseItem: API.Case | null; mismatch: API.Case | null }> {
  const typed = (await searchCases({ slug, caseType: expectedType })).filter((c) =>
    caseMatchesSlug(c, slug)
  );
  if (typed[0]) {
    const detail = await apiGetCase(typed[0].id);
    return { caseItem: detail.data, mismatch: null };
  }

  const anyMatches = (await searchCases({ slug })).filter((c) => caseMatchesSlug(c, slug));
  const mismatch = anyMatches.find((c) => getCaseType(c) !== expectedType) ?? null;
  if (mismatch) {
    const detail = await apiGetCase(mismatch.id);
    return { caseItem: null, mismatch: detail.data };
  }

  const idMatch = slug.match(/^case-(\d+)$/);
  if (idMatch) {
    try {
      const detail = await apiGetCase(Number(idMatch[1]));
      const actual = getCaseType(detail.data);
      if (actual === expectedType) return { caseItem: detail.data, mismatch: null };
      if (actual !== 'UNKNOWN') return { caseItem: null, mismatch: detail.data };
    } catch {
      /* not found */
    }
  }

  return { caseItem: null, mismatch: null };
}

export function navigateToCase(navigate: NavigateFunction, c: CaseRouteInput) {
  const type = normalizeCaseType(c.caseType ?? c.case_type);
  if (type !== 'UNKNOWN') {
    navigate(caseWorkspacePath(c));
    return Promise.resolve();
  }
  return navigateToCaseById(navigate, c.id);
}

export async function navigateToCaseById(navigate: NavigateFunction, id: number) {
  const res = await apiGetCase(id);
  navigate(caseWorkspacePath(res.data));
}
