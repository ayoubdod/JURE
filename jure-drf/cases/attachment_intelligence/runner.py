"""
Background-processing abstraction for attachment OCR.

Assessment (Phase 2):
- No Celery / Huey / RQ worker exists in this repo.
- Redis is present for Channels only; introducing Celery+Redis as a job broker
  would require a second process type and new deploy topology.
- Simplest production-compatible approach:
  1. DB-backed job state on CaseAttachmentIntelligence
  2. Optional daemon thread enqueue after upload (single Daphne process)
  3. Durable `process_case_attachment_intelligence` management command (poller)

Celery can wrap the same process_attachment_intelligence() later without
changing the data model.
"""

from __future__ import annotations

import logging
import threading
from typing import Callable

from django.db import close_old_connections

from . import settings as ocr_settings

logger = logging.getLogger(__name__)


def schedule_intelligence_job(intelligence_id: int) -> None:
    """Schedule processing according to ATTACHMENT_OCR_RUNNER."""
    mode = ocr_settings.runner_mode()
    if mode == "sync":
        _run_job(intelligence_id)
        return
    if mode == "poll_only":
        # Durable worker / cron will pick PENDING rows.
        return
    # Default: thread
    thread = threading.Thread(
        target=_run_job,
        args=(intelligence_id,),
        name=f"att-ocr-{intelligence_id}",
        daemon=True,
    )
    thread.start()


def _run_job(intelligence_id: int) -> None:
    close_old_connections()
    try:
        from .processor import process_attachment_intelligence

        process_attachment_intelligence(intelligence_id)
    except Exception:
        # Never log document contents; exception type/message only.
        logger.exception("Attachment intelligence job failed id=%s", intelligence_id)
    finally:
        close_old_connections()


def run_pending_batch(*, limit: int = 10) -> int:
    """Process up to `limit` claimable PENDING/FAILED/REQUIRED rows (poller)."""
    from cases.models import CaseAttachmentIntelligence
    from juria.constants import OcrStatus

    from .processor import process_attachment_intelligence

    qs = (
        CaseAttachmentIntelligence.objects.filter(
            ocr_status__in=[OcrStatus.PENDING, OcrStatus.REQUIRED, OcrStatus.FAILED],
        )
        .order_by("created")
        .values_list("id", flat=True)[:limit]
    )
    processed = 0
    for pk in list(qs):
        try:
            process_attachment_intelligence(pk)
            processed += 1
        except Exception:
            logger.exception("Poller failed intelligence id=%s", pk)
    return processed


# Hook for tests
_after_schedule: Callable[[int], None] | None = None


def set_after_schedule_hook(hook: Callable[[int], None] | None) -> None:
    global _after_schedule
    _after_schedule = hook
