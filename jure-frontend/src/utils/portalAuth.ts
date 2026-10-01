export function isPortalClient(user: API.User | null | undefined): boolean {
  if (!user) return false;
  // Explicit flag from API; fall back to "has cabinet, no staff role"
  if (typeof user.is_cabinet_member === 'boolean') {
    return !user.is_cabinet_member && Boolean(user.cabinet_id);
  }
  return Boolean(user.cabinet_id) && !user.role;
}

export function homePathForUser(user: API.User | null | undefined): string {
  return isPortalClient(user) ? '/client' : '/dashboard';
}
