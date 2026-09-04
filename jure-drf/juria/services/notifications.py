"""In-app (and email) notifications for Juria workspace events."""

from __future__ import annotations

from notifications.constants import NotificationPriority, NotificationType
from notifications.services.notification_service import create_notification


def notify_juria_member_invited(*, project, invitee, inviter) -> None:
    if invitee is None or inviter is None:
        return
    if invitee.id == inviter.id:
        return
    name = (project.name or "").strip() or "Juria"
    inviter_name = f"{inviter.first_name} {inviter.last_name}".strip() or inviter.email
    create_notification(
        recipient_id=invitee.id,
        notification_type=NotificationType.JURIA_MEMBER_INVITED,
        title=f"Juria · {name}"[:200],
        message=f"{inviter_name} vous a ajouté au projet Juria « {name} ».",
        priority=NotificationPriority.HIGH,
        related_user_id=inviter.id,
        action_url=f"/dashboard/juria?p={project.id}",
        send_email=True,
    )
