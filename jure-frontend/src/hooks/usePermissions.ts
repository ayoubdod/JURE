import { useMemo } from 'react';
import { hasPermission, getRolePermissions } from '@/utils/permissions';
import useUserStore from '@/stores/userStore';

/**
 * Hook to check if current user has a permission
 */
export const usePermission = (permission: API.Permission): boolean => {
  const { user } = useUserStore();
  
  return useMemo(() => {
    return hasPermission(permission, user?.role, user?.permissions);
  }, [user, permission]);
};

/**
 * Hook to check multiple permissions
 */
export const usePermissions = (permissions: API.Permission[]): Record<API.Permission, boolean> => {
  const { user } = useUserStore();
  
  return useMemo(() => {
    return permissions.reduce((acc, perm) => {
      acc[perm] = hasPermission(perm, user?.role, user?.permissions);
      return acc;
    }, {} as Record<API.Permission, boolean>);
  }, [user, permissions]);
};

/**
 * Hook to get current user's role and permissions
 */
export const useUserRole = () => {
  const { user } = useUserStore();
  
  return useMemo(() => {
    const userRole = user?.role;
    const customPermissions = user?.permissions;
    const rolePermissions = userRole ? getRolePermissions(userRole) : [];
    
    return {
      role: userRole,
      permissions: customPermissions || rolePermissions,
      hasPermission: (permission: API.Permission) => 
        hasPermission(permission, userRole, customPermissions),
    };
  }, [user]);
};


