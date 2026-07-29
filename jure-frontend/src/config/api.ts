/**
 * Django API: every REST path is `${API_ORIGIN}/api/v1/...` (single `/api/v1` segment).
 *
 * Env (first non-empty wins):
 * - VITE_API_BASE_URL
 * - VITE_API_URL
 * - REACT_APP_API_URL
 * - NEXT_PUBLIC_API_URL
 *
 * Values may be origin only (`http://localhost:8000`) or already include `/api/v1` — both normalize to API_ORIGIN.
 */

function getApiOriginFromEnv(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    import.meta.env.REACT_APP_API_URL ??
    import.meta.env.NEXT_PUBLIC_API_URL;

  const fallback = 'http://localhost:8000';

  if (raw == null || String(raw).trim() === '') {
    return fallback;
  }

  let s = String(raw).trim().replace(/\/+$/, '');
  // Remove trailing /api/v1 (avoid double prefix when building API_BASE)
  while (/\/api\/v1$/i.test(s)) {
    s = s.replace(/\/api\/v1$/i, '');
  }

  try {
    const withProto = s.includes('://') ? s : `http://${s}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

/** Backend origin only, e.g. `http://localhost:8000` (no path). */
export const API_ORIGIN = getApiOriginFromEnv();

/** REST base: OpenAPI + DRF routes live under this prefix. */
export const API_BASE = `${API_ORIGIN}/api/v1`;

/** OpenAPI schema (smoke test): GET returns 200 when backend is up. */
export const API_SCHEMA_URL = `${API_ORIGIN}/api/schema/`;

/**
 * WebSocket origin: same host as API (not the Vite dev server).
 * Override with VITE_WS_BASE e.g. `ws://localhost:8000` or `wss://api.example.com`
 */
function getWsOriginFromEnv(): string {
  const wsBase = import.meta.env.VITE_WS_BASE as string | undefined;
  if (wsBase && String(wsBase).trim() !== '') {
    return String(wsBase).trim().replace(/\/$/, '');
  }
  try {
    const u = new URL(API_ORIGIN);
    return `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
  } catch {
    return 'ws://localhost:8000';
  }
}

export const WS_HOST = getWsOriginFromEnv();

export const getChatWsUrl = (token: string) =>
  `${WS_HOST}/ws/chat/?token=${encodeURIComponent(token)}`;

export const getCallsWsUrl = (token: string) =>
  `${WS_HOST}/ws/calls/?token=${encodeURIComponent(token)}`;

/** User notifications channel (JSON messages: notification.new, etc.). */
export const getNotificationsWsUrl = (token: string) =>
  `${WS_HOST}/ws/notifications/?token=${encodeURIComponent(token)}`;

export const getConversationWsUrl = (conversationId: number, token?: string | null) => {
  const base = `${WS_HOST}/ws/conversation/${conversationId}/`;
  if (token) return `${base}?token=${encodeURIComponent(token)}`;
  return base;
};
