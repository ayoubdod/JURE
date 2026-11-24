import type { CaseWorkspaceLeaf } from './types';

/** Pure: map location hash → session leaf + follow-ups anchor. */
export function resolveConsultationHash(hash: string | null | undefined): {
  leaf: CaseWorkspaceLeaf | null;
  scrollToFollowUps: boolean;
} {
  const normalized = (hash || '').replace(/^#/, '');
  if (normalized === 'follow-ups') {
    return { leaf: 'consultation', scrollToFollowUps: true };
  }
  return { leaf: null, scrollToFollowUps: false };
}

/** Pure: whether `?convert=1` should open the convert type selector. */
export function shouldOpenConvertFromQuery(
  convertParam: string | null | undefined,
  canConvert: boolean
): boolean {
  return convertParam === '1' && canConvert;
}
