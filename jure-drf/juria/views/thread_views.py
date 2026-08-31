from django.db.models import Count, OuterRef, Q, Subquery
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.constants import ActivityAction
from juria.models import JuriaMessage, JuriaThread
from juria.serializers.thread_serializer import (
    JuriaThreadCreateSerializer,
    JuriaThreadListSerializer,
    JuriaThreadUpdateSerializer,
)
from juria.services.activity import log_activity
from juria.services.permissions import get_project_for_user, get_thread_for_user, require_write
from juria.services.titles import is_auto_title
from juria.services.workspace import ensure_legacy_conversation
from juria.views.mixins import JuriaEnabledMixin


class JuriaThreadListCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        access = get_project_for_user(request.user, project_id, allow_archived=True)
        last_sub = (
            JuriaMessage.objects.filter(thread_id=OuterRef("pk"), is_deleted=False)
            .order_by("-created_at")
            .values("content")[:1]
        )
        qs = (
            access.project.threads.filter(is_deleted=False)
            .annotate(
                last_preview=Subquery(last_sub),
                message_count=Count("messages", filter=Q(messages__is_deleted=False)),
            )
            .select_related("created_by")
            .order_by("-updated_at")
        )
        archived = request.query_params.get("is_archived")
        if archived in ("true", "1"):
            qs = qs.filter(is_archived=True)
        else:
            qs = qs.filter(is_archived=False)
        q = (request.query_params.get("search") or "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
        return Response(JuriaThreadListSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request, project_id):
        access = get_project_for_user(request.user, project_id)
        require_write(access.member)
        ser = JuriaThreadCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        title = (ser.validated_data.get("title") or "").strip()
        thread = JuriaThread.objects.create(
            project=access.project,
            title=title,
            title_is_custom=bool(title) and not is_auto_title(title),
            mode=ser.validated_data.get("mode") or "CHAT",
            created_by=request.user,
        )
        ensure_legacy_conversation(thread, request.user)
        log_activity(access.project, request.user, ActivityAction.THREAD_CREATED, thread_id=str(thread.id))
        return Response(
            JuriaThreadListSerializer(thread, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaThreadDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        thread, _access = get_thread_for_user(request.user, thread_id, allow_archived=True)
        return Response(JuriaThreadListSerializer(thread, context={"request": request}).data)

    def patch(self, request, thread_id):
        thread, access = get_thread_for_user(request.user, thread_id, allow_archived=True)
        require_write(access.member)
        ser = JuriaThreadUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        fields = []
        if "title" in data:
            thread.title = data["title"]
            thread.title_is_custom = True
            fields.extend(["title", "title_is_custom"])
            project = access.project
            if project.is_simple:
                siblings = project.threads.filter(is_deleted=False, is_archived=False)
                if siblings.count() == 1:
                    project.name = thread.title
                    project.name_is_custom = True
                    project.save(update_fields=["name", "name_is_custom", "updated_at"])
        for key in ("mode", "is_archived"):
            if key in data:
                setattr(thread, key, data[key])
                fields.append(key)
        if fields:
            thread.save(update_fields=fields + ["updated_at"])
            if data.get("is_archived"):
                log_activity(access.project, request.user, ActivityAction.THREAD_ARCHIVED, thread_id=str(thread.id))
        return Response(JuriaThreadListSerializer(thread, context={"request": request}).data)

    def delete(self, request, thread_id):
        thread, access = get_thread_for_user(request.user, thread_id, allow_archived=True)
        require_write(access.member)
        thread.is_deleted = True
        thread.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
