import useUserStore from '@/stores/userStore';
import { clearSessionValidationCache } from '@/utils/sessionValidationCache';

let handlingSessionReplaced = false;

/** Detect backend single-session eviction (login elsewhere). */
export function isSessionReplacedError(error: unknown): boolean {
  const data = (error as { response?: { data?: unknown; status?: number } })?.response?.data;
  if (!data) return false;
  if (typeof data === 'string') {
    return data.includes('session_replaced');
  }
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    if (record.code === 'session_replaced') return true;
    if (record.detail === 'session_replaced') return true;
    if (typeof record.detail === 'string' && record.detail.includes('session_replaced')) {
      return true;
    }
    if (
      typeof record.detail === 'object' &&
      record.detail !== null &&
      (record.detail as { code?: string }).code === 'session_replaced'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Clear local auth and send the user to sign-in after another device/browser
 * took over the account. Safe to call multiple times.
 */
export function handleSessionReplaced(): void {
  if (typeof window === 'undefined') return;
  if (handlingSessionReplaced) return;
  if (!useUserStore.getState().isLoggedIn && !useUserStore.getState().accessToken) {
    return;
  }

  handlingSessionReplaced = true;
  clearSessionValidationCache();
  useUserStore.getState().logout();

  try {
    if (!sessionStorage.getItem('jure-session-replaced')) {
      sessionStorage.setItem('jure-session-replaced', '1');
    }
  } catch {
    // ignore storage failures
  }

  const path = window.location.pathname || '';
  if (!path.startsWith('/signin')) {
    window.location.assign('/signin');
  }

  window.setTimeout(() => {
    handlingSessionReplaced = false;
  }, 2000);
}
