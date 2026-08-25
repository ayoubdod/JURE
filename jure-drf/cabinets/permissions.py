# cabinets/permissions.py
"""
Permission utilities for role-based access control (RBAC).
"""
from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import BasePermission
from typing import List, Optional


# Default permissions for each role
DEFAULT_ROLE_PERMISSIONS = {
    'OWNER': [
        'cases.view', 'cases.create', 'cases.edit', 'cases.delete',
        'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
        'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage_roles',
        'library.view', 'library.create', 'library.edit', 'library.delete',
        'settings.view', 'settings.edit',
        'conversations.view', 'conversations.create', 'conversations.edit', 'conversations.delete',
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    ],
    'ADMIN': [
        'cases.view', 'cases.create', 'cases.edit', 'cases.delete',
        'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
        'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage_roles',
        'library.view', 'library.create', 'library.edit', 'library.delete',
        'settings.view', 'settings.edit',
        'conversations.view', 'conversations.create', 'conversations.edit', 'conversations.delete',
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    ],
    'MANAGER': [
        'cases.view', 'cases.create', 'cases.edit',
        'clients.view', 'clients.create', 'clients.edit',
        'team.view', 'team.create', 'team.edit',
        'library.view', 'library.create', 'library.edit',
        'settings.view',
        'conversations.view',
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete',
    ],
    'LAWYER': [
        'cases.view', 'cases.create', 'cases.edit',
        'clients.view', 'clients.create', 'clients.edit',
        'team.view',
        'library.view', 'library.create', 'library.edit',
        'conversations.view', 'conversations.create', 'conversations.edit',
        'tasks.view', 'tasks.create', 'tasks.edit',
    ],
    'ASSISTANT': [
        'cases.view', 'cases.edit',
        'clients.view', 'clients.edit',
        'team.view',
        'library.view',
        'conversations.view',
        'tasks.view', 'tasks.create', 'tasks.edit',
    ],
    'VIEWER': [
        'cases.view',
        'clients.view',
        'team.view',
        'library.view',
        'conversations.view',
        'tasks.view',
    ],
}


def get_role_permissions(role: Optional[str]) -> List[str]:
    """
    Get list of permissions for a given role.
    
    Args:
        role: The role name (e.g., 'OWNER', 'ADMIN', etc.)
    
    Returns:
        List of permission codes for the role
    """
    if not role:
        return []
    return DEFAULT_ROLE_PERMISSIONS.get(role, [])


def has_permission(user, permission_code: str) -> bool:
    """
    Check if a user has a specific permission.
    
    Args:
        user: The user instance
        permission_code: The permission code to check (e.g., 'cases.view')
    
    Returns:
        True if user has the permission, False otherwise
    """
    # Cabinet owner without explicit role gets OWNER permissions (backward compat)
    # Otherwise use their actual role - so role changes take effect even for owners
    if hasattr(user, 'owned_cabinet') and user.owned_cabinet:
        role = user.role or 'OWNER'
    elif not user.is_cabinet_member:
        return False
    else:
        role = user.role
    
    if not role:
        return False
    
    role_permissions = get_role_permissions(role)
    return permission_code in role_permissions


def require_permission(permission_code: str):
    """
    Decorator to require a specific permission for a view function.
    
    Usage:
        @require_permission('cases.view')
        def list_cases(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not has_permission(request.user, permission_code):
                return Response(
                    {'error': f'Permission required: {permission_code}'},
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def can_manage_roles(user) -> bool:
    """
    Check if a user can manage roles (assign/change roles of other members).
    
    Only OWNER and ADMIN can manage roles.
    
    Args:
        user: The user instance
    
    Returns:
        True if user can manage roles, False otherwise
    """
    # Cabinet owner without explicit role gets OWNER (backward compat)
    if hasattr(user, 'owned_cabinet') and user.owned_cabinet:
        role = user.role or 'OWNER'
    elif user.is_cabinet_member and user.role:
        role = user.role
    else:
        return False
    return role in ['OWNER', 'ADMIN']


def _get_required_permission(resource: str, method: str) -> Optional[str]:
    """Map HTTP method to permission code for a resource."""
    method = method.upper()
    if method == 'GET':
        return f'{resource}.view'
    if method == 'POST':
        return f'{resource}.create'
    if method in ('PUT', 'PATCH'):
        return f'{resource}.edit'
    if method == 'DELETE':
        return f'{resource}.delete'
    return None


def _create_resource_permission_class(resource: str):
    """Factory to create a permission class for a specific resource."""

    class ResourcePermission(BasePermission):
        """Enforces RBAC permission for the given resource based on HTTP method."""

        def has_permission(self, request, view):
            if not request.user.is_authenticated:
                return False
            perm = _get_required_permission(resource, request.method)
            if perm is None:
                return True  # OPTIONS, etc.
            return has_permission(request.user, perm)

    ResourcePermission.__name__ = f'Has{resource.title()}Permission'
    return ResourcePermission


# Pre-built permission classes for each resource
HasCasesPermission = _create_resource_permission_class('cases')
HasClientsPermission = _create_resource_permission_class('clients')
_HasLibraryCabinetPermission = _create_resource_permission_class('library')
HasConversationsPermission = _create_resource_permission_class('conversations')
HasTasksPermission = _create_resource_permission_class('tasks')


class HasLibraryPermission(_HasLibraryCabinetPermission):
    """Cabinet RBAC for library, plus platform staff for shared publishing."""

    def has_permission(self, request, view):
        user = request.user
        if getattr(user, 'is_authenticated', False) and (
            getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)
        ):
            return True
        return super().has_permission(request, view)


CONTENT_MANAGER_ROLES = frozenset({'OWNER', 'ADMIN'})


def can_manage_content(user) -> bool:
    """Cabinet Owner/Admin or platform staff may archive/restore cabinet library docs."""
    if not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True
    role = getattr(user, 'role', None)
    if hasattr(user, 'owned_cabinet') and user.owned_cabinet:
        role = role or 'OWNER'
    return role in CONTENT_MANAGER_ROLES


def can_publish_shared_library(user) -> bool:
    """Only platform administrators may publish Local or International library resources."""
    if not getattr(user, 'is_authenticated', False):
        return False
    return bool(getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False))


class CanManageContent(BasePermission):
    """Owner, Admin, or staff — used for cabinet library archive/restore."""

    def has_permission(self, request, view):
        return can_manage_content(request.user)



