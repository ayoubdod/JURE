"""Privacy Gateway — single entry point for JURIA AI egress sanitization."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from privacy.audit import log_privacy_event
from privacy.constants import PrivacyAuditAction, PrivacyMode
from privacy.models import PseudonymMappingSession
from privacy.services.crypto import PrivacyCryptoError
from privacy.services.policy import ResolvedPrivacyPolicy, assert_mode_operable, resolve_privacy_mode
from privacy.services.pseudonymizer import PseudonymizeError, pseudonymize_text


class PrivacyGatewayError(Exception):
    """Failure-closed: do not send raw content to the AI provider."""


@dataclass
class SanitizedAiContext:
    """Sanitized payload ready for JURIA; mapping stays inside JURE."""

    mode: str
    session: PseudonymMappingSession | None
    message_text: str
    history: list[dict[str, str]]
    case_context: dict[str, Any] | None
    retrieved_block: str | None
    instructions: str | None
    document_text: str | None = None
    entity_counts: dict[str, int] = field(default_factory=dict)
    privacy_meta: dict[str, Any] = field(default_factory=dict)
    egress_ticket: str = ""  # proof for transport guard


# Narrative case fields that often contain PII
_CASE_NARRATIVE_KEYS = ("description", "legalArguments", "title")


def _jurisdiction_for(cabinet, project=None) -> str:
    if project is not None and getattr(project, "jurisdiction_code", None):
        return (project.jurisdiction_code or "").upper()
    if cabinet is not None:
        jur = getattr(cabinet, "jurisdiction", None)
        if jur is not None and getattr(jur, "code", None):
            return jur.code.upper()
    return "MA"


def _collect_known_entities(project=None, case=None) -> list[tuple[str, str]]:
    """Boost detector with linked client/matter names without logging them."""
    from privacy.constants import EntityType

    known: list[tuple[str, str]] = []
    case_obj = case
    if case_obj is None and project is not None:
        case_obj = getattr(project, "linked_case", None)
    if case_obj is None:
        return known
    client = getattr(case_obj, "client", None)
    if client is not None:
        name = f"{getattr(client, 'first_name', '') or ''} {getattr(client, 'last_name', '') or ''}".strip()
        if name:
            known.append((EntityType.PERSON, name))
        email = getattr(client, "email", None) or ""
        if email:
            known.append((EntityType.EMAIL, email))
        phone = str(getattr(client, "phone", "") or "")
        if phone and phone not in ("", "None"):
            known.append((EntityType.PHONE, phone))
    return known


def _sanitize_string(
    value: str,
    *,
    session: PseudonymMappingSession,
    jurisdiction: str,
    known_entities: list[tuple[str, str]],
) -> tuple[str, dict[str, int]]:
    result = pseudonymize_text(
        value,
        session=session,
        jurisdiction=jurisdiction,
        known_entities=known_entities,
    )
    return result.sanitized_text, result.entity_counts


def sanitize_for_ai(
    *,
    user,
    cabinet,
    project=None,
    case=None,
    message_text: str = "",
    history: list[dict[str, str]] | None = None,
    case_context: dict[str, Any] | None = None,
    retrieved_block: str | None = None,
    instructions: str | None = None,
    document_text: str | None = None,
    has_documents: bool = False,
) -> SanitizedAiContext:
    """
    Apply privacy policy and optionally pseudonymize all outbound text fields.

    Failure-closed: raises PrivacyGatewayError instead of returning raw content
    when Pseudonymized/Private processing cannot complete.
    """
    history = list(history or [])
    has_retrieved = bool((retrieved_block or "").strip())
    has_narrative = bool(
        case_context
        and any(str(case_context.get(k) or "").strip() for k in _CASE_NARRATIVE_KEYS)
    )
    resolved: ResolvedPrivacyPolicy = resolve_privacy_mode(
        cabinet=cabinet,
        project=project,
        case=case,
        has_documents=has_documents or bool(document_text),
        has_retrieved_context=has_retrieved,
        has_case_narrative=has_narrative,
    )

    try:
        assert_mode_operable(resolved.mode)
    except PrivacyGatewayError:
        log_privacy_event(
            cabinet=cabinet,
            actor=user,
            action=PrivacyAuditAction.PRIVACY_GATEWAY_BLOCKED,
            message="Privacy gateway blocked AI egress",
            project=project,
            extra={"mode": resolved.mode, "source": resolved.source},
        )
        raise

    if resolved.mode == PrivacyMode.STANDARD:
        return SanitizedAiContext(
            mode=PrivacyMode.STANDARD,
            session=None,
            message_text=message_text or "",
            history=history,
            case_context=case_context,
            retrieved_block=retrieved_block,
            instructions=instructions,
            document_text=document_text,
            entity_counts={},
            privacy_meta={
                "pseudonymized": False,
                "original_identifiers_available": True,
                "mode": PrivacyMode.STANDARD,
                "source": resolved.source,
            },
            egress_ticket="STANDARD",
        )

    # PRIVATE is operable only when configured (assert_mode_operable); treat like
    # Pseudonymized text path until a dedicated private provider exists.
    jurisdiction = _jurisdiction_for(cabinet, project)
    if cabinet is None:
        raise PrivacyGatewayError("Cabinet is required for Pseudonymized mode.")

    session = PseudonymMappingSession.objects.create(
        cabinet=cabinet,
        project=project,
        case=case or (getattr(project, "linked_case", None) if project else None),
        created_by=user if getattr(user, "is_authenticated", False) else None,
        jurisdiction_code=jurisdiction,
        mode=resolved.mode,
        entity_counts={},
    )

    log_privacy_event(
        cabinet=cabinet,
        actor=user,
        action=PrivacyAuditAction.PRIVACY_SCAN_STARTED,
        message="Privacy scan started",
        project=project,
        session=session,
        extra={"mode": resolved.mode, "jurisdiction": jurisdiction},
    )

    known = _collect_known_entities(project=project, case=case)
    entity_counts: dict[str, int] = {}

    try:
        sanitized_message, counts = _sanitize_string(
            message_text or "",
            session=session,
            jurisdiction=jurisdiction,
            known_entities=known,
        )
        entity_counts.update(counts)

        sanitized_history: list[dict[str, str]] = []
        for turn in history:
            content = turn.get("content") or ""
            role = turn.get("role") or "user"
            scrubbed, counts = _sanitize_string(
                content,
                session=session,
                jurisdiction=jurisdiction,
                known_entities=known,
            )
            for k, v in counts.items():
                entity_counts[k] = entity_counts.get(k, 0) + v
            sanitized_history.append({"role": role, "content": scrubbed})

        sanitized_case = None
        if case_context:
            sanitized_case = dict(case_context)
            for key in _CASE_NARRATIVE_KEYS:
                val = sanitized_case.get(key)
                if val is not None and str(val).strip():
                    scrubbed, counts = _sanitize_string(
                        str(val),
                        session=session,
                        jurisdiction=jurisdiction,
                        known_entities=known,
                    )
                    sanitized_case[key] = scrubbed
                    for k, v in counts.items():
                        entity_counts[k] = entity_counts.get(k, 0) + v

        sanitized_retrieved = retrieved_block
        if retrieved_block:
            sanitized_retrieved, counts = _sanitize_string(
                retrieved_block,
                session=session,
                jurisdiction=jurisdiction,
                known_entities=known,
            )
            for k, v in counts.items():
                entity_counts[k] = entity_counts.get(k, 0) + v

        sanitized_instructions = instructions
        if instructions:
            sanitized_instructions, counts = _sanitize_string(
                instructions,
                session=session,
                jurisdiction=jurisdiction,
                known_entities=known,
            )
            for k, v in counts.items():
                entity_counts[k] = entity_counts.get(k, 0) + v

        sanitized_doc = document_text
        if document_text:
            sanitized_doc, counts = _sanitize_string(
                document_text,
                session=session,
                jurisdiction=jurisdiction,
                known_entities=known,
            )
            for k, v in counts.items():
                entity_counts[k] = entity_counts.get(k, 0) + v
            log_privacy_event(
                cabinet=cabinet,
                actor=user,
                action=PrivacyAuditAction.DOCUMENT_PSEUDONYMIZED,
                message="Document text pseudonymized for AI",
                project=project,
                session=session,
                extra={"entity_counts": dict(session.entity_counts)},
            )

    except (PseudonymizeError, PrivacyCryptoError) as exc:
        log_privacy_event(
            cabinet=cabinet,
            actor=user,
            action=PrivacyAuditAction.PRIVACY_GATEWAY_BLOCKED,
            message="Privacy processing failed — AI egress blocked",
            project=project,
            session=session,
            extra={"error_type": type(exc).__name__},
        )
        raise PrivacyGatewayError(
            "Privacy processing failed. Raw content was not sent to the AI provider."
        ) from exc
    except Exception as exc:
        log_privacy_event(
            cabinet=cabinet,
            actor=user,
            action=PrivacyAuditAction.PRIVACY_GATEWAY_BLOCKED,
            message="Unexpected privacy gateway failure — AI egress blocked",
            project=project,
            session=session,
            extra={"error_type": type(exc).__name__},
        )
        raise PrivacyGatewayError(
            "Privacy processing failed. Raw content was not sent to the AI provider."
        ) from exc

    session.refresh_from_db(fields=["entity_counts"])
    log_privacy_event(
        cabinet=cabinet,
        actor=user,
        action=PrivacyAuditAction.PII_DETECTED,
        message="PII entities detected",
        project=project,
        session=session,
        extra={"entity_counts": dict(session.entity_counts)},
    )
    log_privacy_event(
        cabinet=cabinet,
        actor=user,
        action=PrivacyAuditAction.AI_REQUEST_SANITIZED,
        message="AI request sanitized",
        project=project,
        session=session,
        extra={"mode": resolved.mode, "entity_counts": dict(session.entity_counts)},
    )

    return SanitizedAiContext(
        mode=resolved.mode,
        session=session,
        message_text=sanitized_message,
        history=sanitized_history,
        case_context=sanitized_case,
        retrieved_block=sanitized_retrieved,
        instructions=sanitized_instructions,
        document_text=sanitized_doc,
        entity_counts=dict(session.entity_counts),
        privacy_meta={
            "pseudonymized": True,
            "original_identifiers_available": False,
            "mode": resolved.mode,
            "session_id": str(session.id),
            "entity_counts": dict(session.entity_counts),
            "source": resolved.source,
        },
        egress_ticket=f"PSEUDONYMIZED:{session.id}",
    )
