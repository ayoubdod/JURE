"""POST .../close/ action — persist Case.status=CLOSED with audit."""
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from cabinets.permissions import has_permission

from ..services import close_case


class HasCasesEditPermission(permissions.BasePermission):
    """Close is a status mutation — require cases.edit (not cases.create)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_permission(request.user, "cases.edit")


class CloseCaseMixin:
    """Adds `close` action to a CaseViewSet."""

    @action(
        detail=True,
        methods=["POST"],
        url_path="close",
        permission_classes=[permissions.IsAuthenticated, HasCasesEditPermission],
    )
    def close(self, request, pk=None):
        """
        POST /api/v1/cases/:id/close/

        Body (all optional):
          outcome, lessons, precedents — stored under case_specific_data.close_summary

        Idempotent: already CLOSED returns 200 with already_closed=true (no new audit).
        Tenant isolation via get_queryset() / get_object().
        """
        case = self.get_object()
        outcome = request.data.get("outcome") or ""
        lessons = request.data.get("lessons") or ""
        precedents = request.data.get("precedents") or ""

        case, already_closed, previous_status = close_case(
            case,
            request.user,
            outcome=str(outcome) if outcome is not None else "",
            lessons=str(lessons) if lessons is not None else "",
            precedents=str(precedents) if precedents is not None else "",
        )

        serializer = self.get_serializer(case)
        return Response(
            {
                "success": True,
                "already_closed": already_closed,
                "previous_status": previous_status,
                "case": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
