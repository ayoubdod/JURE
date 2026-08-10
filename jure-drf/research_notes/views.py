from __future__ import annotations

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from cabinets.permissions import HasCasesPermission
from core.utils import NumericPagination, get_user_cabinet
from dashboard.models import ActivityLog

from .models import ResearchNote
from .serializers import ResearchNoteSerializer, ResearchNoteWriteSerializer


def _user_label(user) -> str:
    parts = [
        p
        for p in (getattr(user, "first_name", "") or "", getattr(user, "last_name", "") or "")
        if p
    ]
    return " ".join(parts).strip() or getattr(user, "email", "User")


class ResearchNoteViewSet(viewsets.ModelViewSet):
    """
    CRUD for cabinet-scoped research notes.

    GET/POST   /api/v1/research-notes/
    GET/PATCH/DELETE /api/v1/research-notes/{id}/

    Query params:
      - matter: filter by case id
      - unscoped: if "1"/"true", only notes with matter IS NULL
    """

    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]
    pagination_class = NumericPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        cabinet = get_user_cabinet(self.request.user)
        if not cabinet:
            return ResearchNote.objects.none()
        qs = ResearchNote.objects.filter(cabinet=cabinet).select_related(
            "author", "matter"
        )
        matter_id = self.request.query_params.get("matter")
        if matter_id not in (None, ""):
            qs = qs.filter(matter_id=matter_id)
        unscoped = (self.request.query_params.get("unscoped") or "").lower()
        if unscoped in ("1", "true", "yes"):
            qs = qs.filter(matter__isnull=True)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "partial_update", "update"):
            return ResearchNoteWriteSerializer
        return ResearchNoteSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["cabinet"] = get_user_cabinet(self.request.user)
        return ctx

    def create(self, request, *args, **kwargs):
        cabinet = get_user_cabinet(request.user)
        if not cabinet:
            return Response(
                {"detail": "You must belong to a cabinet to save research notes."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        note = ResearchNote.objects.create(
            cabinet=cabinet,
            author=request.user,
            title=ser.validated_data["title"],
            citation=ser.validated_data.get("citation") or "",
            content=ser.validated_data.get("content") or "",
            matter=ser.validated_data.get("matter"),
        )
        ActivityLog.objects.create(
            cabinet=cabinet,
            kind="research_note_created",
            message=(
                f'{_user_label(request.user)} created research note "{note.title[:80]}"'
            )[:255],
        )
        out = ResearchNoteSerializer(note, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        note = self.get_object()
        ser = self.get_serializer(note, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        for field in ("title", "citation", "content", "matter"):
            if field in ser.validated_data:
                setattr(note, field, ser.validated_data[field])
        note.save()
        ActivityLog.objects.create(
            cabinet=note.cabinet,
            kind="research_note_updated",
            message=(
                f'{_user_label(request.user)} updated research note "{note.title[:80]}"'
            )[:255],
        )
        out = ResearchNoteSerializer(note, context=self.get_serializer_context())
        return Response(out.data)

    def destroy(self, request, *args, **kwargs):
        note = self.get_object()
        title = note.title
        cabinet = note.cabinet
        note.delete()
        ActivityLog.objects.create(
            cabinet=cabinet,
            kind="research_note_deleted",
            message=(
                f'{_user_label(request.user)} deleted research note "{title[:80]}"'
            )[:255],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
