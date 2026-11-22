"""
P3 JURIA dashboard assist: daily briefing + NL ask over authorized queues.

Reuses Privacy Gateway + LLM provider. Never claims vector RAG.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from django.conf import settings
from django.utils import timezone

from .assist_context import CAVEATS, build_assist_context, rank_sources

logger = logging.getLogger(__name__)


class AssistUnavailable(Exception):
    """Juria disabled / not configured / privacy blocked."""

    def __init__(self, detail: str, *, code: str = "juria_unavailable", status: int = 503):
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status = status


def _ensure_juria_ready() -> None:
    from juria.services.juria_api_service import provider_configured

    if not getattr(settings, "JURIA_ENABLED", False):
        raise AssistUnavailable("Juria is disabled.")
    if not provider_configured():
        raise AssistUnavailable("Juria is not configured. Set the provider API key on the server.")


def _retrieval_meta() -> dict[str, str]:
    return {
        "method": "dashboard_queues_keyword",
        "description": (
            "Answers use KPI counts and item titles from your role-scoped dashboard "
            "overview. Matching uses token overlap, not embeddings or firm corpus search."
        ),
    }


def _call_llm(
    *,
    user,
    cabinet,
    message_text: str,
    retrieved_block: str,
    instructions: str,
    language: str,
) -> tuple[str, int]:
    from juria.services.juria_api_service import JuriaAPIError, send_chat_message
    from privacy.services.egress import reset_egress_ticket, set_egress_ticket
    from privacy.services.gateway import PrivacyGatewayError, sanitize_for_ai
    from subscriptions.services.credits import (
        commit_reservation,
        operation_for_mode,
        release_reservation,
        reserve_for_operation,
    )

    try:
        sanitized = sanitize_for_ai(
            user=user,
            cabinet=cabinet,
            message_text=message_text,
            retrieved_block=retrieved_block,
            instructions=instructions,
        )
    except PrivacyGatewayError as exc:
        raise AssistUnavailable(str(exc), code="privacy_blocked", status=403) from exc

    reservation = reserve_for_operation(
        user=user,
        cabinet=cabinet,
        operation=operation_for_mode("CHAT"),
        idempotency_key=f"dashboard-assist:{user.id}:{uuid.uuid4().hex}",
    )
    ticket = set_egress_ticket(sanitized.egress_ticket)
    try:
        jurisdiction = None
        jur = getattr(cabinet, "jurisdiction", None)
        if jur is not None:
            jurisdiction = getattr(jur, "code", None)
        result = send_chat_message(
            [],
            sanitized.message_text,
            mode="CHAT",
            language=language,
            jurisdiction_code=jurisdiction,
            instructions=sanitized.instructions,
            retrieved_block=sanitized.retrieved_block,
            privacy_mode=sanitized.mode,
            privacy_meta=sanitized.privacy_meta,
        )
        content = (result.get("content") or "").strip()
        tokens = int(result.get("tokens_used") or 0)
        commit_reservation(reservation, input_tokens=tokens, output_tokens=0)
        return content, tokens
    except JuriaAPIError as exc:
        release_reservation(reservation)
        raise AssistUnavailable(str(exc), code="juria_provider_error", status=502) from exc
    except Exception:
        release_reservation(reservation)
        raise
    finally:
        reset_egress_ticket(ticket)


def generate_daily_briefing(*, user, cabinet, language: str = "fr", request=None) -> dict[str, Any]:
    """Read-only daily briefing over authorized dashboard queues."""
    _ensure_juria_ready()
    ctx = build_assist_context(user=user, cabinet=cabinet, request=request)
    instructions = (
        "You are JURE's read-only practice briefing assistant. "
        "Summarize ONLY the facts and numbered sources provided. "
        "Produce a short daily briefing (5–8 bullets) covering: urgent overdue items, "
        "today's tasks/appointments, upcoming deadlines, and CRM follow-ups if present. "
        "Do not invent matters, clients, or counts. Do not suggest sending email or "
        "changing records. If a section is empty, say so briefly. "
        "Cite source numbers like [1] when referring to a specific item."
    )
    text, tokens = _call_llm(
        user=user,
        cabinet=cabinet,
        message_text="Produce today's practice briefing from the provided dashboard context.",
        retrieved_block=ctx["text_pack"],
        instructions=instructions,
        language=language or "fr",
    )
    return {
        "kind": "briefing",
        "text": text,
        "caveats": list(CAVEATS),
        "retrieval": _retrieval_meta(),
        "sources": ctx["sources"][:20],
        "facts": ctx["facts"],
        "meta": {
            "role": ctx["facts"].get("role"),
            "scope": ctx["facts"].get("scope"),
            "as_of": timezone.now().isoformat(),
            "language": language or "fr",
            "tokens_used": tokens,
        },
    }


def answer_dashboard_query(
    *,
    user,
    cabinet,
    question: str,
    language: str = "fr",
    request=None,
) -> dict[str, Any]:
    """NL ask over authorized dashboard facts (keyword-ranked sources + LLM)."""
    _ensure_juria_ready()
    q = (question or "").strip()
    if len(q) < 2:
        raise AssistUnavailable("Question is too short.", code="question_required", status=400)
    if len(q) > 2000:
        raise AssistUnavailable("Question is too long.", code="question_too_long", status=400)

    ctx = build_assist_context(user=user, cabinet=cabinet, request=request)
    ranked = rank_sources(q, ctx["sources"], limit=10)
    # Always include KPI line block for count questions
    retrieved_parts = [
        f"Dashboard scope={ctx['facts'].get('scope')} role={ctx['facts'].get('role')}",
        "KPI counts: "
        + ", ".join(
            f"{k}={v}" for k, v in (ctx["facts"].get("kpis") or {}).items() if v is not None
        ),
    ]
    for i, s in enumerate(ranked, start=1):
        retrieved_parts.append(f"[{i}] {s.get('text')}")
    retrieved_block = "\n".join(retrieved_parts)

    instructions = (
        "You answer questions about the user's JURE dashboard using ONLY the provided "
        "KPI counts and numbered sources. If the answer is not in the context, say you "
        "cannot tell from the current dashboard queues. Never invent data. Never claim "
        "semantic or firm-wide document search. Keep answers concise. Cite [n] when useful."
    )
    text, tokens = _call_llm(
        user=user,
        cabinet=cabinet,
        message_text=q,
        retrieved_block=retrieved_block,
        instructions=instructions,
        language=language or "fr",
    )
    return {
        "kind": "answer",
        "question": q,
        "text": text,
        "caveats": list(CAVEATS),
        "retrieval": _retrieval_meta(),
        "sources": ranked,
        "facts": ctx["facts"],
        "meta": {
            "role": ctx["facts"].get("role"),
            "scope": ctx["facts"].get("scope"),
            "as_of": timezone.now().isoformat(),
            "language": language or "fr",
            "tokens_used": tokens,
        },
    }
