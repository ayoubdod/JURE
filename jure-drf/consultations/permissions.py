from __future__ import annotations

from rest_framework.permissions import BasePermission

from cabinets.permissions import has_permission


def is_portal_client(user) -> bool:
    """Cabinet client: belongs to a cabinet but is not a team member."""
    return bool(
        getattr(user, "is_authenticated", False)
        and getattr(user, "cabinet_id", None)
        and not getattr(user, "is_cabinet_member", False)
    )


def is_cabinet_staff(user) -> bool:
    return bool(
        getattr(user, "is_authenticated", False)
        and (
            getattr(user, "is_cabinet_member", False)
            or getattr(user, "owned_cabinet", None)
        )
    )


class IsPortalClient(BasePermission):
    def has_permission(self, request, view):
        return is_portal_client(request.user)


class IsCabinetStaff(BasePermission):
    def has_permission(self, request, view):
        return is_cabinet_staff(request.user)


class CanManageConsultationRequests(BasePermission):
    """Staff with cases.view (or edit for mutations) may manage firm requests."""

    def has_permission(self, request, view):
        user = request.user
        if not is_cabinet_staff(user):
            return False
        method = request.method.upper()
        if method == "GET":
            return has_permission(user, "cases.view")
        if method == "POST":
            return has_permission(user, "cases.create") or has_permission(user, "cases.edit")
        if method in ("PUT", "PATCH", "DELETE"):
            return has_permission(user, "cases.edit")
        return True


class IsConsultationParticipant(BasePermission):
    """Client owning the request, or cabinet staff of the same cabinet."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_portal_client(user):
            return obj.client_id == user.id
        if is_cabinet_staff(user):
            cabinet_id = getattr(user, "cabinet_id", None)
            if getattr(user, "owned_cabinet", None):
                cabinet_id = user.owned_cabinet.id
            return obj.cabinet_id == cabinet_id and has_permission(user, "cases.view")
        return False
