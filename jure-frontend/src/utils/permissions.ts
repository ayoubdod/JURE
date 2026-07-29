import useUserStore from '@/stores/userStore';

/**
 * Default role permissions mapping
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<API.Role, API.Permission[]> = {
  OWNER: [
    'cases.view', 'cases.create', 'cases.edit', 'cases.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage_roles',
    'library.view', 'library.create', 'library.edit', 'library.delete',
    'settings.view', 'settings.edit',
    'conversations.view', 'conversations.create', 'conversations.edit', 'conversations.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
  ],
  ADMIN: [
    'cases.view', 'cases.create', 'cases.edit', 'cases.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage_roles',
    'library.view', 'library.create', 'library.edit', 'library.delete',
    'settings.view', 'settings.edit',
    'conversations.view', 'conversations.create', 'conversations.edit', 'conversations.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
  ],
  MANAGER: [
    'cases.view', 'cases.create', 'cases.edit',
    'clients.view', 'clients.create', 'clients.edit',
    'team.view', 'team.create', 'team.edit',
    'library.view', 'library.create', 'library.edit',
    'settings.view',
    'conversations.view', 'conversations.create', 'conversations.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
  ],
  LAWYER: [
    'cases.view', 'cases.create', 'cases.edit',
    'clients.view', 'clients.create', 'clients.edit',
    'team.view',
    'library.view', 'library.create', 'library.edit',
    'conversations.view', 'conversations.create', 'conversations.edit',
    'tasks.view', 'tasks.create', 'tasks.edit',
  ],
  ASSISTANT: [
    'cases.view', 'cases.edit',
    'clients.view', 'clients.edit',
    'team.view',
    'library.view',
    'conversations.view', 'conversations.create', 'conversations.edit',
    'tasks.view', 'tasks.create', 'tasks.edit',
  ],
  VIEWER: [
    'cases.view',
    'clients.view',
    'team.view',
    'library.view',
    'conversations.view',
    'tasks.view',
  ],
};

/**
 * Get permissions for a role
 */
export const getRolePermissions = (role?: API.Role): API.Permission[] => {
  if (!role) return [];
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (
  permission: API.Permission,
  userRole?: API.Role,
  customPermissions?: API.Permission[]
): boolean => {
  // If custom permissions are provided, check those first
  if (customPermissions && customPermissions.includes(permission)) {
    return true;
  }

  // Otherwise check role-based permissions
  if (userRole) {
    const rolePermissions = getRolePermissions(userRole);
    return rolePermissions.includes(permission);
  }

  return false;
};

/**
 * Check if current user has permission
 */
export const useHasPermission = (permission: API.Permission): boolean => {
  const { user } = useUserStore.getState();
  // Get the current user's cabinet member data if available
  // For now, we'll assume the user has a role stored somewhere
  // This will need to be updated when the backend provides user role info
  const userRole = (user as any)?.role as API.Role | undefined;
  return hasPermission(permission, userRole);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role?: API.Role): string => {
  const roleNames: Record<API.Role, string> = {
    OWNER: 'Owner',
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    LAWYER: 'Lawyer',
    ASSISTANT: 'Assistant',
    VIEWER: 'Viewer',
  };
  return role ? roleNames[role] : 'No Role';
};

/**
 * Get role description
 */
export const getRoleDescription = (role: API.Role): string => {
  const descriptions: Record<API.Role, string> = {
    OWNER: 'Full access to all features and settings. Can manage everything including roles.',
    ADMIN: 'Full access to all features. Can manage team members and roles.',
    MANAGER: 'Can manage cases, clients, and team members. Limited settings access.',
    LAWYER: 'Can view and edit cases and clients. Can create and manage their own work.',
    ASSISTANT: 'Can view and edit assigned cases and clients. Limited creation rights.',
    VIEWER: 'Read-only access. Can view but not modify any data.',
  };
  return descriptions[role];
};


