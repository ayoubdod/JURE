from types import SimpleNamespace

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from ..models import Conversation, ConversationMembership, DeliveryReceipt, Message
from ..serializers import MessageSerializer


def _message_queryset_with_shares():
    return Message.objects.select_related(
        "sender",
        "forwarded_from",
        "shared_case",
        "shared_task",
        "shared_appointment",
        "shared_case__assigned_to",
        "shared_task__assigned_to",
        "shared_task__case",
        "shared_appointment__created_by",
        "shared_appointment__case",
    )


def create_message_from_websocket_payload(user, payload: dict):
    """
    Create a chat message from a WebSocket payload (same rules as REST).
    Returns (message, None) on success or (None, err_dict) on failure.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return None, {"detail": "Authentication required."}
    data = {k: v for k, v in payload.items() if k != "type"}
    conv_id = data.pop("conversationId", None) or data.pop("conversation_id", None)
    if conv_id is None:
        return None, {"detail": "conversation_id is required"}
    try:
        conv_id = int(conv_id)
    except (TypeError, ValueError):
        return None, {"detail": "Invalid conversation id."}
    conv = Conversation.objects.filter(pk=conv_id).first()
    if not conv:
        return None, {"detail": "Conversation not found."}
    if not ConversationMembership.objects.filter(
        conversation=conv, user=user, is_deleted=False
    ).exists():
        return None, {"detail": "Forbidden."}
    data["conversation"] = conv_id
    if "content" in data and "body" not in data:
        data["body"] = data.get("content") or ""
    req = SimpleNamespace(user=user)
    ser = MessageSerializer(data=data, context={"request": req})
    if not ser.is_valid():
        return None, ser.errors
    msg = ser.save()
    return msg, None


def _record_delivery_and_broadcast(messages, user_id):
    """Record delivery for messages and broadcast message.updated for new deliveries."""
    channel_layer = get_channel_layer()
    for msg in messages:
        _, created = DeliveryReceipt.objects.get_or_create(
            message=msg, user_id=user_id, defaults={}
        )
        if created and channel_layer:
            msg = (
                _message_queryset_with_shares()
                .filter(pk=msg.pk)
                .select_related("conversation")
                .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
                .first()
            )
            if msg:
                data = MessageSerializer(msg, context={"request": None}).data
                async_to_sync(channel_layer.group_send)(
                    f"conv-{msg.conversation_id}",
                    {"type": "message.updated", "payload": data},
                )
                for p in msg.conversation.participants.values_list("id", flat=True):
                    async_to_sync(channel_layer.group_send)(
                        f"user-{p}",
                        {"type": "message.updated", "payload": data},
                    )


def _broadcast_messages_updated(messages):
    """Broadcast message.updated for each message to conversation and all participants."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    for msg in messages:
        msg = (
            _message_queryset_with_shares()
            .filter(pk=msg.pk)
            .select_related("conversation")
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
            .first()
        )
        if msg:
            data = MessageSerializer(msg, context={"request": None}).data
            async_to_sync(channel_layer.group_send)(
                f"conv-{msg.conversation_id}",
                {"type": "message.updated", "payload": data},
            )
            for p in msg.conversation.participants.values_list("id", flat=True):
                async_to_sync(channel_layer.group_send)(
                    f"user-{p}",
                    {"type": "message.updated", "payload": data},
                )
