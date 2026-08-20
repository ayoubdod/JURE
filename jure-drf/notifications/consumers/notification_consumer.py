from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from notifications.services.notification_service import (
    get_unread_count,
    mark_all_as_read,
    mark_as_read,
)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Real-time notification delivery on personal group user_{user_id}
    (same convention as CallConsumer).
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4001)
            return
        self.user_id = user.id
        self.group_name = f"user_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        count = await database_sync_to_async(get_unread_count)(self.user_id)
        await self.send_json({"type": "notification.unread_count", "count": count})

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_new(self, event):
        notification = event.get("notification") or event.get("payload") or {}
        if not isinstance(notification, dict) or not notification.get("id"):
            return
        if notification.get("is_message"):
            return
        ntype = str(notification.get("type") or notification.get("notification_type") or "")
        if ntype in ("NEW_MESSAGE", "NEW_MESSAGE_DAILY_REMINDER"):
            return
        await self.send_json(
            {
                "type": "notification.new",
                "notification": notification,
            }
        )

    # Call signaling shares `user_{id}`; ignore so Channels doesn't disconnect this socket.
    async def call_incoming(self, event):
        return

    async def call_accepted(self, event):
        return

    async def call_rejected(self, event):
        return

    async def call_offer(self, event):
        return

    async def call_answer(self, event):
        return

    async def call_ice_candidate(self, event):
        return

    async def call_ended(self, event):
        return

    async def call_missed(self, event):
        return

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            return
        msg_type = content.get("type")
        if msg_type == "notification.mark_read":
            nid = content.get("notification_id")
            if nid is None:
                return
            await database_sync_to_async(mark_as_read)(int(nid), self.user_id)
            count = await database_sync_to_async(get_unread_count)(self.user_id)
            await self.send_json(
                {
                    "type": "notification.read_confirmed",
                    "notification_id": int(nid),
                    "unread_count": count,
                }
            )
        elif msg_type == "notification.mark_all_read":
            await database_sync_to_async(mark_all_as_read)(self.user_id)
            await self.send_json(
                {
                    "type": "notification.all_read_confirmed",
                    "unread_count": 0,
                }
            )
