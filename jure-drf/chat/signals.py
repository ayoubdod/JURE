# chat/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Message
from .serializers import MessageNotificationSerializer, MessageSerializer


@receiver(post_save, sender=Message)
def message_created(sender, instance, created, **kwargs):
    """Signal handler that broadcasts new/updated messages to conversation channel group"""
    if created:
        transaction.on_commit(lambda: _broadcast_message(instance, "message.new"))
    else:
        # Edit or soft-delete
        transaction.on_commit(lambda: _broadcast_message(instance, "message.updated"))


def _broadcast_message(instance: Message, event_type: str = "message.new"):
    """Broadcast message to conversation channel group (and notifications for new messages)."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    room_name = f"conv-{instance.conversation.id}"
    message_data = MessageSerializer(instance, context={"request": None}).data
    ws_type = "message.new" if event_type == "message.new" else "message.updated"
    conv_event = {"type": ws_type, "payload": message_data}

    async_to_sync(channel_layer.group_send)(room_name, conv_event)

    if event_type == "message.new":
        notification_data = MessageNotificationSerializer(instance, user=instance.sender).data
        for participant in instance.conversation.participants.exclude(id=instance.sender.id):
            async_to_sync(channel_layer.group_send)(
                f"user-{participant.id}",
                {"type": "notification.new", "payload": notification_data},
            )

    # Full message on each participant's personal group so /ws/chat/ sees thread updates
    # without /ws/conversation/<id>/ (dedupe by message id if also subscribed to conv-*).
    for participant in instance.conversation.participants.all():
        async_to_sync(channel_layer.group_send)(
            f"user-{participant.id}",
            conv_event,
        )
