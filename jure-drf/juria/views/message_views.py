import os
import tempfile
import time

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.models import JuriaConversation, JuriaMessage, record_juria_usage
from juria.serializers.message_serializer import JuriaMessageCreateSerializer
from juria.services.juria_api_service import (
    JuriaAPIError,
    JuriaTimeoutError,
    analyze_document,
    send_chat_message,
)
from juria.serializers.conversation_serializer import build_case_context
from juria.views.conversation_views import get_case_for_user
from juria.views.mixins import JuriaEnabledMixin


def auto_title_from_first_message(text: str) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) > 60:
        cleaned = cleaned[:57].rstrip() + "..."
    date_s = timezone.now().strftime("%d %b %Y")
    return f"{cleaned} — {date_s}"


def _local_path_for_storage(rel_path: str) -> str:
    """Resolve a storage-relative path to a local filesystem path for Juria analyze."""
    if hasattr(default_storage, "path"):
        return default_storage.path(rel_path)
    with default_storage.open(rel_path, "rb") as f:
        data = f.read()
    suffix = os.path.splitext(rel_path)[1] or ".bin"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(data)
        tmp.flush()
        path = tmp.name
    finally:
        tmp.close()
    return path


def _build_history_for_chat(conversation: JuriaConversation, exclude_message_id) -> list[dict[str, str]]:
    hist = []
    for m in conversation.messages.exclude(pk=exclude_message_id).order_by("created_at"):
        if m.role not in (JuriaMessage.Role.USER, JuriaMessage.Role.ASSISTANT):
            continue
        hist.append({"role": m.role.lower(), "content": m.content})
    return hist


def _format_analysis_response(data: dict) -> str:
    analysis = data.get("analysis") or ""
    lines = [analysis]
    kp = data.get("key_points") or []
    if kp:
        lines.append("\n\nPoints clés:\n")
        lines.extend(f"- {x}" for x in kp)
    risks = data.get("risks") or []
    if risks:
        lines.append("\n\nRisques:\n")
        lines.extend(f"- {x}" for x in risks)
    return "".join(lines)


def _detect_file_type(name: str) -> str | None:
    ext = (name or "").lower().rsplit(".", 1)[-1] if "." in (name or "") else ""
    if ext == "pdf":
        return "pdf"
    if ext in ("docx", "doc"):
        return "docx"
    return None


class JuriaConversationMessageCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        ser = JuriaMessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        message_text = ser.validated_data["message"].strip()
        file_name_in = (ser.validated_data.get("file_name") or "").strip()
        upload = request.FILES.get("file")

        conv = get_object_or_404(
            JuriaConversation.objects.filter(user=request.user, is_archived=False),
            pk=conversation_id,
        )

        case_context = None
        if conv.linked_case_id:
            case = get_case_for_user(request.user, conv.linked_case_id)
            if case:
                case_context = build_case_context(case)

        attachment_rel = ""
        attachment_name = ""
        attachment_type = ""
        has_attachment = bool(upload)

        if upload:
            raw_name = upload.name or file_name_in or "upload"
            attachment_name = os.path.basename(raw_name)
            attachment_type = _detect_file_type(attachment_name) or ""
            if attachment_type not in ("pdf", "docx"):
                return Response(
                    {"detail": "Unsupported file type. Use PDF or DOCX."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            rel_dir = f"juria/uploads/{conv.id}"
            rel_path = f"{rel_dir}/{attachment_name}"
            default_storage.save(rel_path, ContentFile(upload.read()))
            attachment_rel = rel_path

        user_msg = JuriaMessage.objects.create(
            conversation=conv,
            role=JuriaMessage.Role.USER,
            content=message_text,
            mode=conv.mode,
            has_attachment=has_attachment,
            attachment_name=attachment_name,
            attachment_type=attachment_type,
            attachment_path=attachment_rel,
        )

        if not conv.title:
            conv.title = auto_title_from_first_message(message_text)
            conv.save(update_fields=["title", "updated_at"])

        t0 = time.perf_counter()
        try:
            if has_attachment:
                local_path = _local_path_for_storage(attachment_rel)
                try:
                    api_out = analyze_document(
                        local_path,
                        attachment_type,
                        message_text,
                        case_context=case_context,
                    )
                finally:
                    if not hasattr(default_storage, "path") and os.path.isfile(local_path):
                        try:
                            os.unlink(local_path)
                        except OSError:
                            pass
                content = _format_analysis_response(api_out)
                tokens = int(api_out.get("tokens_used") or 0)
                juria_mid = str(api_out.get("message_id") or "")
                suggestions = []
                elapsed_ms = int((time.perf_counter() - t0) * 1000)
                record_juria_usage(
                    request.user,
                    messages_delta=2,
                    tokens_delta=tokens,
                    contract_analyses_delta=1,
                )
            else:
                history = _build_history_for_chat(conv, user_msg.id)
                api_out = send_chat_message(
                    history,
                    message_text,
                    case_context=case_context,
                    mode=conv.mode,
                )
                content = api_out.get("content") or ""
                tokens = int(api_out.get("tokens_used") or 0)
                juria_mid = str(api_out.get("message_id") or "")
                suggestions = list(api_out.get("suggestions") or [])
                elapsed_ms = int((time.perf_counter() - t0) * 1000)
                research_delta = 1 if conv.mode == JuriaConversation.Mode.LEGAL_RESEARCH else 0
                record_juria_usage(
                    request.user,
                    messages_delta=2,
                    tokens_delta=tokens,
                    research_queries_delta=research_delta,
                )
        except JuriaTimeoutError:
            if attachment_rel:
                try:
                    default_storage.delete(attachment_rel)
                except Exception:
                    pass
            user_msg.delete()
            return Response(
                {"error": "Juria is taking too long. Please retry."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except JuriaAPIError:
            if attachment_rel:
                try:
                    default_storage.delete(attachment_rel)
                except Exception:
                    pass
            user_msg.delete()
            return Response(
                {"error": "Juria API unavailable. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        assistant_msg = JuriaMessage.objects.create(
            conversation=conv,
            role=JuriaMessage.Role.ASSISTANT,
            content=content,
            mode=conv.mode,
            tokens_used=tokens or None,
            response_time_ms=elapsed_ms,
            juria_message_id=juria_mid,
        )
        conv.save(update_fields=["updated_at"])

        return Response(
            {
                "user_message": {
                    "id": str(user_msg.id),
                    "role": user_msg.role,
                    "content": user_msg.content,
                    "created_at": user_msg.created_at,
                },
                "assistant_message": {
                    "id": str(assistant_msg.id),
                    "role": assistant_msg.role,
                    "content": assistant_msg.content,
                    "suggestions": suggestions if not has_attachment else [],
                    "tokens_used": tokens,
                    "created_at": assistant_msg.created_at,
                },
            },
            status=status.HTTP_201_CREATED,
        )
