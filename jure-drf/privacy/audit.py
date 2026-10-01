"""Safe privacy audit logging — counts and tokens only, never raw PII."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def log_privacy_event(
    *,
    cabinet,
    actor=None,
    action: str,
    message: str,
    project=None,
    session=None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Write ActivityLog (+ optional JuriaActivity). Never include originals or ciphertext."""
    if cabinet is None:
        return
    safe_extra = _sanitize_extra(extra or {})
    entity_id = ""
    if session is not None:
        entity_id = str(session.id)
    elif project is not None:
        entity_id = str(getattr(project, "id", ""))

    try:
        from dashboard.models import ActivityLog

        ActivityLog.objects.create(
            cabinet_id=cabinet.id if hasattr(cabinet, "id") else cabinet,
            kind=action[:50],
            message=(message or action)[:255],
            actor=actor if getattr(actor, "pk", None) else None,
            entity_type="privacy",
            entity_id=entity_id[:64],
            previous_value=None,
            new_value=safe_extra or None,
        )
    except Exception:
        logger.exception("Failed to write privacy ActivityLog action=%s", action)

    if project is not None:
        try:
            from juria.services.activity import log_activity

            meta = {"privacy_action": action, **safe_extra}
            if session is not None:
                meta["session_id"] = str(session.id)
            log_activity(project, actor, action[:64], **meta)
        except Exception:
            logger.exception("Failed to write privacy JuriaActivity action=%s", action)


_FORBIDDEN_KEYS = frozenset(
    {
        "value",
        "original",
        "plaintext",
        "encrypted_value",
        "ciphertext",
        "email",
        "phone",
        "cin",
        "name",
        "content",
        "text",
        "document",
        "mapping",
    }
)


def _sanitize_extra(extra: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, val in extra.items():
        lk = str(key).lower()
        if lk in _FORBIDDEN_KEYS or any(f in lk for f in ("password", "secret", "token_value")):
            continue
        if isinstance(val, dict):
            out[key] = _sanitize_extra(val)
        elif isinstance(val, (str, int, float, bool)) or val is None:
            # Allow entity_counts dict values via recursion; strings must not look like PII dumps
            if isinstance(val, str) and len(val) > 200:
                out[key] = val[:200] + "…"
            else:
                out[key] = val
        elif isinstance(val, list):
            # Only allow simple scalars / short token strings like [PERSON_001]
            cleaned = []
            for item in val[:50]:
                if isinstance(item, (int, float, bool)):
                    cleaned.append(item)
                elif isinstance(item, str) and len(item) <= 64:
                    cleaned.append(item)
            out[key] = cleaned
    return out
