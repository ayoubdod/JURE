"""Send / edit / delete messages on a Juria thread with authorized context."""

from __future__ import annotations

import os
import tempfile
import time

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone

from juria.models import JuriaConversation, JuriaMessage, JuriaMessageVersion, record_juria_usage
from juria.services.context_engine import resolve_prompt_context
from juria.services.juria_api_service import (
    JuriaAPIError,
    JuriaDocumentError,
    JuriaTimeoutError,
    analyze_document,
    send_chat_message,
)
from juria.services.retrieval import ensure_file_extracted
from juria.services.sources import connect_upload
from juria.services.workspace import ensure_legacy_conversation
from juria.models import JuriaFile
from juria.constants import OcrStatus


def auto_title_from_first_message(text: str) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) > 60:
        cleaned = cleaned[:57].rstrip() + "..."
    date_s = timezone.now().strftime("%d %b %Y")
    return f"{cleaned} — {date_s}"


def local_path_for_storage(rel_path: str) -> str:
    if hasattr(default_storage, "path"):
        return default_storage.path(rel_path)
    with default_storage.open(rel_path, "rb") as f:
        data = f.read()
    suffix = os.path.splitext(rel_path)[1] or ".bin"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(data)
        tmp.flush()
        return tmp.name
    finally:
        tmp.close()


def detect_file_type(name: str) -> str | None:
    ext = (name or "").lower().rsplit(".", 1)[-1] if "." in (name or "") else ""
    if ext == "pdf":
        return "pdf"
    if ext in ("docx", "doc"):
        return "docx"
    return None


def build_history(thread, exclude_message_id=None) -> list[dict[str, str]]:
    qs = thread.messages.filter(is_deleted=False, is_superseded=False).order_by("created_at")
    if exclude_message_id:
        qs = qs.exclude(pk=exclude_message_id)
    hist = []
    for m in qs:
        if m.role not in (JuriaMessage.Role.USER, JuriaMessage.Role.ASSISTANT):
            continue
        hist.append({"role": m.role.lower(), "content": m.content})
    return hist


def format_analysis_response(data: dict) -> str:
    analysis = data.get("analysis") or ""
    structured = data.get("structured") or {}
    if structured.get("parse_error"):
        return analysis
    lines = [analysis]
    return "".join(lines)


def _call_model(*, project, thread, user, message_text, history, mode, language, upload_local=None, upload_type=None):
    ctx = resolve_prompt_context(project, message_text, language=language)
    kwargs = dict(
        language=ctx["language"],
        jurisdiction_code=ctx["jurisdiction"],
        legal_domain=ctx["legal_domain"],
        instructions=ctx["instructions"],
        retrieved_block=ctx["retrieved_block"],
        case_context=ctx["case_context"],
    )
    t0 = time.perf_counter()
    if upload_local:
        api_out = analyze_document(
            upload_local,
            upload_type,
            message_text,
            **kwargs,
        )
        content = format_analysis_response(api_out)
        tokens = int(api_out.get("tokens_used") or 0)
        juria_mid = str(api_out.get("message_id") or "")
        analysis = api_out.get("structured") or {}
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        record_juria_usage(user, messages_delta=2, tokens_delta=tokens, contract_analyses_delta=1)
        return content, tokens, juria_mid, [], analysis, ctx["retrieved"], elapsed_ms

    api_out = send_chat_message(history, message_text, mode=mode, **kwargs)
    content = api_out.get("content") or ""
    tokens = int(api_out.get("tokens_used") or 0)
    juria_mid = str(api_out.get("message_id") or "")
    suggestions = list(api_out.get("suggestions") or [])
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    research_delta = 1 if mode == JuriaConversation.Mode.LEGAL_RESEARCH else 0
    record_juria_usage(user, messages_delta=2, tokens_delta=tokens, research_queries_delta=research_delta)
    return content, tokens, juria_mid, suggestions, {}, ctx["retrieved"], elapsed_ms


def send_thread_message(user, thread, project, *, message_text: str, upload=None, file_name="", language="", mode=""):
    mode = (mode or thread.mode or "CHAT").upper()
    language = (language or project.preferred_language or "fr").lower()
    attachment_rel = ""
    attachment_name = ""
    attachment_type = ""
    has_attachment = bool(upload)
    jfile = None

    if upload:
        raw_name = upload.name or file_name or "upload"
        attachment_name = os.path.basename(raw_name)
        attachment_type = detect_file_type(attachment_name) or ""
        if attachment_type not in ("pdf", "docx"):
            raise JuriaDocumentError("Unsupported file type. Use PDF or DOCX.")
        rel_dir = f"juria/uploads/{thread.id}"
        rel_path = f"{rel_dir}/{attachment_name}"
        default_storage.save(rel_path, ContentFile(upload.read()))
        attachment_rel = rel_path
        jfile = JuriaFile.objects.create(
            project=project,
            file=rel_path,
            original_name=attachment_name,
            content_type=getattr(upload, "content_type", "") or "",
            file_kind=attachment_type,
            size_bytes=getattr(upload, "size", None),
            uploaded_by=user,
            ocr_status=OcrStatus.PENDING,
        )
        connect_upload(project, jfile, user)
        ensure_file_extracted(jfile)

    legacy = ensure_legacy_conversation(thread, user)
    user_msg = JuriaMessage.objects.create(
        conversation=legacy,
        thread=thread,
        author=user,
        role=JuriaMessage.Role.USER,
        content=message_text,
        mode=mode,
        language=language,
        has_attachment=has_attachment,
        attachment_name=attachment_name,
        attachment_type=attachment_type,
        attachment_path=attachment_rel,
    )
    if not thread.title or thread.title in ("Nouveau fil", "Discussion générale"):
        if message_text:
            thread.title = auto_title_from_first_message(message_text)
    thread.mode = mode
    thread.save(update_fields=["title", "mode", "updated_at"])
    project.save(update_fields=["updated_at"])

    local_path = None
    tmp_cleanup = False
    try:
        if has_attachment:
            local_path = local_path_for_storage(attachment_rel)
            tmp_cleanup = not hasattr(default_storage, "path")
        history = build_history(thread, exclude_message_id=user_msg.id)
        content, tokens, juria_mid, suggestions, analysis, retrieved, elapsed_ms = _call_model(
            project=project,
            thread=thread,
            user=user,
            message_text=message_text,
            history=history,
            mode=mode,
            language=language,
            upload_local=local_path,
            upload_type=attachment_type if has_attachment else None,
        )
    except Exception:
        if attachment_rel:
            try:
                default_storage.delete(attachment_rel)
            except Exception:
                pass
        user_msg.delete()
        raise
    finally:
        if tmp_cleanup and local_path and os.path.isfile(local_path):
            try:
                os.unlink(local_path)
            except OSError:
                pass

    assistant_msg = JuriaMessage.objects.create(
        conversation=user_msg.conversation,
        thread=thread,
        role=JuriaMessage.Role.ASSISTANT,
        content=content,
        mode=mode,
        language=language,
        tokens_used=tokens or None,
        response_time_ms=elapsed_ms,
        juria_message_id=juria_mid,
        sources=retrieved,
        analysis=analysis or {},
        parent_message=user_msg,
    )
    thread.save(update_fields=["updated_at"])
    return user_msg, assistant_msg, suggestions


def edit_user_message(user, user_msg: JuriaMessage, *, new_content: str, language: str = "", regenerate: bool = True):
    if user_msg.role != JuriaMessage.Role.USER:
        raise JuriaDocumentError("Only user messages can be edited.")
    last_version = user_msg.versions.order_by("-version_number").first()
    next_no = (last_version.version_number + 1) if last_version else 1
    if next_no == 1:
        JuriaMessageVersion.objects.create(
            message=user_msg,
            content=user_msg.content,
            version_number=1,
            created_by=user,
        )
        next_no = 2
    JuriaMessageVersion.objects.create(
        message=user_msg,
        content=new_content,
        version_number=next_no,
        created_by=user,
    )
    user_msg.content = new_content
    user_msg.edited_at = timezone.now()
    if language:
        user_msg.language = language
    user_msg.save(update_fields=["content", "edited_at", "language"])

    following = JuriaMessage.objects.filter(
        thread=user_msg.thread,
        role=JuriaMessage.Role.ASSISTANT,
        parent_message=user_msg,
        is_deleted=False,
    )
    following.update(is_superseded=True)

    if not regenerate:
        return user_msg, None, []

    thread = user_msg.thread
    project = thread.project
    history = build_history(thread, exclude_message_id=user_msg.id)
    content, tokens, juria_mid, suggestions, analysis, retrieved, elapsed_ms = _call_model(
        project=project,
        thread=thread,
        user=user,
        message_text=new_content,
        history=history,
        mode=user_msg.mode or thread.mode,
        language=language or user_msg.language or project.preferred_language,
    )
    assistant_msg = JuriaMessage.objects.create(
        conversation=user_msg.conversation,
        thread=thread,
        role=JuriaMessage.Role.ASSISTANT,
        content=content,
        mode=user_msg.mode or thread.mode,
        language=user_msg.language,
        tokens_used=tokens or None,
        response_time_ms=elapsed_ms,
        juria_message_id=juria_mid,
        sources=retrieved,
        analysis=analysis or {},
        parent_message=user_msg,
    )
    thread.save(update_fields=["updated_at"])
    return user_msg, assistant_msg, suggestions


def soft_delete_message(user_msg: JuriaMessage) -> None:
    now = timezone.now()
    user_msg.is_deleted = True
    user_msg.deleted_at = now
    user_msg.save(update_fields=["is_deleted", "deleted_at"])
    JuriaMessage.objects.filter(parent_message=user_msg, is_deleted=False).update(
        is_deleted=True, deleted_at=now
    )
