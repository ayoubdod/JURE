from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case, CaseAttachment
from juria.views.conversation_views import get_case_for_user
from juria.views.mixins import JuriaEnabledMixin
from library.constants import LIBRARY_SCOPE_TO_VISIBILITY, VISIBILITY_TO_LIBRARY_SCOPE
from library.models import Document
from library.querysets import library_scope_queryset
from juria.services.permissions import require_cabinet


class JuriaLookupCaseDocumentsView(JuriaEnabledMixin, APIView):
    """List attachments of a cabinet case the user can access. Used by the project wizard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            case_id = int(request.query_params.get("case_id") or 0)
        except (TypeError, ValueError):
            return Response({"detail": "case_id is required."}, status=400)
        case = get_case_for_user(request.user, case_id)
        if case is None:
            return Response({"detail": "Case not found or not accessible."}, status=404)
        atts = CaseAttachment.objects.filter(Q(case=case) | Q(linked_cases=case)).distinct()
        return Response(
            [
                {
                    "id": a.id,
                    "file_name": a.display_name(),
                    "other_type": a.other_type,
                }
                for a in atts
            ]
        )


class JuriaLookupLibraryView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cabinet = require_cabinet(request.user)
        q = (request.query_params.get("search") or "").strip()
        scope = (
            request.query_params.get("library_scope") or request.query_params.get("scope") or ""
        ).strip().upper()
        scopes = [scope] if scope in LIBRARY_SCOPE_TO_VISIBILITY else None
        qs = (
            library_scope_queryset(cabinet, scopes)
            .exclude(status=Document.DocumentStatus.ARCHIVED)
            .order_by("-created")
        )
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
        qs = qs[:100]
        return Response(
            [
                {
                    "id": d.id,
                    "title": d.title,
                    "visibility_scope": d.visibility_scope,
                    "scope": VISIBILITY_TO_LIBRARY_SCOPE.get(d.visibility_scope, "PERSONAL"),
                    "resource_type": d.resource_type,
                }
                for d in qs
            ]
        )


class JuriaLookupCasesView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cabinet = require_cabinet(request.user)
        q = (request.query_params.get("search") or "").strip()
        qs = Case.objects.filter(cabinet=cabinet).order_by("-modified")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(reference__icontains=q))
        qs = qs[:30]
        return Response(
            [
                {
                    "id": c.id,
                    "reference": c.reference,
                    "title": c.title,
                    "status": c.status,
                    "case_type": c.case_type,
                    "client_id": c.client_id,
                    "client_name": (
                        f"{c.client.first_name} {c.client.last_name}".strip() if c.client_id else None
                    ),
                }
                for c in qs.select_related("client")
            ]
        )
