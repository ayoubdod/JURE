"""Group-chat membership helpers (add / remove / admin / leave)."""

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.translation import gettext as _

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from core.utils import get_user_cabinet

from .models import Conversation, ConversationMembership

User = get_user_model()


def cabinet_users_for(user):
    cabinet = get_user_cabinet(user)
    if not cabinet:
        return User.objects.none()
    return User.objects.filter(
        Q(cabinet=cabinet, is_cabinet_member=True) | Q(pk=cabinet.owner_id)
    ).distinct()


def active_memberships(conversation: Conversation):
    return ConversationMembership.objects.filter(conversation=conversation, is_deleted=False)


def active_member_ids(conversation: Conversation) -> list[int]:
    return list(active_memberships(conversation).values_list("user_id", flat=True))


def membership_for(conversation: Conversation, user) -> ConversationMembership | None:
    return active_memberships(conversation).filter(user=user).first()


def is_group_admin(conversation: Conversation, user) -> bool:
    m = membership_for(conversation, user)
    return bool(m and m.is_admin)


def require_group(conversation: Conversation) -> None:
    if conversation.type != Conversation.Type.GROUP:
        raise serializers.ValidationError(_("Only group conversations support this action."))


def require_admin(conversation: Conversation, user) -> ConversationMembership:
    membership = membership_for(conversation, user)
    if not membership:
        raise PermissionDenied(_("You are not a member of this conversation."))
    if not membership.is_admin:
        raise PermissionDenied(_("Only group admins can do this."))
    return membership


def ensure_group_has_admin(conversation: Conversation, *, excluding_user_id=None) -> None:
    qs = active_memberships(conversation)
    if excluding_user_id is not None:
        qs = qs.exclude(user_id=excluding_user_id)
    if qs.filter(is_admin=True).exists():
        return
    successor = qs.order_by("joined_at", "id").first()
    if successor:
        successor.is_admin = True
        successor.save(update_fields=["is_admin"])


def validate_cabinet_users(actor, users: list) -> None:
    cabinet = get_user_cabinet(actor)
    if not cabinet:
        raise serializers.ValidationError(_("You must belong to a cabinet."))
    allowed = set(cabinet_users_for(actor).values_list("pk", flat=True))
    for user in users:
        if user.pk not in allowed:
            raise serializers.ValidationError(_("Participants must belong to your cabinet."))


def add_members(conversation: Conversation, actor, users: list) -> list[ConversationMembership]:
    require_group(conversation)
    if membership_for(conversation, actor) is None:
        raise PermissionDenied(_("You are not a member of this conversation."))
    if not users:
        raise serializers.ValidationError(_("At least one member is required."))
    validate_cabinet_users(actor, users)

    added = []
    for user in users:
        membership, _ = ConversationMembership.objects.get_or_create(
            conversation=conversation,
            user=user,
        )
        if membership.is_deleted:
            membership.is_deleted = False
            membership.archived = False
            membership.save(update_fields=["is_deleted", "archived"])
        added.append(membership)
    return added


def remove_member(conversation: Conversation, actor, target_user) -> None:
    require_group(conversation)
    require_admin(conversation, actor)
    if target_user.pk == actor.pk:
        raise serializers.ValidationError(_("Leave the group instead of removing yourself."))
    target = membership_for(conversation, target_user)
    if not target:
        raise serializers.ValidationError(_("That person is not a member of this group."))
    target.is_deleted = True
    target.is_admin = False
    target.save(update_fields=["is_deleted", "is_admin"])
    ensure_group_has_admin(conversation)


def set_member_admin(conversation: Conversation, actor, target_user, is_admin: bool) -> ConversationMembership:
    require_group(conversation)
    require_admin(conversation, actor)
    target = membership_for(conversation, target_user)
    if not target:
        raise serializers.ValidationError(_("That person is not a member of this group."))
    if not is_admin and target.is_admin:
        remaining_admins = (
            active_memberships(conversation)
            .filter(is_admin=True)
            .exclude(pk=target.pk)
            .exists()
        )
        if not remaining_admins:
            raise serializers.ValidationError(
                _("Promote another admin before removing the last admin.")
            )
    target.is_admin = bool(is_admin)
    target.save(update_fields=["is_admin"])
    return target


def leave_group(conversation: Conversation, user) -> str:
    """
    Soft-leave when others remain. Hard-delete when this is the last active member.
    Returns "left" or "deleted".
    """
    require_group(conversation)
    membership = membership_for(conversation, user)
    if not membership:
        raise serializers.ValidationError(_("You are not a member of this conversation."))
    remaining = active_memberships(conversation).exclude(user=user)
    if remaining.exists():
        membership.is_deleted = True
        membership.is_admin = False
        membership.save(update_fields=["is_deleted", "is_admin"])
        ensure_group_has_admin(conversation)
        return "left"
    conversation.delete()
    return "deleted"


def broadcast_conversation_updated(conversation: Conversation, request=None) -> None:
    from .serializers import ConversationSerializer

    cache = getattr(conversation, "_prefetched_objects_cache", None)
    if cache is not None:
        cache.pop("memberships", None)
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    payload = ConversationSerializer(conversation, context={"request": request}).data
    event = {"type": "conversation.updated", "payload": payload}
    async_to_sync(channel_layer.group_send)(f"conv-{conversation.pk}", event)
    for user_id in active_member_ids(conversation):
        async_to_sync(channel_layer.group_send)(f"user-{user_id}", event)


def broadcast_conversation_removed(
    conversation_id: int, user_ids: list[int], *, to_room: bool = False
) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    event = {"type": "conversation.removed", "payload": {"id": conversation_id}}
    if to_room:
        async_to_sync(channel_layer.group_send)(f"conv-{conversation_id}", event)
    for user_id in user_ids:
        async_to_sync(channel_layer.group_send)(f"user-{user_id}", event)
