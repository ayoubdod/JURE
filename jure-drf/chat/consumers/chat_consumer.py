# chat/consumers/chat_consumer.py
"""Personal chat WebSocket: JWT auth, presence, notifications, and call signaling."""
import asyncio
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

from chat.presence import (
    presence_add,
    presence_last_seen_map,
    presence_list,
    presence_mark_offline,
    presence_seed_from_db,
)
from chat.serializers import MessageNotificationSerializer

from ..models import Message
from .signaling import CallSignalingMixin

User = get_user_model()

PRESENCE_GROUP = "chat-presence"


@database_sync_to_async
def get_user_from_token(token):
    """Resolve the Django user for a JWT access token, or None if invalid."""
    try:
        from users.session import session_version_matches

        validated_token = UntypedToken(token)
        user_id = validated_token["user_id"]
        user = User.objects.get(id=user_id)
        if not session_version_matches(user, validated_token):
            return None
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return None


@database_sync_to_async
def create_ws_chat_message(user_id, content):
    """Persist a chat message from WebSocket payload (same validation as REST)."""
    from chat.views import create_message_from_websocket_payload

    user = User.objects.get(pk=user_id)
    return create_message_from_websocket_payload(user, content)


class ChatConsumer(CallSignalingMixin, AsyncJsonWebsocketConsumer):
    """Authenticated user channel: notifications, presence, and WebRTC via mixin."""

    async def connect(self):
        kwargs: dict = self.scope["url_route"]["kwargs"]
        access_token = kwargs.get("access_token")

        if not access_token:
            query_string = self.scope.get("query_string", b"").decode()
            if query_string:
                query_params = parse_qs(query_string)
                access_token = query_params.get("token", [None])[0]

        if not access_token:
            await self.close(code=4001)
            return

        self.user = await get_user_from_token(access_token)

        if not self.user:
            await self.close(code=4001)
            return

        self.room_name = f"user-{self.user.id}"
        self.user_personal_group = f"user_{self.user.id}"
        self.call_groups_joined = set()
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.channel_layer.group_add(self.user_personal_group, self.channel_name)
        await self.channel_layer.group_add(PRESENCE_GROUP, self.channel_name)

        # Accept immediately — any Redis/DB work before accept causes the browser
        # handshake to time out (~5s) and presence never comes online.
        await self.accept()

        online_ids = await asyncio.to_thread(presence_add, self.user.id)
        # Push presence first so green dots work even if inbox load is slow.
        await self.send_json(
            {
                "type": "connection.established",
                "payload": {
                    "notifications": [],
                    "online_user_ids": online_ids,
                    "online_member_ids": online_ids,
                    "online": online_ids,
                    "last_seen": {},
                },
                "user_id": self.user.id,
            }
        )
        await self._broadcast_presence(online_ids, {})

        last_seen: dict[str, str] = {}
        try:
            last_seen = await asyncio.wait_for(self._cabinet_last_seen_map(), timeout=1.5)
        except Exception:
            last_seen = {}

        await self.send_notifications(online_ids, last_seen)
        if last_seen:
            await self._broadcast_presence(online_ids, last_seen)

    async def disconnect(self, close_code):
        await self._discard_all_call_groups()
        if hasattr(self, "user"):
            online_ids, last_seen_patch = await asyncio.to_thread(
                presence_mark_offline, self.user.id
            )
            await self._broadcast_presence(online_ids, last_seen_patch)
        if hasattr(self, "channel_layer") and hasattr(self, "channel_name"):
            await self.channel_layer.group_discard(PRESENCE_GROUP, self.channel_name)
        if hasattr(self, "room_name"):
            await self.channel_layer.group_discard(
                self.room_name,
                self.channel_name,
            )
        if hasattr(self, "user_personal_group"):
            await self.channel_layer.group_discard(
                self.user_personal_group,
                self.channel_name,
            )

    async def _cabinet_last_seen_map(self) -> dict[str, str]:
        """Seed + return last-seen for cabinet peers so clients can show offline times."""
        peer_ids = await self._cabinet_peer_ids()
        seeded = await asyncio.to_thread(presence_seed_from_db, peer_ids)
        cached = await asyncio.to_thread(presence_last_seen_map, peer_ids)
        return {**seeded, **cached}

    @database_sync_to_async
    def _cabinet_peer_ids(self) -> list[int]:
        from django.db.models import Q

        user = self.user
        cabinet_id = getattr(user, "cabinet_id", None)
        if not cabinet_id:
            owned = getattr(user, "owned_cabinet", None)
            cabinet_id = getattr(owned, "id", None) if owned else None
        if not cabinet_id:
            return []
        return list(
            User.objects.filter(Q(cabinet_id=cabinet_id) | Q(owned_cabinet__id=cabinet_id))
            .exclude(pk=user.id)
            .values_list("id", flat=True)[:500]
        )

    async def _broadcast_presence(
        self, online_ids: list[int], last_seen: dict[str, str] | None = None
    ):
        """Broadcast presence.update to all connected chat users."""
        if self.channel_layer:
            payload = {
                "online_user_ids": online_ids,
                "online_member_ids": online_ids,
                "online": online_ids,
                "last_seen": last_seen or {},
            }
            await self.channel_layer.group_send(
                PRESENCE_GROUP,
                {"type": "presence.update", "payload": payload},
            )

    async def send_notifications(
        self,
        online_ids: list[int] | None = None,
        last_seen: dict[str, str] | None = None,
    ):
        """Send initial notifications to the authenticated user."""
        messages = await self.get_last_messages()
        serialized_data = await self.serialize_notifications(messages)
        if online_ids is None:
            online_ids = await asyncio.to_thread(presence_list)
        payload = {
            "notifications": serialized_data,
            "online_user_ids": online_ids,
            "online_member_ids": online_ids,
            "online": online_ids,
            "last_seen": last_seen or {},
        }
        await self.send_json(
            {
                "type": "connection.established",
                "payload": payload,
                "user_id": self.user.id,
            }
        )

    @database_sync_to_async
    def serialize_notifications(self, messages):
        return MessageNotificationSerializer(messages, many=True, user=self.user).data

    @database_sync_to_async
    def get_last_messages(self):
        # Cap inbox bootstrap so connection.established cannot stall presence.
        return list(
            Message.objects.filter(conversation__participants=self.user)
            .exclude(sender=self.user)
            .prefetch_related("attachments")
            .order_by("-sent_at")[:80]
        )

    async def send_error(self, error_message, error_code=None):
        await self.send_json(
            {
                "type": "error",
                "payload": {
                    "message": error_message,
                    "code": error_code,
                },
            }
        )

    async def notification_new(self, event):
        # Chat inbox rings only. Activity-center notifications use /ws/notifications/.
        body = event.get("payload", event.get("notification"))
        if body is None:
            return
        if isinstance(body, dict) and not body.get("is_message"):
            return
        await self.send_json(
            {
                "type": "notification.new",
                "payload": body,
            }
        )

    async def session_replaced(self, event):
        """Forced logout when the account signs in from another place."""
        await self.send_json(
            {
                "type": "session.replaced",
                "payload": event.get("payload") or {"code": "session_replaced"},
            }
        )
        await self.close(code=4008)

    async def message_new(self, event):
        await self.send_json(
            {
                "type": "message.new",
                "payload": event["payload"],
            }
        )

    async def message_updated(self, event):
        await self.send_json(
            {
                "type": "message.updated",
                "payload": event["payload"],
            }
        )

    async def conversation_updated(self, event):
        await self.send_json(
            {
                "type": "conversation.updated",
                "payload": event["payload"],
            }
        )

    async def conversation_removed(self, event):
        await self.send_json(
            {
                "type": "conversation.removed",
                "payload": event["payload"],
            }
        )

    async def presence_update(self, event):
        await self.send_json(
            {
                "type": "presence.update",
                "payload": event["payload"],
            }
        )

    async def receive_json(self, content, **kwargs):
        if isinstance(content, dict) and content.get("type") == "chat.message":
            _msg, err = await create_ws_chat_message(self.user.id, content)
            if err is not None:
                await self.send_json(
                    {
                        "type": "error",
                        "payload": err if isinstance(err, dict) else {"detail": str(err)},
                    }
                )
            return
        await super().receive_json(content, **kwargs)
