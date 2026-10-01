"""Privacy API permissions — cabinet staff only (not portal clients)."""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from consultations.permissions import is_cabinet_staff
from core.utils import get_user_cabinet


class IsCabinetStaff(BasePermission):
    def has_permission(self, request, view):
        return is_cabinet_staff(request.user)


def require_staff_cabinet(user):
    """Return cabinet for staff user or None."""
    if not is_cabinet_staff(user):
        return None
    return get_user_cabinet(user)
