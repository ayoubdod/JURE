from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _

from chat.models import Conversation, ConversationMembership
from consultations.activity import log_consultation_request_activity
from consultations.models import (
    ConsultationComment,
    ConsultationEvent,
    ConsultationRequest,
)
from notifications.constants import NotificationPriority, NotificationType
from notifications.services.notification_service import create_notification

# Allowed staff-driven transitions. Clients do not change status directly.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    ConsultationRequest.Status.SUBMITTED: {
        ConsultationRequest.Status.UNDER_REVIEW,
        ConsultationRequest.Status.NEEDS_INFORMATION,
        ConsultationRequest.Status.ASSIGNED,
        ConsultationRequest.Status.DECLINED,
    },
    ConsultationRequest.Status.UNDER_REVIEW: {
        ConsultationRequest.Status.NEEDS_INFORMATION,
        ConsultationRequest.Status.ASSIGNED,
        ConsultationRequest.Status.CONFIRMED,
        ConsultationRequest.Status.DECLINED,
    },
    ConsultationRequest.Status.NEEDS_INFORMATION: {
        ConsultationRequest.Status.UNDER_REVIEW,
        ConsultationRequest.Status.ASSIGNED,
        ConsultationRequest.Status.DECLINED,
    },
    ConsultationRequest.Status.ASSIGNED: {
        ConsultationRequest.Status.UNDER_REVIEW,
        ConsultationRequest.Status.CONFIRMED,
        ConsultationRequest.Status.DECLINED,
        ConsultationRequest.Status.NEEDS_INFORMATION,
    },
    ConsultationRequest.Status.CONFIRMED: {
        ConsultationRequest.Status.IN_PROGRESS,
        ConsultationRequest.Status.COMPLETED,
        ConsultationRequest.Status.DECLINED,
    },
    ConsultationRequest.Status.IN_PROGRESS: {
        ConsultationRequest.Status.COMPLETED,
    },
    ConsultationRequest.Status.COMPLETED: set(),
    ConsultationRequest.Status.DECLINED: set(),
}


def _add_event(
    consultation: ConsultationRequest,
    event_type: str,
    *,
    actor=None,
    metadata: dict | None = None,
    client_visible: bool = True,
) -> ConsultationEvent:
    return ConsultationEvent.objects.create(
        consultation=consultation,
        event_type=event_type,
        actor=actor,
        metadata=metadata or {},
        client_visible=client_visible,
    )


def _client_action_url(consultation: ConsultationRequest) -> str:
    return f"/client/consultations/{consultation.id}"


def _staff_action_url(consultation: ConsultationRequest) -> str:
    return f"/dashboard/consultations/{consultation.id}"


def _notify_client(consultation: ConsultationRequest, notification_type: str, title: str, message: str) -> None:
    if not consultation.client_id:
        return
    create_notification(
        recipient_id=consultation.client_id,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=NotificationPriority.MEDIUM,
        related_user_id=consultation.assigned_lawyer_id,
        action_url=_client_action_url(consultation),
        send_email=True,
    )


def _notify_lawyer(consultation: ConsultationRequest, notification_type: str, title: str, message: str) -> None:
    if not consultation.assigned_lawyer_id:
        return
    create_notification(
        recipient_id=consultation.assigned_lawyer_id,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=NotificationPriority.HIGH,
        related_user_id=consultation.client_id,
        action_url=_staff_action_url(consultation),
        send_email=True,
    )


def _notify_cabinet_admins(consultation: ConsultationRequest, title: str, message: str) -> None:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    recipients = User.objects.filter(
        cabinet_id=consultation.cabinet_id,
        is_cabinet_member=True,
        role__in=["OWNER", "ADMIN", "MANAGER"],
        is_active=True,
    ).values_list("id", flat=True)
    owner_id = getattr(consultation.cabinet, "owner_id", None)
    ids = set(recipients)
    if owner_id:
        ids.add(owner_id)
    for rid in ids:
        if rid == consultation.client_id:
            continue
        create_notification(
            recipient_id=rid,
            notification_type=NotificationType.CONSULTATION_SUBMITTED,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            related_user_id=consultation.client_id,
            action_url=_staff_action_url(consultation),
            send_email=False,
        )


def create_consultation_request(
    *,
    client,
    cabinet,
    subject: str,
    legal_area: str,
    description: str,
    preferred_format: str = ConsultationRequest.PreferredFormat.CHAT,
    preferred_datetime: str = "",
    related_case=None,
) -> ConsultationRequest:
    from consultations.services.reference import next_consultation_reference

    if related_case is not None:
        if related_case.client_id != client.id or related_case.cabinet_id != cabinet.id:
            raise ValidationError(_("Related case must belong to you and your cabinet."))

    consultation = ConsultationRequest.objects.create(
        reference=next_consultation_reference(cabinet),
        client=client,
        cabinet=cabinet,
        related_case=related_case,
        subject=subject,
        legal_area=legal_area,
        description=description,
        preferred_format=preferred_format,
        preferred_datetime=preferred_datetime or "",
        status=ConsultationRequest.Status.SUBMITTED,
    )
    _add_event(
        consultation,
        ConsultationEvent.EventType.CREATED,
        actor=client,
        metadata={"reference": consultation.reference},
        client_visible=True,
    )
    log_consultation_request_activity(
        consultation,
        "consultation_created",
        f"Consultation request {consultation.reference} created",
        actor=client,
        new_value={"status": consultation.status},
    )
    _notify_cabinet_admins(
        consultation,
        title=_("New consultation request"),
        message=_("%(client)s submitted: %(subject)s")
        % {
            "client": client.get_full_name() or client.email,
            "subject": subject,
        },
    )
    _notify_client(
        consultation,
        NotificationType.CONSULTATION_SUBMITTED,
        _("Consultation request submitted"),
        _("Your request %(ref)s has been sent to your law firm.")
        % {"ref": consultation.reference},
    )
    return consultation


def change_status(
    consultation: ConsultationRequest,
    new_status: str,
    *,
    actor,
    reason: str = "",
) -> ConsultationRequest:
    old = consultation.status
    if old == new_status:
        return consultation
    allowed = ALLOWED_TRANSITIONS.get(old, set())
    if new_status not in allowed:
        raise ValidationError(
            _("Cannot transition from %(old)s to %(new)s.")
            % {"old": old, "new": new_status}
        )

    consultation.status = new_status
    update_fields = ["status", "modified"]
    if new_status == ConsultationRequest.Status.COMPLETED:
        consultation.completed_at = timezone.now()
        update_fields.append("completed_at")
    consultation.save(update_fields=update_fields)

    _add_event(
        consultation,
        ConsultationEvent.EventType.STATUS_CHANGED,
        actor=actor,
        metadata={"from": old, "to": new_status, "reason": reason},
        client_visible=True,
    )
    log_consultation_request_activity(
        consultation,
        "consultation_status_changed",
        f"Status {old} → {new_status}",
        actor=actor,
        previous_value={"status": old},
        new_value={"status": new_status},
    )

    notif_type = NotificationType.CONSULTATION_STATUS_CHANGED
    if new_status == ConsultationRequest.Status.NEEDS_INFORMATION:
        notif_type = NotificationType.CONSULTATION_NEEDS_INFO
        _add_event(
            consultation,
            ConsultationEvent.EventType.INFORMATION_REQUESTED,
            actor=actor,
            metadata={"reason": reason},
            client_visible=True,
        )
    elif new_status == ConsultationRequest.Status.DECLINED:
        notif_type = NotificationType.CONSULTATION_DECLINED

    _notify_client(
        consultation,
        notif_type,
        _("Consultation status updated"),
        _("Your request %(ref)s is now: %(status)s.")
        % {"ref": consultation.reference, "status": new_status},
    )
    return consultation


def assign_lawyer(
    consultation: ConsultationRequest,
    lawyer,
    *,
    actor,
) -> ConsultationRequest:
    if not getattr(lawyer, "is_cabinet_member", False):
        raise ValidationError(_("Assigned lawyer must be a cabinet team member."))
    lawyer_cabinet = getattr(lawyer, "cabinet_id", None)
    if lawyer_cabinet != consultation.cabinet_id and getattr(consultation.cabinet, "owner_id", None) != lawyer.id:
        raise ValidationError(_("Lawyer must belong to the same cabinet."))

    previous_id = consultation.assigned_lawyer_id
    consultation.assigned_lawyer = lawyer
    update_fields = ["assigned_lawyer", "modified"]
    if consultation.status in (
        ConsultationRequest.Status.SUBMITTED,
        ConsultationRequest.Status.UNDER_REVIEW,
        ConsultationRequest.Status.NEEDS_INFORMATION,
    ):
        consultation.status = ConsultationRequest.Status.ASSIGNED
        update_fields.append("status")
    consultation.save(update_fields=update_fields)

    _add_event(
        consultation,
        ConsultationEvent.EventType.LAWYER_ASSIGNED,
        actor=actor,
        metadata={
            "lawyer_id": lawyer.id,
            "lawyer_name": lawyer.get_full_name() or lawyer.email,
            "previous_lawyer_id": previous_id,
        },
        client_visible=True,
    )
    log_consultation_request_activity(
        consultation,
        "consultation_lawyer_assigned",
        f"Lawyer assigned: {lawyer.get_full_name() or lawyer.email}",
        actor=actor,
        previous_value={"assigned_lawyer_id": previous_id},
        new_value={"assigned_lawyer_id": lawyer.id},
    )
    _notify_lawyer(
        consultation,
        NotificationType.CONSULTATION_ASSIGNED,
        _("Consultation assigned to you"),
        _("You have been assigned to %(ref)s — %(subject)s.")
        % {"ref": consultation.reference, "subject": consultation.subject},
    )
    _notify_client(
        consultation,
        NotificationType.CONSULTATION_ASSIGNED,
        _("A lawyer has been assigned"),
        _("A lawyer has been assigned to your request %(ref)s.")
        % {"ref": consultation.reference},
    )
    return consultation


def _get_or_create_client_lawyer_conversation(
    *,
    client,
    lawyer,
    related_case=None,
) -> Conversation:
    """Create a direct conversation including a portal client (bypasses serializer team-only rule)."""
    existing = (
        Conversation.objects.filter(
            type=Conversation.Type.DIRECT,
            memberships__user=client,
            memberships__is_deleted=False,
        )
        .filter(
            memberships__user=lawyer,
            memberships__is_deleted=False,
        )
        .distinct()
        .first()
    )
    if existing:
        if related_case and not existing.linked_case_id:
            existing.linked_case = related_case
            existing.linked_case_at = timezone.now()
            existing.save(update_fields=["linked_case", "linked_case_at"])
        return existing

    conversation = Conversation.objects.create(
        type=Conversation.Type.DIRECT,
        title="",
        created_by=lawyer,
        linked_case=related_case,
        linked_case_at=timezone.now() if related_case else None,
    )
    ConversationMembership.objects.create(
        conversation=conversation,
        user=lawyer,
        is_admin=True,
    )
    ConversationMembership.objects.create(
        conversation=conversation,
        user=client,
        is_admin=False,
    )
    return conversation


@transaction.atomic
def confirm_consultation(
    consultation: ConsultationRequest,
    *,
    actor,
) -> ConsultationRequest:
    if not consultation.assigned_lawyer_id:
        raise ValidationError(_("Assign a lawyer before confirming the consultation."))

    if consultation.status not in (
        ConsultationRequest.Status.ASSIGNED,
        ConsultationRequest.Status.UNDER_REVIEW,
        ConsultationRequest.Status.CONFIRMED,
    ):
        # Allow confirm from UNDER_REVIEW if lawyer already set; otherwise require ASSIGNED path
        if consultation.status == ConsultationRequest.Status.UNDER_REVIEW and consultation.assigned_lawyer_id:
            pass
        elif consultation.status != ConsultationRequest.Status.CONFIRMED:
            change_status(
                consultation,
                ConsultationRequest.Status.ASSIGNED,
                actor=actor,
            )
            consultation.refresh_from_db()

    old = consultation.status
    conversation = _get_or_create_client_lawyer_conversation(
        client=consultation.client,
        lawyer=consultation.assigned_lawyer,
        related_case=consultation.related_case,
    )
    consultation.conversation = conversation
    consultation.status = ConsultationRequest.Status.CONFIRMED
    consultation.confirmed_at = timezone.now()
    consultation.save(
        update_fields=["conversation", "status", "confirmed_at", "modified"]
    )

    if old != ConsultationRequest.Status.CONFIRMED:
        _add_event(
            consultation,
            ConsultationEvent.EventType.CONFIRMED,
            actor=actor,
            metadata={"conversation_id": conversation.id},
            client_visible=True,
        )
    _add_event(
        consultation,
        ConsultationEvent.EventType.CHAT_ACTIVATED,
        actor=actor,
        metadata={"conversation_id": conversation.id},
        client_visible=True,
    )
    log_consultation_request_activity(
        consultation,
        "consultation_confirmed",
        f"Consultation {consultation.reference} confirmed; chat activated",
        actor=actor,
        previous_value={"status": old},
        new_value={
            "status": consultation.status,
            "conversation_id": conversation.id,
        },
    )
    _notify_client(
        consultation,
        NotificationType.CONSULTATION_CONFIRMED,
        _("Consultation confirmed"),
        _("Your consultation %(ref)s is confirmed. You can join the conversation.")
        % {"ref": consultation.reference},
    )
    _notify_lawyer(
        consultation,
        NotificationType.CONSULTATION_CONFIRMED,
        _("Consultation confirmed"),
        _("Consultation %(ref)s with %(client)s is confirmed.")
        % {
            "ref": consultation.reference,
            "client": consultation.client.get_full_name() or consultation.client.email,
        },
    )
    return consultation


def decline_consultation(
    consultation: ConsultationRequest,
    *,
    actor,
    reason: str = "",
) -> ConsultationRequest:
    return change_status(
        consultation,
        ConsultationRequest.Status.DECLINED,
        actor=actor,
        reason=reason,
    )


def add_comment(
    consultation: ConsultationRequest,
    *,
    author,
    content: str,
    visibility: str,
) -> ConsultationComment:
    from consultations.permissions import is_cabinet_staff, is_portal_client

    if visibility not in ConsultationComment.Visibility.values:
        raise ValidationError(_("Invalid comment visibility."))
    if is_portal_client(author):
        if consultation.client_id != author.id:
            raise ValidationError(_("You cannot comment on this consultation."))
        visibility = ConsultationComment.Visibility.CLIENT
    elif not is_cabinet_staff(author):
        raise ValidationError(_("Not allowed to comment."))

    comment = ConsultationComment.objects.create(
        consultation=consultation,
        author=author,
        content=content,
        visibility=visibility,
    )
    _add_event(
        consultation,
        ConsultationEvent.EventType.COMMENT_ADDED,
        actor=author,
        metadata={
            "comment_id": comment.id,
            "visibility": visibility,
        },
        client_visible=visibility == ConsultationComment.Visibility.CLIENT,
    )
    log_consultation_request_activity(
        consultation,
        "consultation_comment_added",
        f"Comment added ({visibility})",
        actor=author,
        new_value={"visibility": visibility, "comment_id": comment.id},
    )

    if visibility == ConsultationComment.Visibility.CLIENT and is_cabinet_staff(author):
        _notify_client(
            consultation,
            NotificationType.CONSULTATION_COMMENT,
            _("New update from your law firm"),
            content[:200],
        )
    elif visibility == ConsultationComment.Visibility.CLIENT and is_portal_client(author):
        if consultation.assigned_lawyer_id:
            _notify_lawyer(
                consultation,
                NotificationType.CONSULTATION_COMMENT,
                _("Client replied on consultation"),
                content[:200],
            )
    return comment
