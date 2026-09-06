import base64
import os
import re
import time
import uuid
from urllib.parse import quote

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.models import JuriaConversation, JuriaMessage, record_juria_usage
from juria.serializers.conversation_serializer import build_case_context
from juria.serializers.message_serializer import JuriaDraftRequestSerializer
from juria.services.draft_cleanup import (
    clean_draft_content,
    draft_type_title,
    extract_advisory_note,
    infer_document_title,
    ungrounded_advisory,
)
from juria.services.juria_api_service import JuriaAPIError, JuriaTimeoutError, draft_document
from juria.views.conversation_views import get_case_for_user
from juria.views.mixins import JuriaEnabledMixin, juria_error_http_status
from core.utils import get_user_cabinet


def _safe_filename(name: str) -> str:
    base = re.sub(r"[^\w.\-]+", "_", name, flags=re.UNICODE).strip("._") or "document"
    return base[:180]


def _content_disposition(filename: str) -> str:
    """ASCII fallback + RFC 5987 UTF-8 filename for Arabic/French titles."""
    ascii_name = _safe_filename(filename)
    if not ascii_name.lower().endswith(".docx"):
        ascii_name = f"{ascii_name}.docx"
    utf8_name = filename if filename.lower().endswith(".docx") else f"{filename}.docx"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(utf8_name)}"


class JuriaConversationDraftView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        conv = JuriaConversation.objects.select_related("thread", "project", "linked_case").filter(
            pk=conversation_id
        ).first()
        if conv is None:
            raise Http404()
        if conv.thread_id:
            from juria.services.permissions import get_thread_for_user, require_write

            _thread, access = get_thread_for_user(request.user, conv.thread_id, allow_archived=True)
            require_write(access.member)
        elif conv.user_id != request.user.id:
            raise Http404()
        if conv.is_archived:
            conv.is_archived = False
            conv.save(update_fields=["is_archived", "updated_at"])
        ser = JuriaDraftRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        document_type = ser.validated_data["document_type"]
        parameters = ser.validated_data["parameters"]
        linked_case_id = ser.validated_data.get("linked_case_id")

        case = None
        if linked_case_id is not None:
            case = get_case_for_user(request.user, linked_case_id)
            if case is None:
                return Response(
                    {"detail": "Case not found or not accessible."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif conv.linked_case_id:
            case = get_case_for_user(request.user, conv.linked_case_id)

        case_context = build_case_context(case) if case else None
        project = conv.project
        has_project_sources = False
        if project:
            jurisdiction_code = project.jurisdiction_code
            language = ser.validated_data.get("language") or project.preferred_language
            legal_system = None
            legal_domain = project.legal_domain
            instructions = project.instructions
            has_project_sources = project.sources.exists()
        else:
            cabinet = get_user_cabinet(request.user)
            jurisdiction = getattr(cabinet, "jurisdiction", None) if cabinet else None
            jurisdiction_code = getattr(jurisdiction, "code", None)
            language = ser.validated_data.get("language") or getattr(jurisdiction, "default_language", None)
            legal_system = getattr(jurisdiction, "legal_system", None)
            legal_domain = None
            instructions = None

        t0 = time.perf_counter()
        try:
            api_out = draft_document(
                document_type,
                parameters,
                case_context=case_context,
                jurisdiction_code=jurisdiction_code,
                legal_system=legal_system,
                language=language,
                legal_domain=legal_domain,
                instructions=instructions,
            )
        except JuriaTimeoutError:
            return Response(
                {"error": "Juria is taking too long. Please retry."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except JuriaAPIError as exc:
            return Response(
                {"error": str(exc)},
                status=juria_error_http_status(exc),
            )

        content = clean_draft_content(api_out.get("content") or "")
        content, embedded_note = extract_advisory_note(content)
        tokens = int(api_out.get("tokens_used") or 0)
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        title = (
            (api_out.get("title") or "").strip()
            or (ser.validated_data.get("title") or "").strip()
            or infer_document_title(content, document_type, language)
            or draft_type_title(document_type, language)
        )
        advisory = ""
        if not has_project_sources and not case_context:
            advisory = embedded_note or ungrounded_advisory(language)
        elif embedded_note:
            advisory = embedded_note

        rel_path = ""
        from juria.services.document_text import text_to_docx_base64

        rtl = (language or "").lower() in ("ar", "darija")
        docx_b64 = text_to_docx_base64(content, rtl=rtl) if content else ""
        if docx_b64:
            raw = base64.b64decode(docx_b64)
            fname = _safe_filename(f"{title}.docx")
            if not fname.lower().endswith(".docx"):
                fname = f"{fname}.docx"
            # Avoid collisions without making the name look like a UUID dump
            stem, ext = os.path.splitext(fname)
            fname = f"{stem}_{uuid.uuid4().hex[:8]}{ext}"
            rel_path = f"juria/generated/{conv.id}/{fname}"
            default_storage.save(rel_path, ContentFile(raw))

        msg = JuriaMessage.objects.create(
            conversation=conv,
            thread=conv.thread,
            role=JuriaMessage.Role.ASSISTANT,
            content=content,
            mode=JuriaConversation.Mode.DOCUMENT_DRAFTING,
            tokens_used=tokens or None,
            response_time_ms=elapsed_ms,
            generated_document_path=rel_path,
            analysis={
                **({"advisory_note": advisory} if advisory else {}),
                "document_title": title,
            },
        )
        # Ensure the draft is visible on the project thread immediately
        if msg.thread_id is None and conv.thread_id:
            msg.thread_id = conv.thread_id
            msg.save(update_fields=["thread_id"])
        elif msg.thread_id is None and conv.project_id:
            from juria.models import JuriaThread

            thread = (
                JuriaThread.objects.filter(project_id=conv.project_id, is_archived=False)
                .order_by("-updated_at")
                .first()
            )
            if thread:
                msg.thread = thread
                msg.save(update_fields=["thread"])
                if not conv.thread_id:
                    conv.thread = thread
                    conv.save(update_fields=["thread", "updated_at"])
        conv.save(update_fields=["updated_at"])
        record_juria_usage(
            request.user,
            messages_delta=1,
            tokens_delta=tokens,
            documents_drafted_delta=1,
        )

        # Artifacts are created only when the user explicitly clicks "Add to artifact".
        download_url = ""
        if rel_path:
            download_url = request.build_absolute_uri(
                reverse("juria-document-download", kwargs={"message_id": str(msg.id)})
            )

        return Response(
            {
                "message": {
                    "id": str(msg.id),
                    "role": msg.role,
                    "content": msg.content,
                    "generated_document_path": msg.generated_document_path,
                    "tokens_used": tokens,
                    "created_at": msg.created_at,
                    "analysis": msg.analysis,
                },
                "document_title": title,
                "document_download_url": download_url,
                "advisory_note": advisory,
                "artifact_id": None,
                "thread_id": str(msg.thread_id) if msg.thread_id else None,
            },
            status=status.HTTP_201_CREATED,
        )


class JuriaGeneratedDocumentDownloadView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):
        msg = get_object_or_404(
            JuriaMessage.objects.select_related("conversation", "thread", "thread__project"),
            pk=message_id,
        )
        allowed = False
        if msg.conversation_id and msg.conversation.user_id == request.user.id:
            allowed = True
        elif msg.thread_id:
            from juria.services.permissions import get_thread_for_user

            try:
                get_thread_for_user(request.user, msg.thread_id, allow_archived=True)
                allowed = True
            except Exception:
                allowed = False
        if not allowed:
            raise Http404()
        path = (msg.generated_document_path or "").strip()
        if not path:
            raise Http404()
        if not default_storage.exists(path):
            raise Http404()
        fh = default_storage.open(path, "rb")
        filename = os.path.basename(path.replace("\\", "/")) or "document.docx"
        # Prefer a human title when the stored file still uses a technical stem
        display = filename
        analysis = msg.analysis if isinstance(msg.analysis, dict) else {}
        title_hint = (analysis.get("document_title") or "").strip()
        if not title_hint:
            title_hint = infer_document_title(msg.content or "", "AUTRE", msg.language or "fr")
        if title_hint:
            display = f"{title_hint}.docx"
        resp = FileResponse(fh, as_attachment=True, filename=_safe_filename(display))
        resp["Content-Disposition"] = _content_disposition(display)
        return resp
