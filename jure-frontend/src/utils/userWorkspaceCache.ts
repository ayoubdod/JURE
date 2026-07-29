import { normalizeUserWorkspace } from '@/utils/normalizeUserWorkspace';

const TTL_MS = 60_000;

const cache = new Map<number, { at: number; data: unknown }>();

export function getCachedUserWorkspace(userId: number): API.UserWorkspace | null {
  const e = cache.get(userId);
  if (!e || Date.now() - e.at > TTL_MS) return null;
  return normalizeUserWorkspace(e.data);
}

export function setCachedUserWorkspace(userId: number, data: API.UserWorkspace | unknown) {
  cache.set(userId, { at: Date.now(), data });
}

export function invalidateUserWorkspaceCache(userId?: number) {
  if (userId == null) cache.clear();
  else cache.delete(userId);
}
