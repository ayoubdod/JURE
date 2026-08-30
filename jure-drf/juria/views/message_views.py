"""Replace the conversation-bound message view with thread-aware sending, keeping the old URL."""

import os
import tempfile
import time

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.models import JuriaConversation, JuriaMessage, record_juria_usage
from juria.serializers.message_serializer import JuriaMessageCreateSerializer, JuriaMessageSerializer
from juria.services.chat import send_thread_message
from juria.services.juria_api_service import JuriaAPIError, JuriaDocumentError, JuriaTimeoutError
from juria.services.permissions import require_write
from juria.services.workspace import create_project
from juria.views.conversation_views import get_user_conversation
from juria.views.mixins import JuriaEnabledMixin, juria_error_http_status
from juria.views.thread_message_views import _error_response, _pair_payload
from core.utils import get_user_cabinet


class JuriaConversationMessageCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        ser = JuriaMessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        conv = get_user_conversation(request.user, conversation_id, restore_archived=True)
        if conv.thread_id and conv.project_id:
            from juria.services.permissions import get_project_for_user

            access = get_project_for_user(request.user, conv.project_id, allow_archived=True)
            require_write(access.member)
            try:
                user_msg, assistant_msg, suggestions = send_thread_message(
                    request.user,
                    conv.thread,
                    conv.project,
                    message_text=ser.validated_data["message"].strip(),
                    upload=request.FILES.get("file"),
                    file_name=(ser.validated_data.get("file_name") or "").strip(),
                    language=(ser.validated_data.get("language") or "").strip(),
                    mode=conv.mode,
                )
            except (JuriaDocumentError, JuriaTimeoutError, JuriaAPIError) as exc:
                return _error_response(exc)
            return Response(
                _pair_payload(user_msg, assistant_msg, suggestions, request),
                status=status.HTTP_201_CREATED,
            )

        # Legacy conversations not yet migrated: create a workspace on the fly.
        cabinet = get_user_cabinet(request.user)
        if cabinet and not conv.project_id:
            project = create_project(
                cabinet=cabinet,
                owner=request.user,
                name=conv.title or "Conversation Juria",
                linked_case=conv.linked_case,
                mode=conv.mode,
            )
            thread = project.threads.first()
            conv.project = project
            conv.thread = thread
            conv.save(update_fields=["project", "thread", "updated_at"])
            JuriaMessage.objects.filter(conversation=conv, thread__isnull=True).update(thread=thread)
            access_project = project
            access_thread = thread
            try:
                user_msg, assistant_msg, suggestions = send_thread_message(
                    request.user,
                    access_thread,
                    access_project,
                    message_text=ser.validated_data["message"].strip(),
                    upload=request.FILES.get("file"),
                    file_name=(ser.validated_data.get("file_name") or "").strip(),
                    language=(ser.validated_data.get("language") or "").strip(),
                    mode=conv.mode,
                )
            except (JuriaDocumentError, JuriaTimeoutError, JuriaAPIError) as exc:
                return _error_response(exc)
            return Response(
                _pair_payload(user_msg, assistant_msg, suggestions, request),
                status=status.HTTP_201_CREATED,
            )

        return Response({"detail": "Conversation is not linked to a project."}, status=400)
