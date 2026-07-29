# chat/consumers/conversation_consumer.py
"""Per-conversation WebSocket: history, live messages, delivery receipts, incoming calls."""
from asgiref.sync import async_to_sync, sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.layers import get_channel_layer

from chat.serializers import MessageSerializer
from chat.views import _message_queryset_with_shares

from ..models import Conversation, ConversationMembership, DeliveryReceipt, Message


class ConversationConsumer(AsyncJsonWebsocketConsumer):
    """One conversation room; JWT user must be a non-deleted participant."""

    async def connect(self):
        kwargs: dict = self.scope["url_route"]["kwargs"]
        conversation_id: int = kwargs.get("conversation_id")

        if not conversation_id:
            await self.close(code=4004)
            return

        try:
            self.conversation = await sync_to_async(Conversation.objects.get)(id=conversation_id)
        except Conversation.DoesNotExist:
            await self.close(code=4004)
            return

        user = self.scope.get("user")
        if user and getattr(user, "is_authenticated", False):
            is_participant = await database_sync_to_async(
                ConversationMembership.objects.filter(
                    conversation=self.conversation, user=user, is_deleted=False
                ).exists
            )()
            if not is_participant:
                await self.close(code=4003)
                return

        self.room_name = f"conv-{conversation_id}"
        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name,
        )

        await self.accept()

        await self.send_initial_messages()

    async def disconnect(self, close_code):
        if hasattr(self, "room_name"):
            await self.channel_layer.group_discard(
                self.room_name,
                self.channel_name,
            )

    async def call_incoming(self, event):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            return
        if event.get("target_user_id") != user.id:
            return
        payload = event.get("payload")
        if payload:
            await self.send_json(payload)

    @database_sync_to_async
    def get_last_messages(self):
        return list(
            _message_queryset_with_shares()
            .filter(conversation_id=self.conversation.pk)
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
            .order_by("sent_at")
        )

    @database_sync_to_async
    def record_delivery_and_broadcast(self, message_ids, user_id, conversation_id):
        """Record delivery for messages; broadcast message.updated for new receipts."""
        channel_layer = get_channel_layer()
        to_broadcast = []
        for msg_id in message_ids:
            _, created = DeliveryReceipt.objects.get_or_create(
                message_id=msg_id, user_id=user_id, defaults={}
            )
            if created:
                msg = (
                    _message_queryset_with_shares()
                    .filter(pk=msg_id)
                    .select_related("conversation")
                    .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
                    .first()
                )
                if msg:
                    to_broadcast.append(msg)
        if channel_layer and to_broadcast:
            for msg in to_broadcast:
                data = MessageSerializer(msg, context={"request": None}).data
                async_to_sync(channel_layer.group_send)(
                    f"conv-{conversation_id}",
                    {"type": "message.updated", "payload": data},
                )
                for p in msg.conversation.participants.values_list("id", flat=True):
                    async_to_sync(channel_layer.group_send)(
                        f"user-{p}",
                        {"type": "message.updated", "payload": data},
                    )
        return to_broadcast

    async def send_initial_messages(self):
        messages = await self.get_last_messages()
        payload = MessageSerializer(messages, many=True, context={"request": None}).data
        await self.send_json({"type": "message.history", "payload": payload})

        user = self.scope.get("user")
        if user and getattr(user, "is_authenticated", False):
            to_record = [m.id for m in messages if m.sender_id != user.id]
            if to_record:
                await self.record_delivery_and_broadcast(
                    to_record, user.id, self.conversation.pk
                )

    async def message_new(self, event):
        payload = event["payload"]
        await self.send_json({"type": "message.new", "payload": payload})

        user = self.scope.get("user")
        msg_id = payload.get("id") if isinstance(payload, dict) else getattr(payload, "id", None)
        sender_id = payload.get("sender") if isinstance(payload, dict) else getattr(payload, "sender_id", None)
        if isinstance(sender_id, dict):
            sender_id = sender_id.get("id", sender_id)
        conv_id = payload.get("conversation") if isinstance(payload, dict) else getattr(payload, "conversation_id", None)
        if user and getattr(user, "is_authenticated", False) and msg_id and sender_id != user.id and conv_id:
            await self.record_delivery_and_broadcast([msg_id], user.id, conv_id)

    async def message_updated(self, event):
        await self.send_json({"type": "message.updated", "payload": event["payload"]})

    async def conversation_updated(self, event):
        await self.send_json({"type": "conversation.updated", "payload": event["payload"]})
