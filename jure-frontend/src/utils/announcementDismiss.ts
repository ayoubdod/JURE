/**
 * Session-scoped dismissed announcement IDs.
 *
 * Cleared on logout / new connection so active announcements reappear.
 * Does NOT permanently hide announcements for the user or cabinet.
 */
const STORAGE_KEY = 'jure_dismissed_announcements';

function readIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function writeIds(ids: number[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

export function getDismissedAnnouncementIds(): number[] {
  return readIds();
}

export function isAnnouncementDismissed(id: number | undefined | null): boolean {
  if (id == null) return false;
  return readIds().includes(id);
}

export function dismissAnnouncementLocally(id: number) {
  const next = readIds();
  if (!next.includes(id)) {
    next.push(id);
    writeIds(next);
  }
}

/** Call on logout so the next login shows active announcements again. */
export function clearDismissedAnnouncements() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
