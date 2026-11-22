"""Invalidate dashboard overview cache when operational data changes."""
from __future__ import annotations

from django.db.models.signals import post_delete, post_save


def _cabinet_id_from_instance(instance) -> int | None:
    cid = getattr(instance, "cabinet_id", None)
    if cid:
        return int(cid)
    cab = getattr(instance, "cabinet", None)
    if cab is not None and getattr(cab, "id", None):
        return int(cab.id)
    # Notifications: recipient's cabinet
    recipient = getattr(instance, "recipient", None)
    if recipient is not None:
        return getattr(recipient, "cabinet_id", None)
    return None


def _invalidate(sender=None, instance=None, **kwargs) -> None:
    from dashboard.services.overview_cache import invalidate_cabinet_overview

    if instance is None:
        return
    invalidate_cabinet_overview(_cabinet_id_from_instance(instance))


def connect_overview_cache_invalidation() -> None:
    from cases.models import Case
    from conflict_checks.models import ConflictCheck
    from notifications.models import Notification
    from tasks.models import Appointment, Task

    for model in (Case, Task, Appointment, ConflictCheck, Notification):
        post_save.connect(_invalidate, sender=model, dispatch_uid=f"dash_ov_cache_save_{model.__name__}")
        post_delete.connect(
            _invalidate, sender=model, dispatch_uid=f"dash_ov_cache_del_{model.__name__}"
        )
