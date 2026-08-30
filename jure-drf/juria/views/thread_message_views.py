from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.models import JuriaMessage
from juria.serializers.message_serializer import (
    JuriaMessageCreateSerializer,
    JuriaMessageEditSerializer,
    JuriaMessageSerializer,
)
from juria.services.chat import edit_user_message, send_thread_message, soft_delete_message
from juria.services.juria_api_service import JuriaAPIError, JuriaDocumentError, JuriaTimeoutError
from juria.services.permissions import get_thread_for_user, require_write
from juria.views.mixins import JuriaEnabledMixin, juria_error_http_status


def _error_response(exc):
    if isinstance(exc, JuriaDocumentError):
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, JuriaTimeoutError):
        return Response(
            {"error": "Juria is taking too long. Please retry."},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    if isinstance(exc, JuriaAPIError):
        return Response({"error": str(exc)}, status=juria_error_http_status(exc))
    raise exc


def _pair_payload(user_msg, assistant_msg, suggestions, request):
    return {
        "user_message": JuriaMessageSerializer(user_msg, context={"request": request}).data,
        "assistant_message": {
            **JuriaMessageSerializer(assistant_msg, context={"request": request}).data,
            "suggestions": suggestions or [],
        },
    }


class JuriaThreadMessageListCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        thread, _access = get_thread_for_user(request.user, thread_id, allow_archived=True)
        messages = (
            thread.messages.filter(is_deleted=False)
            .select_related("author")
            .prefetch_related("versions")
            .order_by("created_at")
        )
        return Response(JuriaMessageSerializer(messages, many=True, context={"request": request}).data)

    def post(self, request, thread_id):
        thread, access = get_thread_for_user(request.user, thread_id, allow_archived=True)
        require_write(access.member)
        ser = JuriaMessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            user_msg, assistant_msg, suggestions = send_thread_message(
                request.user,
                thread,
                access.project,
                message_text=ser.validated_data["message"].strip(),
                upload=request.FILES.get("file"),
                file_name=(ser.validated_data.get("file_name") or "").strip(),
                language=(ser.validated_data.get("language") or "").strip(),
                mode=(ser.validated_data.get("mode") or "").strip(),
            )
        except (JuriaDocumentError, JuriaTimeoutError, JuriaAPIError) as exc:
            return _error_response(exc)
        return Response(
            _pair_payload(user_msg, assistant_msg, suggestions, request),
            status=status.HTTP_201_CREATED,
        )


class JuriaMessageEditView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        msg = JuriaMessage.objects.select_related("thread", "thread__project").filter(pk=message_id).first()
        if msg is None or msg.thread_id is None:
            return Response(status=404)
        thread, access = get_thread_for_user(request.user, msg.thread_id, allow_archived=True)
        require_write(access.member)
        if msg.author_id and msg.author_id != request.user.id and access.member.role != "OWNER":
            return Response({"detail": "You can only edit your own messages."}, status=403)
        ser = JuriaMessageEditSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            user_msg, assistant_msg, suggestions = edit_user_message(
                request.user,
                msg,
                new_content=ser.validated_data["content"].strip(),
                language=(ser.validated_data.get("language") or "").strip(),
                regenerate=ser.validated_data.get("regenerate", True),
            )
        except (JuriaDocumentError, JuriaTimeoutError, JuriaAPIError) as exc:
            return _error_response(exc)
        payload = {"user_message": JuriaMessageSerializer(user_msg, context={"request": request}).data}
        if assistant_msg:
            payload["assistant_message"] = {
                **JuriaMessageSerializer(assistant_msg, context={"request": request}).data,
                "suggestions": suggestions or [],
            }
        return Response(payload)


class JuriaMessageDeleteView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, message_id):
        msg = JuriaMessage.objects.select_related("thread").filter(pk=message_id, is_deleted=False).first()
        if msg is None or msg.thread_id is None:
            return Response(status=404)
        _thread, access = get_thread_for_user(request.user, msg.thread_id, allow_archived=True)
        require_write(access.member)
        if msg.author_id and msg.author_id != request.user.id and access.member.role != "OWNER":
            return Response({"detail": "You can only delete your own messages."}, status=403)
        soft_delete_message(msg)
        return Response(status=status.HTTP_204_NO_CONTENT)
