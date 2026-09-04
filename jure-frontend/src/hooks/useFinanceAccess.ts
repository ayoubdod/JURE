import { useEffect, useState } from 'react';
import useUserStore from '@/stores/userStore';
import { apiGetMyCabinetMember } from '@/services/cabinet-member/api';
import { isFinanceAuthorized } from '@/utils/financePermissions';

/**
 * Finance UI is gated by cabinet role OWNER or ADMIN only (not MANAGER/LAWYER/etc.).
 * The auth user object often does not include `role`; it lives on the cabinet member record.
 */
export function useFinanceAccess() {
  const user = useUserStore((s) => s.user);
  const userRole = user?.role;
  const [memberRole, setMemberRole] = useState<API.Role | null | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setMemberRole(undefined);
      return;
    }
    let cancelled = false;
    apiGetMyCabinetMember()
      .then((res) => {
        if (!cancelled) setMemberRole(res.data.role ?? null);
      })
      .catch(() => {
        if (!cancelled) setMemberRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /** True while we still need cabinet member role to decide (no user.role yet). */
  const loading = userRole == null && memberRole === undefined;

  const effectiveRole = userRole ?? (memberRole === undefined ? undefined : memberRole);
  const authorized = effectiveRole != null && isFinanceAuthorized(effectiveRole);

  return { authorized, loading, effectiveRole, userRole, memberRole };
}
