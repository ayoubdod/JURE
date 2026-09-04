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
  const label = slugifyCaseLabel(c.title) || slugifyCaseLabel(c.reference);
  return label ? `${label}--${c.id}` : `case-${c.id}`;
}

export function caseIdFromSlug(slug: string): number | null {
  const wanted = slug.trim().toLowerCase();
  const prefixed = wanted.match(/^case-(\d+)$/);
  if (prefixed) return Number(prefixed[1]);
  const embedded = wanted.match(/--(\d+)$/);
  if (embedded) return Number(embedded[1]);
  return null;
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
  if (`case-${c.id}` === wanted || wanted.endsWith(`--${c.id}`)) return true;
  const label = slugifyCaseLabel(c.title) || slugifyCaseLabel(c.reference);
  return caseSlug(c) === wanted || (!!label && label === wanted) || slugifyCaseLabel(c.reference) === wanted;
}

function searchTermsFromSlug(slug: string): string[] {
  const withoutId = slug.replace(/--\d+$/, '').replace(/^case-\d+$/, '');
  const terms = [
    slug.startsWith('case-') ? slug.slice(5) : '',
    withoutId,
    withoutId.replace(/-/g, ' ').trim(),
    slug.replace(/-/g, ' ').trim(),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(terms)];
}

async function searchCases(params: {
  slug: string;
  caseType?: BackendCaseType;
}): Promise<API.Case[]> {
  const seen = new Set<number>();
  const acc: API.Case[] = [];
  for (const search of searchTermsFromSlug(params.slug)) {
    const res = await apiGetCases({
      caseType: params.caseType,
      search,
      page: 1,
      page_size: 50,
      includeFollowUps: true,
    });
    for (const row of res.data?.results ?? []) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        acc.push(row);
      }
    }
  }
  return acc;
}

async function resolveById(
  id: number,
  expectedType: BackendCaseType
): Promise<{ caseItem: API.Case | null; mismatch: API.Case | null }> {
  const detail = await apiGetCase(id);
  const actual = getCaseType(detail.data);
  if (actual === expectedType || actual === 'UNKNOWN') {
    return { caseItem: detail.data, mismatch: null };
  }
  return { caseItem: null, mismatch: detail.data };
}

export async function fetchCaseBySlug(
  expectedType: BackendCaseType,
  slug: string
): Promise<{ caseItem: API.Case | null; mismatch: API.Case | null }> {
  const id = caseIdFromSlug(slug);
  if (id != null) {
    try {
      return await resolveById(id, expectedType);
    } catch {
      /* fall through to search for stale/old URLs */
    }
  }

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

  return { caseItem: null, mismatch: null };
}

export function navigateToCase(navigate: NavigateFunction, c: CaseRouteInput & { parentConsultation?: { id?: number } }) {
  if (c.parentConsultation?.id) {
    return navigateToCaseById(navigate, c.parentConsultation.id);
  }
  return navigateToCaseById(navigate, c.id);
}

export async function navigateToCaseById(navigate: NavigateFunction, id: number) {
  const res = await apiGetCase(id);
  const originId = res.data.parentConsultation?.id;
  if (originId) {
    const parent = await apiGetCase(originId);
    navigate(caseWorkspacePath(parent.data));
    return;
  }
  navigate(caseWorkspacePath(res.data));
}
