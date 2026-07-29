/**
 * Finance UI is restricted to cabinet OWNER and ADMIN only.
 * MANAGER, LAWYER, ASSISTANT, VIEWER receive 403 from finance APIs.
 */
export function isFinanceAuthorized(role: string | undefined | null): boolean {
  if (role == null || role === '') return false;
  const r = String(role).toUpperCase();
  return r === 'OWNER' || r === 'ADMIN';
}
