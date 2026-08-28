"""Consultation activity / audit helpers using dashboard.ActivityLog."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def log_consultation_activity(
    case,
    kind: str,
    message: str,
    *,
    actor=None,
    previous_value=None,
    new_value=None,
) -> None:
    if not getattr(case, "cabinet_id", None):
        return
    try:
        from dashboard.models import ActivityLog

        ActivityLog.objects.create(
            cabinet_id=case.cabinet_id,
            kind=kind,
            message=message[:255],
            actor=actor,
            entity_type="consultation",
            entity_id=str(case.id),
            previous_value=previous_value,
            new_value=new_value,
        )
    except Exception:
        logger.exception("Failed to write consultation activity kind=%s case=%s", kind, getattr(case, "id", None))


def consultation_activity_payload(case) -> list[dict]:
    if not getattr(case, "cabinet_id", None):
        return []
    try:
        from dashboard.models import ActivityLog

        rows = (
            ActivityLog.objects.filter(
                cabinet_id=case.cabinet_id,
                entity_type="consultation",
                entity_id=str(case.id),
            )
            .select_related("actor")
            .order_by("-created")[:80]
        )
        out = []
        for row in rows:
            actor = row.actor
            out.append(
                {
                    "id": row.id,
                    "kind": row.kind,
                    "message": row.message,
                    "created": row.created.isoformat() if row.created else None,
                    "actor": (
                        {
                            "id": actor.id,
                            "first_name": actor.first_name,
                            "last_name": actor.last_name,
                            "email": actor.email,
                        }
                        if actor
                        else None
                    ),
                    "previous_value": row.previous_value,
                    "new_value": row.new_value,
                }
            )
        return out
    except Exception:
        logger.exception("Failed to load consultation activity case=%s", getattr(case, "id", None))
        return []
