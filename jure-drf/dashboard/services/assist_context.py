"""
Build a compact, scope-aware context pack from dashboard queues for JURIA assist.

This is NOT firm-wide corpus search and NOT vector RAG — only overview facts
the caller is already authorized to see.
"""
from __future__ import annotations

import re
from typing import Any

from django.conf import settings

from .overview import build_overview_payload

STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "en", "au", "aux",
    "ce", "cet", "cette", "ces", "the", "a", "an", "of", "and", "or", "to", "in",
    "pour", "par", "sur", "avec", "dans", "que", "qui", "quoi", "dont", "how", "many",
    "what", "quels", "quelles", "combien", "est", "are", "is", "my", "mes", "mon",
}


def _tokenize(text: str) -> list[str]:
    return [
        t
        for t in re.findall(r"[A-Za-zÀ-ÿ0-9]{3,}", (text or "").lower())
        if t not in STOPWORDS
    ]


def _kpi_value(kpis: dict, key: str) -> int | None:
    entry = (kpis or {}).get(key)
    if isinstance(entry, dict) and "value" in entry:
        try:
            return int(entry["value"])
        except (TypeError, ValueError):
            return None
    if isinstance(entry, (int, float)):
        return int(entry)
    return None


def build_assist_context(*, user, cabinet, request=None) -> dict[str, Any]:
    """Return structured facts + flat source lines for keyword matching / LLM."""
    from django.conf import settings as dj_settings

    overview = build_overview_payload(
        user=user,
        cabinet=cabinet,
        request=request,
        juria_enabled=bool(getattr(dj_settings, "JURIA_ENABLED", False)),
    )
    meta = overview.get("meta") or {}
    kpis = overview.get("kpis") or {}
    attention = overview.get("attention") or []
    my_day = overview.get("my_day") or {}
    crm = overview.get("crm") or {}
    team = overview.get("team")
    conflict_q = overview.get("conflict_review_queue")

    facts: dict[str, Any] = {
        "role": meta.get("role"),
        "scope": meta.get("scope"),
        "as_of": meta.get("as_of"),
        "kpis": {
            "active_cases": _kpi_value(kpis, "active_cases"),
            "tasks_due_today": _kpi_value(kpis, "tasks_due_today"),
            "tasks_overdue": _kpi_value(kpis, "tasks_overdue"),
            "upcoming_deadlines_7d": _kpi_value(kpis, "upcoming_deadlines_7d"),
            "active_clients": _kpi_value(kpis, "active_clients"),
            "wip_aging_gt_60": _kpi_value(kpis, "wip_aging_gt_60"),
            "stale_matters": crm.get("stale_matters_count"),
            "client_follow_ups": crm.get("client_follow_ups_count"),
        },
    }
    if team is not None:
        facts["team_overdue_total"] = team.get("total")
    if conflict_q is not None:
        facts["conflict_review_pending"] = len(conflict_q)

    sources: list[dict[str, Any]] = []

    def _add(kind: str, item_id: Any, title: str, extra: str = ""):
        title = (title or "").strip() or kind
        text = f"{kind}: {title}" + (f" — {extra}" if extra else "")
        sources.append(
            {
                "kind": kind,
                "id": item_id,
                "title": title,
                "text": text,
            }
        )

    for a in attention[:12]:
        _add(
            a.get("kind") or "attention",
            a.get("id"),
            a.get("title") or "",
            a.get("due_date") or "",
        )
    for t in (my_day.get("tasks_due_today") or [])[:8]:
        _add("task_due_today", t.get("id"), t.get("title") or "", t.get("due_date") or "")
    for t in (my_day.get("tasks_overdue") or [])[:8]:
        _add("task_overdue", t.get("id"), t.get("title") or "", t.get("due_date") or "")
    for ap in (my_day.get("appointments_today") or [])[:6]:
        _add("appointment_today", ap.get("id"), ap.get("title") or "", ap.get("start_at") or "")
    for d in (my_day.get("upcoming_deadlines") or [])[:8]:
        _add(
            "deadline_upcoming",
            d.get("id") or d.get("source_id"),
            d.get("title") or d.get("label") or "Deadline",
            d.get("date") or "",
        )
    for m in (crm.get("stale_matters") or [])[:5]:
        _add("stale_matter", m.get("id"), m.get("title") or "", f"{m.get('days_idle')}d idle")
    for f in (crm.get("client_follow_ups") or [])[:5]:
        _add("client_follow_up", f.get("id"), f.get("name") or "", f"{f.get('days_idle')}d idle")
    if isinstance(conflict_q, list):
        for c in conflict_q[:5]:
            _add(
                "conflict_review",
                c.get("id"),
                c.get("search_query") or "Conflict check",
                c.get("matter_reference") or "",
            )

    lines = [
        f"Dashboard scope={facts['scope']} role={facts['role']} as_of={facts['as_of']}",
        "KPI counts: "
        + ", ".join(f"{k}={v}" for k, v in (facts["kpis"] or {}).items() if v is not None),
    ]
    if "team_overdue_total" in facts:
        lines.append(f"Team overdue total={facts['team_overdue_total']}")
    if "conflict_review_pending" in facts:
        lines.append(f"Conflict review pending={facts['conflict_review_pending']}")
    for i, s in enumerate(sources, start=1):
        lines.append(f"[{i}] {s['text']}")

    return {
        "facts": facts,
        "sources": sources,
        "text_pack": "\n".join(lines),
        "juria_enabled": bool(getattr(settings, "JURIA_ENABLED", False)),
    }


def rank_sources(question: str, sources: list[dict[str, Any]], *, limit: int = 8) -> list[dict[str, Any]]:
    """Token-overlap ranking against dashboard source lines (not vector search)."""
    q_tokens = set(_tokenize(question))
    if not q_tokens:
        return sources[:limit]
    scored = []
    for s in sources:
        chunk_tokens = set(_tokenize(s.get("text") or s.get("title") or ""))
        if not chunk_tokens:
            score = 0.0
        else:
            score = len(q_tokens & chunk_tokens) / max(len(q_tokens), 1)
        scored.append((score, s))
    scored.sort(key=lambda x: (-x[0], str(x[1].get("id"))))
    # Prefer any positive overlap; otherwise return leading sources as weak context
    positive = [s for score, s in scored if score > 0]
    if positive:
        return positive[:limit]
    return sources[:limit]


CAVEATS = [
    "Read-only assist: no emails sent, no tasks/matters created or changed.",
    "Grounded only on your current authorized dashboard queues and KPI counts — "
    "not firm-wide semantic/vector search over documents.",
    "Keyword/token overlap may miss relevant items; verify against the live workspace.",
    "Not legal advice.",
]
