"""Temporary meeting-chat cleanup for video appointments."""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from chat.models import Conversation, ConversationMembership
from tasks.models import Appointment

logger = logging.getLogger(__name__)


def delete_temporary_conversation(conversation: Conversation | None) -> bool:
    """Hard-delete a temporary meeting conversation and clear appointment links."""
    if conversation is None or not conversation.is_temporary:
        return False
    with transaction.atomic():
        Appointment.objects.filter(conversation=conversation).update(conversation=None)
        # Clear reverse OneToOne before delete to avoid SET_NULL race noise.
        Conversation.objects.filter(pk=conversation.pk).update(temporary_for_appointment=None)
        conversation.delete()
    return True


def cleanup_temporary_conversation_for_appointment(appointment: Appointment) -> bool:
    """Delete the temp chat linked to this appointment if any."""
    conversation = None
    try:
        conversation = appointment.temporary_conversation
    except Conversation.DoesNotExist:
        conversation = None
    if conversation is None and appointment.conversation_id:
        linked = appointment.conversation
        if linked and linked.is_temporary:
            conversation = linked
    return delete_temporary_conversation(conversation)


def maybe_cleanup_appointment_meeting_chat(appointment: Appointment) -> bool:
    """
    Delete temporary chat when appointment is done/cancelled or past end_at.
    Returns True if a conversation was deleted.
    """
    if not appointment:
        return False
    ended = appointment.status in (
        Appointment.Status.DONE,
        Appointment.Status.CANCELLED,
    )
    past_end = appointment.end_at is not None and appointment.end_at < timezone.now()
    if not (ended or past_end):
        return False
    return cleanup_temporary_conversation_for_appointment(appointment)


def cleanup_expired_temporary_meeting_chats() -> int:
    """Sweep ended appointments that still have temporary meeting chats."""
    now = timezone.now()
    qs = (
        Conversation.objects.filter(is_temporary=True)
        .select_related('temporary_for_appointment')
        .filter(
            # Prefer the explicit link; also catch appointment FK on appointment.conversation
        )
    )
    deleted = 0
    for convo in qs.iterator():
        appt = convo.temporary_for_appointment
        if appt is None:
            # Orphan temporary chat — remove
            if delete_temporary_conversation(convo):
                deleted += 1
            continue
        if maybe_cleanup_appointment_meeting_chat(appt):
            deleted += 1

    # Also catch appointments whose conversation is temporary but OneToOne link missing
    linked = (
        Appointment.objects.filter(
            conversation__is_temporary=True,
            conversation__isnull=False,
        )
        .filter(
            # ended or past end
        )
        .select_related('conversation')
    )
    for appt in linked.iterator():
        if appt.status in (Appointment.Status.DONE, Appointment.Status.CANCELLED) or (
            appt.end_at and appt.end_at < now
        ):
            if maybe_cleanup_appointment_meeting_chat(appt):
                deleted += 1
    return deleted


def sync_conversation_members(conversation: Conversation, users, *, admin_user=None) -> None:
    """Ensure all given users are active members; mark admin_user as admin."""
    ids = set()
    for user in users or []:
        if user is None:
            continue
        pk = getattr(user, 'pk', user)
        ids.add(pk)
        membership, _ = ConversationMembership.objects.get_or_create(
            conversation=conversation,
            user_id=pk,
        )
        if membership.is_deleted:
            membership.is_deleted = False
            membership.save(update_fields=['is_deleted'])
    if admin_user is not None:
        membership, _ = ConversationMembership.objects.get_or_create(
            conversation=conversation,
            user=admin_user,
        )
        changed = False
        if membership.is_deleted:
            membership.is_deleted = False
            changed = True
        if not membership.is_admin:
            membership.is_admin = True
            changed = True
        if changed:
            membership.save(update_fields=['is_deleted', 'is_admin'])
