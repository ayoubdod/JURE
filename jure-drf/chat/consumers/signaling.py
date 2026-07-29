# chat/consumers/signaling.py
"""WebRTC call signaling mixin and helpers shared by chat and call WebSocket consumers."""
from __future__ import annotations

import asyncio
from typing import Any

from channels.db import database_sync_to_async
from django.core.cache import cache
from django.utils import timezone

from ..models import ConversationMembership

RING_TIMEOUT_TASKS: dict[str, asyncio.Task] = {}


def _notify_call_missed_sync(user_id: int | None, conversation_id: int | None) -> None:
    if not user_id:
        return
    try:
        from notifications.constants import NotificationPriority, NotificationType
        from notifications.services.notification_service import create_notification

        url = (
            f"/dashboard/chat?conversation={conversation_id}"
            if conversation_id
            else "/dashboard/chat"
        )
        create_notification(
            recipient_id=int(user_id),
            notification_type=NotificationType.CALL_MISSED,
            title="Appel manqué",
            message="Vous avez manqué un appel vocal.",
            priority=NotificationPriority.HIGH,
            action_url=url,
            send_email=True,
        )
    except Exception:
        import logging

        logging.getLogger(__name__).exception("call_missed notification failed")


_notify_call_missed_async = database_sync_to_async(_notify_call_missed_sync)


def _pair_call_group(uid_a: int, uid_b: int) -> str:
    a, b = sorted((int(uid_a), int(uid_b)))
    return f"call_{a}_{b}"


def _call_state_cache_key(group_name: str) -> str:
    return f"webrtc_call:{group_name}"


def _cancel_ring_timeout(group_name: str) -> None:
    t = RING_TIMEOUT_TASKS.pop(group_name, None)
    if t and not t.done():
        t.cancel()


def _schedule_ring_timeout(consumer: Any, group_name: str) -> None:
    _cancel_ring_timeout(group_name)

    async def _run():
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or state.get("status") != "ringing":
            return
        target_uid = state.get("targetUserId")
        conv_id = state.get("conversationId")
        await consumer.channel_layer.group_send(
            group_name,
            {"type": "call.missed", "group_name": group_name},
        )
        if target_uid:
            await _notify_call_missed_async(target_uid, conv_id)
        await asyncio.to_thread(cache.delete, key)

    RING_TIMEOUT_TASKS[group_name] = asyncio.create_task(_run())


def _normalize_sdp(content: dict):
    """Accept sdp string or RTCSessionDescription-shaped dict { type, sdp }."""
    sdp = content.get("sdp")
    if sdp is None:
        return None
    if isinstance(sdp, dict):
        return sdp.get("sdp")
    return sdp


class CallSignalingMixin:
    """WebRTC call signaling; shared by ChatConsumer and CallConsumer."""

    async def _discard_all_call_groups(self):
        if not hasattr(self, "call_groups_joined"):
            return
        for gn in list(self.call_groups_joined):
            await self.channel_layer.group_discard(gn, self.channel_name)
        self.call_groups_joined.clear()

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            return
        user = getattr(self, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return
        msg_type = content.get("type")
        if msg_type == "call.initiate":
            await self._handle_initiate(content)
        elif msg_type == "call.accept":
            await self._handle_accept(content)
        elif msg_type == "call.reject":
            await self._handle_reject(content)
        elif msg_type == "call.offer":
            await self._handle_offer(content)
        elif msg_type == "call.answer":
            await self._handle_answer(content)
        elif msg_type == "call.ice_candidate":
            await self._handle_ice(content)
        elif msg_type == "call.end":
            await self._handle_end(content)
        else:
            await super().receive_json(content, **kwargs)

    @database_sync_to_async
    def _verify_call_pair(self, conversation_id: int, uid_a: int, uid_b: int) -> bool:
        return (
            ConversationMembership.objects.filter(
                conversation_id=conversation_id, user_id=uid_a, is_deleted=False
            ).exists()
            and ConversationMembership.objects.filter(
                conversation_id=conversation_id, user_id=uid_b, is_deleted=False
            ).exists()
        )

    async def _handle_initiate(self, content: dict):
        target_id = content.get("targetUserId", content.get("target_user_id"))
        conv_id = content.get("conversationId", content.get("conversation_id"))
        if target_id is None or conv_id is None:
            await self.send_json({"type": "error", "message": "targetUserId and conversationId required"})
            return
        try:
            target_id = int(target_id)
            conv_id = int(conv_id)
        except (TypeError, ValueError):
            await self.send_json({"type": "error", "message": "invalid ids"})
            return
        if target_id == self.user.id:
            return
        if not await self._verify_call_pair(conv_id, self.user.id, target_id):
            await self.send_json({"type": "error", "message": "not a participant"})
            return
        group_name = _pair_call_group(self.user.id, target_id)
        key = _call_state_cache_key(group_name)
        state = {
            "callerId": self.user.id,
            "targetUserId": target_id,
            "status": "ringing",
            "startedAt": timezone.now().isoformat(),
            "conversationId": conv_id,
        }
        await asyncio.to_thread(cache.set, key, state, 120)
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.call_groups_joined.add(group_name)
        _schedule_ring_timeout(self, group_name)
        caller_name = await database_sync_to_async(
            lambda u: u.get_full_name() or u.get_username()
        )(self.user)
        incoming_payload = {
            "type": "call.incoming",
            "callerId": self.user.id,
            "callerName": caller_name,
            "conversationId": conv_id,
            "groupName": group_name,
        }
        ring_event = {
            "type": "call.incoming",
            "target_user_id": target_id,
            "payload": incoming_payload,
        }
        await self.channel_layer.group_send(f"user_{target_id}", ring_event)
        await self.channel_layer.group_send(f"conv-{conv_id}", ring_event)

    async def _handle_accept(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or state.get("targetUserId") != self.user.id:
            await self.send_json({"type": "error", "message": "invalid call"})
            return
        if state.get("status") != "ringing":
            return
        _cancel_ring_timeout(group_name)
        state["status"] = "active"
        await asyncio.to_thread(cache.set, key, state, 120)
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.call_groups_joined.add(group_name)
        recv_name = await database_sync_to_async(
            lambda u: u.get_full_name() or u.get_username()
        )(self.user)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.accepted",
                "sender_channel": self.channel_name,
                "receiver_id": self.user.id,
                "receiver_name": recv_name,
                "group_name": group_name,
            },
        )

    async def _handle_reject(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or state.get("targetUserId") != self.user.id:
            await self.send_json({"type": "error", "message": "invalid call"})
            return
        _cancel_ring_timeout(group_name)
        await asyncio.to_thread(cache.delete, key)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.rejected",
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def _handle_offer(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        sdp = _normalize_sdp(content)
        if not group_name or sdp is None:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if (
            not state
            or state.get("status") != "active"
            or self.user.id not in (state.get("callerId"), state.get("targetUserId"))
        ):
            return
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.offer",
                "sdp": sdp,
                "sender_id": self.user.id,
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def _handle_answer(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        sdp = _normalize_sdp(content)
        if not group_name or sdp is None:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if (
            not state
            or state.get("status") != "active"
            or self.user.id not in (state.get("callerId"), state.get("targetUserId"))
        ):
            return
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.answer",
                "sdp": sdp,
                "sender_id": self.user.id,
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def _handle_ice(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        candidate = content.get("candidate")
        if not group_name or candidate is None:
            return
        if group_name not in self.call_groups_joined:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or self.user.id not in (state.get("callerId"), state.get("targetUserId")):
            return
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.ice_candidate",
                "candidate": candidate,
                "sender_id": self.user.id,
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def _handle_end(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or self.user.id not in (state.get("callerId"), state.get("targetUserId")):
            return
        _cancel_ring_timeout(group_name)
        await asyncio.to_thread(cache.delete, key)
        await self.send_json({"type": "call.ended", "groupName": group_name})
        await self.channel_layer.group_discard(group_name, self.channel_name)
        self.call_groups_joined.discard(group_name)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.ended",
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def call_incoming(self, event):
        user = getattr(self, "user", None)
        if not user or event.get("target_user_id") != user.id:
            return
        payload = event.get("payload")
        if payload:
            await self.send_json(payload)

    async def call_accepted(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "call.accepted",
                "receiverId": event["receiver_id"],
                "receiverName": event["receiver_name"],
            }
        )

    async def call_rejected(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json({"type": "call.rejected"})
        gn = event.get("group_name")
        if gn:
            await self.channel_layer.group_discard(gn, self.channel_name)
            self.call_groups_joined.discard(gn)

    async def call_offer(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "call.offer",
                "sdp": event["sdp"],
                "senderId": event["sender_id"],
            }
        )

    async def call_answer(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "call.answer",
                "sdp": event["sdp"],
                "senderId": event["sender_id"],
            }
        )

    async def call_ice_candidate(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "call.ice_candidate",
                "candidate": event["candidate"],
                "senderId": event["sender_id"],
            }
        )

    async def call_ended(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json({"type": "call.ended", "groupName": event.get("group_name")})
        gn = event.get("group_name")
        if gn:
            await self.channel_layer.group_discard(gn, self.channel_name)
            self.call_groups_joined.discard(gn)

    async def call_missed(self, event):
        gn = event.get("group_name")
        await self.send_json({"type": "call.missed", "groupName": gn})
        if gn:
            await self.channel_layer.group_discard(gn, self.channel_name)
            self.call_groups_joined.discard(gn)
