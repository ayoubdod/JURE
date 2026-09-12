import type { Lang } from '@/i18n/types';

export type PresenceMode = 'AVAILABLE' | 'DND' | 'AWAY' | 'INVISIBLE';

export type ModeDurationId =
  | 'until_off'
  | '30m'
  | '1h'
  | '2h'
  | 'today'
  | 'custom';

export function normalizePresenceMode(value: unknown): PresenceMode {
  const v = String(value || '').toUpperCase();
  if (v === 'DND' || v === 'AWAY' || v === 'INVISIBLE' || v === 'AVAILABLE') {
    return v;
  }
  return 'AVAILABLE';
}

export function isModeExpired(modeUntil: string | null | undefined, now = new Date()): boolean {
  if (!modeUntil) return false;
  const d = new Date(modeUntil);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= now.getTime();
}

export function effectivePresenceMode(
  mode: PresenceMode | string | null | undefined,
  modeUntil?: string | null,
  now = new Date()
): PresenceMode {
  const m = normalizePresenceMode(mode);
  if (isModeExpired(modeUntil, now)) return 'AVAILABLE';
  return m;
}

export function suppressesInterruptions(
  mode: PresenceMode | string | null | undefined,
  modeUntil?: string | null
): boolean {
  return effectivePresenceMode(mode, modeUntil) === 'DND';
}

/** Mode shown to other users — DND is private and appears as Away. */
export function publicPresenceMode(
  mode: PresenceMode | string | null | undefined,
  modeUntil?: string | null
): PresenceMode {
  const m = effectivePresenceMode(mode, modeUntil);
  return m === 'DND' ? 'AWAY' : m;
}

export function isAwayLike(
  mode: PresenceMode | string | null | undefined,
  modeUntil?: string | null
): boolean {
  const m = effectivePresenceMode(mode, modeUntil);
  return m === 'AWAY' || m === 'DND';
}

export function computeModeUntil(
  durationId: ModeDurationId,
  customUntil?: Date | null,
  now = new Date()
): string | null {
  if (durationId === 'until_off') return null;
  if (durationId === 'custom') {
    if (!customUntil || Number.isNaN(customUntil.getTime())) return null;
    return customUntil.toISOString();
  }
  if (durationId === '30m') {
    return new Date(now.getTime() + 30 * 60_000).toISOString();
  }
  if (durationId === '1h') {
    return new Date(now.getTime() + 60 * 60_000).toISOString();
  }
  if (durationId === '2h') {
    return new Date(now.getTime() + 2 * 60 * 60_000).toISOString();
  }
  if (durationId === 'today') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }
  return null;
}

export function formatModeUntilLabel(
  modeUntil: string | null | undefined,
  lang: Lang,
  untilTemplate: string,
  interpolate: (tpl: string, vars: Record<string, string | number>) => string
): string | null {
  if (!modeUntil) return null;
  const d = new Date(modeUntil);
  if (Number.isNaN(d.getTime())) return null;
  const time = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return interpolate(untilTemplate, { time });
}
