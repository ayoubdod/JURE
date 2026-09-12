import { getUserIdFromCabinetMember } from '@/utils/cabinetMemberHelpers';
import type { Lang } from '@/i18n/types';
import { formatRelativeTime, interpolate, intlLocale } from '@/i18n';

export function isOnlineUserId(
  id: number | null | undefined,
  onlineIds: readonly number[]
): boolean {
  return typeof id === 'number' && onlineIds.includes(id);
}

/** Django auth user id used by chat presence. Cabinet member records are User rows. */
export function cabinetMemberPresenceId(member: API.CabinetMember): number {
  return getUserIdFromCabinetMember(member) ?? member.id;
}

export function isCabinetMemberOnline(
  member: API.CabinetMember,
  onlineIds: readonly number[]
): boolean {
  return isOnlineUserId(cabinetMemberPresenceId(member), onlineIds);
}

export function personPresenceId(
  person: { id?: number; pk?: number } | null | undefined
): number | undefined {
  if (!person) return undefined;
  if (typeof person.id === 'number') return person.id;
  if (typeof person.pk === 'number') return person.pk;
  return undefined;
}

export function resolveLastSeenAt(
  userId: number | null | undefined,
  lastSeenById: Record<number, string> | undefined,
  fallbackIso?: string | null
): string | null {
  if (typeof userId === 'number' && lastSeenById?.[userId]) {
    return lastSeenById[userId];
  }
  if (fallbackIso?.trim()) return fallbackIso.trim();
  return null;
}

function formatClock(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Human-readable “when” fragment for last-seen labels. */
export function formatLastSeenWhen(iso: string, lang: Lang, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 45_000) {
    return formatRelativeTime(iso, lang, now);
  }

  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / 86_400_000);
  const clock = formatClock(iso, lang);

  if (dayDiff === 0 && clock) {
    return clock;
  }
  if (dayDiff === 1 && clock) {
    const yesterday = formatRelativeTime(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(),
      lang,
      now
    );
    return clock ? `${yesterday} · ${clock}` : yesterday;
  }
  if (Math.abs(diffMs) < 7 * 86_400_000) {
    return formatRelativeTime(iso, lang, now);
  }

  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPresenceLastSeen(
  iso: string | null | undefined,
  lang: Lang,
  template: string
): string | null {
  if (!iso) return null;
  const when = formatLastSeenWhen(iso, lang);
  if (!when) return null;
  return interpolate(template, { when });
}
