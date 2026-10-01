"""Send / edit / delete messages on a Juria thread with authorized context."""

from __future__ import annotations

import logging
import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

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
    generate_conversation_title,
    send_chat_message,
)
from juria.services.draft_cleanup import clean_draft_content, extract_advisory_note, ungrounded_advisory
from juria.services.retrieval import ensure_file_extracted
from juria.services.sources import connect_upload
from juria.services.titles import fallback_title_from_message, is_auto_title
from juria.services.workspace import ensure_legacy_conversation
from juria.models import JuriaFile
from juria.constants import OcrStatus

logger = logging.getLogger(__name__)


def auto_title_from_first_message(text: str, language: str = "fr") -> str:
    return fallback_title_from_message(text, language)


def should_auto_title_thread(thread) -> bool:
    return not getattr(thread, "title_is_custom", False) and is_auto_title(thread.title)


def apply_auto_title(thread, project, title: str) -> None:
    cleaned = (title or "").strip()[:200]
    if not cleaned:
        return
    thread.title = cleaned
    thread.save(update_fields=["title", "updated_at"])
    thread.legacy_conversations.update(title=cleaned)
    if (
        getattr(project, "is_simple", False)
        and not getattr(project, "name_is_custom", False)
        and is_auto_title(project.name)
    ):
        project.name = cleaned
        project.save(update_fields=["name", "updated_at"])


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


def finalize_assistant_payload(
    content: str,
    analysis: dict | None,
    retrieved,
    language: str,
    *,
    mode: str = "CHAT",
) -> tuple[str, dict]:
    """Strip embedded advisory into analysis; inject coral-banner note when ungrounded."""
    mode_u = (mode or "").upper()
    raw = content or ""
    if mode_u == "DOCUMENT_DRAFTING":
        raw = clean_draft_content(raw)
    body, note = extract_advisory_note(raw)
    out = dict(analysis or {})
    if note:
        out["advisory_note"] = note
    elif (
        not retrieved
        and not out.get("advisory_note")
        and mode_u in ("CONTRACT_ANALYSIS", "LEGAL_RESEARCH", "DOCUMENT_DRAFTING")
    ):
        out["advisory_note"] = ungrounded_advisory(language)
    return body, out


def _call_model(*, project, thread, user, message_text, history, mode, language, upload_local=None, upload_type=None):
    from privacy.audit import log_privacy_event
    from privacy.constants import PrivacyAuditAction, PrivacyMode
    from privacy.services.document_text_bridge import extract_for_privacy
    from privacy.services.egress import reset_egress_ticket, set_egress_ticket
    from privacy.services.gateway import PrivacyGatewayError, sanitize_for_ai

    ctx = resolve_prompt_context(project, message_text, language=language)
    document_text = None
    if upload_local:
        document_text = extract_for_privacy(upload_local, upload_type)

    cabinet = getattr(project, "cabinet", None)
    try:
        sanitized = sanitize_for_ai(
            user=user,
            cabinet=cabinet,
            project=project,
            case=getattr(project, "linked_case", None),
            message_text=message_text or "",
            history=history,
            case_context=ctx.get("case_context"),
            retrieved_block=ctx.get("retrieved_block"),
            instructions=ctx.get("instructions"),
            document_text=document_text,
            has_documents=bool(upload_local or document_text),
        )
    except PrivacyGatewayError as exc:
        raise JuriaAPIError(str(exc)) from exc

    kwargs = dict(
        language=ctx["language"],
        jurisdiction_code=ctx["jurisdiction"],
        legal_domain=ctx["legal_domain"],
        instructions=sanitized.instructions,
        retrieved_block=sanitized.retrieved_block,
        case_context=sanitized.case_context,
        privacy_mode=sanitized.mode,
        privacy_meta=sanitized.privacy_meta,
    )
    ticket_token = set_egress_ticket(sanitized.egress_ticket)
    t0 = time.perf_counter()
    try:
        if upload_local:
            if sanitized.mode != PrivacyMode.STANDARD and sanitized.document_text is None:
                raise JuriaAPIError(
                    "Privacy processing could not sanitize the document. "
                    "Raw file content was not sent to the AI provider."
                )
            api_out = analyze_document(
                upload_local,
                upload_type,
                sanitized.message_text,
                document_text=sanitized.document_text,
                require_text_only=(sanitized.mode != PrivacyMode.STANDARD),
                **kwargs,
            )
            content = format_analysis_response(api_out)
            tokens = int(api_out.get("tokens_used") or 0)
            juria_mid = str(api_out.get("message_id") or "")
            analysis = api_out.get("structured") or {}
            if sanitized.privacy_meta:
                analysis = {**analysis, "privacy": sanitized.privacy_meta}
            content, analysis = finalize_assistant_payload(
                content, analysis, ctx["retrieved"], language, mode="CONTRACT_ANALYSIS"
            )
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            log_privacy_event(
                cabinet=cabinet,
                actor=user,
                action=PrivacyAuditAction.AI_REQUEST_SENT,
                message="AI request sent (sanitized)",
                project=project,
                session=sanitized.session,
                extra={"mode": sanitized.mode},
            )
            log_privacy_event(
                cabinet=cabinet,
                actor=user,
                action=PrivacyAuditAction.AI_RESPONSE_RECEIVED,
                message="AI response received",
                project=project,
                session=sanitized.session,
                extra={"mode": sanitized.mode, "tokens": tokens},
            )
            record_juria_usage(user, messages_delta=2, tokens_delta=tokens, contract_analyses_delta=1)
            return content, tokens, juria_mid, [], analysis, ctx["retrieved"], elapsed_ms

        api_out = send_chat_message(
            sanitized.history,
            sanitized.message_text,
            mode=mode,
            **kwargs,
        )
        content = api_out.get("content") or ""
        tokens = int(api_out.get("tokens_used") or 0)
        juria_mid = str(api_out.get("message_id") or "")
        suggestions = list(api_out.get("suggestions") or [])
        analysis = {}
        if sanitized.privacy_meta:
            analysis["privacy"] = sanitized.privacy_meta
        content, analysis = finalize_assistant_payload(
            content, analysis, ctx["retrieved"], language, mode=mode
        )
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        log_privacy_event(
            cabinet=cabinet,
            actor=user,
            action=PrivacyAuditAction.AI_REQUEST_SENT,
            message="AI request sent (sanitized)",
            project=project,
            session=sanitized.session,
            extra={"mode": sanitized.mode},
        )
        log_privacy_event(
            cabinet=cabinet,
            actor=user,
            action=PrivacyAuditAction.AI_RESPONSE_RECEIVED,
            message="AI response received",
            project=project,
            session=sanitized.session,
            extra={"mode": sanitized.mode, "tokens": tokens},
        )
        research_delta = 1 if mode == JuriaConversation.Mode.LEGAL_RESEARCH else 0
        record_juria_usage(user, messages_delta=2, tokens_delta=tokens, research_queries_delta=research_delta)
        return content, tokens, juria_mid, suggestions, analysis, ctx["retrieved"], elapsed_ms
    finally:
        reset_egress_ticket(ticket_token)


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
    need_title = should_auto_title_thread(thread)
    thread.mode = mode
    thread.save(update_fields=["mode", "updated_at"])
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
    if need_title and (message_text or "").strip():
        # Title LLM only after successful AI egress (failure-closed: no side-call on gateway block)
        title_pool = ThreadPoolExecutor(max_workers=1)
        try:
            title_future = title_pool.submit(
                generate_conversation_title,
                message_text,
                language=language,
                jurisdiction_code=getattr(project, "jurisdiction_code", None),
            )
            generated = ""
            try:
                generated = title_future.result(timeout=8) or ""
            except Exception as exc:
                logger.warning("Juria title generation did not finish: %s", exc)
            apply_auto_title(
                thread,
                project,
                generated or fallback_title_from_message(message_text, language),
            )
        finally:
            title_pool.shutdown(wait=False)
    else:
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
