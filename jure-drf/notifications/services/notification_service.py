from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from notifications.constants import NotificationPriority
from notifications.models import Notification

logger = logging.getLogger(__name__)


def _serialize_related_user(user) -> dict[str, Any] | None:
    if not user:
        return None
    return {
        "id": user.id,
        "firstName": getattr(user, "first_name", "") or "",
        "lastName": getattr(user, "last_name", "") or "",
    }


def _serialize_related_case(case) -> dict[str, Any] | None:
    if not case:
        return None
    return {
        "id": case.id,
        "reference": case.reference,
        "title": case.title,
    }


def _serialize_related_task(task) -> dict[str, Any] | None:
    if not task:
        return None
    return {"id": task.id, "title": task.title}


def _serialize_related_appointment(appt) -> dict[str, Any] | None:
    if not appt:
        return None
    return {"id": appt.id, "title": appt.title}


def notification_to_ws_payload(notification: Notification) -> dict[str, Any]:
    obj = (
        Notification.objects.select_related(
            "related_user",
            "related_case",
            "related_task",
            "related_appointment",
        )
        .filter(pk=notification.pk)
        .first()
    )
    if not obj:
        return {}
    return {
        "id": obj.id,
        "type": obj.notification_type,
        "title": obj.title,
        "message": obj.message,
        "priority": obj.priority,
        "is_read": obj.is_read,
        "action_url": obj.action_url or "",
        "created_at": obj.created_at.isoformat(),
        "related_case": _serialize_related_case(obj.related_case),
        "related_task": _serialize_related_task(obj.related_task),
        "related_appointment": _serialize_related_appointment(obj.related_appointment),
        "related_user": _serialize_related_user(obj.related_user),
    }


def push_notification_via_websocket(notification: Notification) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning("No channel layer; skip push for notification %s", notification.pk)
        return
    payload = notification_to_ws_payload(notification)
    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{notification.recipient_id}",
            {
                "type": "notification.new",
                "notification": payload,
            },
        )
        Notification.objects.filter(pk=notification.pk).update(push_sent=True)
    except Exception:
        logger.exception("WebSocket push failed for notification %s", notification.pk)


def _queue_notification_email(notification_id: int) -> None:
    def _run():
        from django.db import close_old_connections

        close_old_connections()
        try:
            from notifications.services.email_service import send_notification_email

            send_notification_email(notification_id)
        finally:
            close_old_connections()

    def _after_commit():
        import threading

        threading.Thread(target=_run, daemon=True).start()

    transaction.on_commit(_after_commit)


def create_notification(
    recipient_id: int,
    notification_type: str,
    title: str,
    message: str,
    priority: str = NotificationPriority.MEDIUM,
    related_case_id=None,
    related_task_id=None,
    related_appointment_id=None,
    related_user_id=None,
    action_url: str = "",
    expires_at=None,
    send_email: bool = True,
) -> Notification:
    notification = Notification.objects.create(
        recipient_id=recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=priority,
        related_case_id=related_case_id,
        related_task_id=related_task_id,
        related_appointment_id=related_appointment_id,
        related_user_id=related_user_id,
        action_url=action_url,
        expires_at=expires_at,
    )
    push_notification_via_websocket(notification)
    if send_email:
        _queue_notification_email(notification.id)
    return notification


def create_bulk_notifications(
    recipient_ids: list[int],
    *,
    notification_type: str,
    title: str,
    message: str,
    priority: str = NotificationPriority.MEDIUM,
    related_case_id=None,
    related_task_id=None,
    related_appointment_id=None,
    related_user_id=None,
    action_url: str = "",
    expires_at=None,
    send_email: bool = True,
) -> list[Notification]:
    created: list[Notification] = []
    now = timezone.now()
    one_hour_ago = now - timedelta(hours=1)
    for rid in recipient_ids:
        if not rid:
            continue
        dup = Notification.objects.filter(
            recipient_id=rid,
            notification_type=notification_type,
            created_at__gte=one_hour_ago,
        )
        if related_case_id:
            dup = dup.filter(related_case_id=related_case_id)
        elif related_task_id:
            dup = dup.filter(related_task_id=related_task_id)
        elif related_appointment_id:
            dup = dup.filter(related_appointment_id=related_appointment_id)
        else:
            dup = dup.filter(
                related_case_id__isnull=True,
                related_task_id__isnull=True,
                related_appointment_id__isnull=True,
            )
        if dup.exists():
            continue
        created.append(
            create_notification(
                recipient_id=rid,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                related_case_id=related_case_id,
                related_task_id=related_task_id,
                related_appointment_id=related_appointment_id,
                related_user_id=related_user_id,
                action_url=action_url,
                expires_at=expires_at,
                send_email=send_email,
            )
        )
    return created


def mark_as_read(notification_id: int, user_id: int) -> Notification | None:
    n = Notification.objects.filter(pk=notification_id, recipient_id=user_id).first()
    if not n:
        return None
    if not n.is_read:
        n.is_read = True
        n.read_at = timezone.now()
        n.save(update_fields=["is_read", "read_at"])
    return n


def mark_all_as_read(user_id: int) -> int:
    return Notification.objects.filter(recipient_id=user_id, is_read=False).update(
        is_read=True,
        read_at=timezone.now(),
    )


def get_unread_count(user_id: int) -> int:
    return Notification.objects.filter(recipient_id=user_id, is_read=False).count()


def notify_case_converted(source_case, new_case, target_type: str) -> None:
    from cases.models import Case
    from notifications.constants import NotificationType

    target_label = dict(Case.CaseType.choices).get(target_type, target_type)
    msg = (
        f'La consultation "{source_case.title}" a été convertie en {target_label}: '
        f'"{new_case.title}" (#{new_case.reference}).'
    )
    recipients = {source_case.assigned_to_id, new_case.assigned_to_id}
    recipients.discard(None)
    for uid in recipients:
        create_notification(
            recipient_id=uid,
            notification_type=NotificationType.CASE_CONVERTED,
            title="Consultation convertie en dossier",
            message=msg,
            priority=NotificationPriority.HIGH,
            related_case_id=new_case.id,
            related_user_id=None,
            action_url=f"/dashboard/cases?case={new_case.reference}",
            send_email=True,
        )
