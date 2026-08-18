export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'jure.lastActivityAt';
export const IDLE_LOGOUT_KEY = 'jure.idleLogoutAt';

export function readLastActivity(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function stampLastActivity(at = Date.now()): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    // private mode / quota
  }
}

export function clearIdleSessionMarkers(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(IDLE_LOGOUT_KEY);
  } catch {
    // ignore
  }
}
