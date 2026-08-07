# chat/consumers/call_consumer.py
"""Dedicated WebSocket for voice-call signaling (JWT from ASGI scope)."""
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .signaling import CallSignalingMixin


class CallConsumer(CallSignalingMixin, AsyncJsonWebsocketConsumer):
    """WebRTC signaling only; user authenticated by JwtAuthMiddleware."""

    async def connect(self):
        # scope is a dict — use .get(), not getattr (that always misses and closes 4001)
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4001)
            return
        self.user = user
        self.personal_group = f"user_{self.user.id}"
        self.call_groups_joined = set()
        await self.channel_layer.group_add(self.personal_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self._discard_all_call_groups()
        if hasattr(self, "personal_group"):
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)

    async def notification_new(self, event):
        # Same personal group as NotificationConsumer (`user_{id}`); ignore here.
        return
