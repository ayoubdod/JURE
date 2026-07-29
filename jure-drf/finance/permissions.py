from rest_framework.permissions import BasePermission

from users.models import User


class IsFinanceAuthorized(BasePermission):
    """
    Finance module: OWNER and ADMIN (Administrator) only.
    """

    message = 'Access denied. Finance module requires Owner or Administrator role.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        role = getattr(user, 'role', None)
        return role in (User.Role.OWNER, User.Role.ADMIN)
