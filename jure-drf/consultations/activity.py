from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def log_consultation_request_activity(
    consultation,
    kind: str,
    message: str,
    *,
    actor=None,
    previous_value=None,
    new_value=None,
) -> None:
    if not getattr(consultation, "cabinet_id", None):
        return
    try:
        from dashboard.models import ActivityLog

        ActivityLog.objects.create(
            cabinet_id=consultation.cabinet_id,
            kind=kind,
            message=message[:255],
            actor=actor,
            entity_type="consultation_request",
            entity_id=str(consultation.id),
            previous_value=previous_value,
            new_value=new_value,
        )
    except Exception:
        logger.exception(
            "Failed to write consultation_request activity kind=%s id=%s",
            kind,
            getattr(consultation, "id", None),
        )
