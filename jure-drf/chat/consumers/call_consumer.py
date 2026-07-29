# chat/consumers/call_consumer.py
"""Dedicated WebSocket for voice-call signaling (JWT from ASGI scope)."""
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .signaling import CallSignalingMixin


class CallConsumer(CallSignalingMixin, AsyncJsonWebsocketConsumer):
    """WebRTC signaling only; user authenticated by JwtAuthMiddleware."""

    async def connect(self):
        user = getattr(self.scope, "user", None)
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
