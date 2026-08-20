# chat/consumers/signaling.py
"""WebRTC call signaling mixin — 1:1 pair calls and multi-party mesh conferences."""
from __future__ import annotations

import asyncio
from typing import Any

from channels.db import database_sync_to_async
from django.core.cache import cache
from django.utils import timezone

from ..models import ConversationMembership

RING_TIMEOUT_TASKS: dict[str, asyncio.Task] = {}
MAX_CONFERENCE_PARTICIPANTS = 6
CALL_STATE_TTL = 600  # longer for conferences


def _normalize_call_kind(raw) -> str:
    kind = str(raw or "voice").strip().lower()
    return "video" if kind == "video" else "voice"


def _notify_call_missed_sync(
    user_id: int | None,
    conversation_id: int | None,
    kind: str = "voice",
) -> None:
    if not user_id:
        return
    try:
        from notifications.constants import NotificationPriority, NotificationType
        from notifications.services.notification_service import create_notification

        from notifications.utils.urls import conversation_action_url

        url = conversation_action_url(conversation_id)
        is_video = _normalize_call_kind(kind) == "video"
        create_notification(
            recipient_id=int(user_id),
            notification_type=NotificationType.CALL_MISSED,
            title="Appel manqué",
            message=(
                "Vous avez manqué un appel vidéo."
                if is_video
                else "Vous avez manqué un appel vocal."
            ),
            priority=NotificationPriority.HIGH,
            action_url=url,
            send_email=True,
        )
    except Exception:
        import logging

        logging.getLogger(__name__).exception("call_missed notification failed")


def _persist_call_started_sync(
    conversation_id: int,
    caller_id: int,
    participant_ids: list[int],
    kind: str,
) -> int | None:
    """Create Call + CallParticipant rows; return call id for cache."""
    try:
        from ..models import Call, CallParticipant

        call = Call.objects.create(
            conversation_id=conversation_id,
            created_by_id=caller_id,
            kind=_normalize_call_kind(kind),
        )
        seen = set()
        for uid in participant_ids:
            uid = int(uid)
            if uid in seen:
                continue
            seen.add(uid)
            CallParticipant.objects.create(call=call, user_id=uid)
        return call.id
    except Exception:
        import logging

        logging.getLogger(__name__).exception("persist call start failed")
        return None


def _persist_call_ended_sync(call_id: int | None, outcome: str = "completed") -> None:
    if not call_id:
        return
    try:
        from django.utils import timezone as dj_tz

        from ..models import Call, CallParticipant, Message

        now = dj_tz.now()
        Call.objects.filter(id=call_id, ended_at__isnull=True).update(ended_at=now)
        CallParticipant.objects.filter(call_id=call_id, left_at__isnull=True).update(left_at=now)

        call = Call.objects.filter(id=call_id).select_related("created_by").first()
        if not call:
            return
        if Message.objects.filter(shared_call_id=call.id).exists():
            return

        kind = _normalize_call_kind(call.kind)
        is_video = kind == "video"
        normalized = str(outcome or "completed").strip().lower()
        missed = normalized in ("missed", "declined")
        if missed:
            mt = (
                Message.MessageType.CALL_MISSED_VIDEO
                if is_video
                else Message.MessageType.CALL_MISSED_VOICE
            )
            body = "Missed video call" if is_video else "Missed voice call"
        else:
            mt = Message.MessageType.CALL_VIDEO if is_video else Message.MessageType.CALL_VOICE
            duration_seconds = 0
            if call.started_at and call.ended_at:
                duration_seconds = max(0, int((call.ended_at - call.started_at).total_seconds()))
            mins, secs = divmod(duration_seconds, 60)
            dur = f"{mins}:{secs:02d}"
            body = f"Video call · {dur}" if is_video else f"Voice call · {dur}"

        Message.objects.create(
            conversation_id=call.conversation_id,
            sender_id=call.created_by_id,
            body=body,
            message_type=mt,
            shared_call=call,
        )
    except Exception:
        import logging

        logging.getLogger(__name__).exception("persist call end failed")


def _persist_participant_left_sync(call_id: int | None, user_id: int) -> None:
    if not call_id:
        return
    try:
        from django.utils import timezone as dj_tz

        from ..models import CallParticipant

        CallParticipant.objects.filter(
            call_id=call_id, user_id=user_id, left_at__isnull=True
        ).update(left_at=dj_tz.now())
    except Exception:
        import logging

        logging.getLogger(__name__).exception("persist participant left failed")


_notify_call_missed_async = database_sync_to_async(_notify_call_missed_sync)
_persist_call_started_async = database_sync_to_async(_persist_call_started_sync)
_persist_call_ended_async = database_sync_to_async(_persist_call_ended_sync)
_persist_participant_left_async = database_sync_to_async(_persist_participant_left_sync)


def _pair_call_group(uid_a: int, uid_b: int) -> str:
    a, b = sorted((int(uid_a), int(uid_b)))
    return f"call_{a}_{b}"


def _conference_call_group(call_id: int) -> str:
    return f"call_conf_{int(call_id)}"


def _call_state_cache_key(group_name: str) -> str:
    return f"webrtc_call:{group_name}"


def _conv_call_index_key(conversation_id: int) -> str:
    return f"webrtc_call_conv:{int(conversation_id)}"


async def _index_call_for_conversation(conversation_id: int | None, group_name: str) -> None:
    if conversation_id is None:
        return
    await asyncio.to_thread(cache.set, _conv_call_index_key(conversation_id), group_name, CALL_STATE_TTL)


async def _clear_call_index(conversation_id: int | None) -> None:
    if conversation_id is None:
        return
    await asyncio.to_thread(cache.delete, _conv_call_index_key(conversation_id))


def _cancel_ring_timeout(group_name: str) -> None:
    t = RING_TIMEOUT_TASKS.pop(group_name, None)
    if t and not t.done():
        t.cancel()


def _participant_ids(state: dict) -> list[int]:
    raw = state.get("participantIds") or []
    out = []
    for x in raw:
        try:
            out.append(int(x))
        except (TypeError, ValueError):
            continue
    return out


def _joined_ids(state: dict) -> list[int]:
    raw = state.get("joinedIds") or []
    out = []
    for x in raw:
        try:
            out.append(int(x))
        except (TypeError, ValueError):
            continue
    return out


def _is_member(state: dict, user_id: int) -> bool:
    return int(user_id) in _participant_ids(state)


def _mark_answered(state: dict) -> None:
    """True once at least one non-caller has joined the media room."""
    caller = state.get("callerId")
    joined = _joined_ids(state)
    if caller is None:
        if len(joined) >= 2:
            state["answered"] = True
        return
    if any(int(j) != int(caller) for j in joined):
        state["answered"] = True


def _outcome_from_state(state: dict | None, *, default_missed: bool = False) -> str:
    if not state:
        return "missed" if default_missed else "completed"
    if state.get("answered"):
        return "completed"
    joined = _joined_ids(state)
    caller = state.get("callerId")
    if caller is not None and any(int(j) != int(caller) for j in joined):
        return "completed"
    if len(joined) >= 2:
        return "completed"
    return "missed"


def _normalize_sdp(content: dict):
    """Accept sdp string or RTCSessionDescription-shaped dict { type, sdp }."""
    sdp = content.get("sdp")
    if sdp is None:
        return None
    if isinstance(sdp, dict):
        return sdp.get("sdp")
    return sdp


def _schedule_ring_timeout(consumer: Any, group_name: str) -> None:
    _cancel_ring_timeout(group_name)

    async def _run():
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state:
            return
        kind = state.get("kind", "voice")
        conv_id = state.get("conversationId")
        call_id = state.get("callId")
        mode = state.get("mode", "direct")
        joined = _joined_ids(state)
        ringing = [int(x) for x in (state.get("ringingIds") or []) if x is not None]

        if mode == "conference":
            # Miss anyone still ringing; keep call if ≥2 have joined.
            still_ringing = [uid for uid in ringing if uid not in joined]
            for uid in still_ringing:
                await _notify_call_missed_async(uid, conv_id, kind)
            state["ringingIds"] = []
            if len(joined) <= 1:
                await consumer.channel_layer.group_send(
                    group_name,
                    {"type": "call.missed", "group_name": group_name},
                )
                await _persist_call_ended_async(call_id, "missed")
                await _clear_call_index(conv_id)
                await asyncio.to_thread(cache.delete, key)
                if conv_id is not None:
                    await consumer.channel_layer.group_send(
                        f"conv-{conv_id}",
                        {
                            "type": "call.room_ended",
                            "payload": {
                                "type": "call.room_ended",
                                "conversationId": conv_id,
                                "groupName": group_name,
                                "reason": "missed",
                                "kind": kind,
                                "callerId": state.get("callerId"),
                            },
                        },
                    )
            else:
                state["status"] = "active"
                state["answered"] = True
                await asyncio.to_thread(cache.set, key, state, CALL_STATE_TTL)
                await consumer.channel_layer.group_send(
                    group_name,
                    {
                        "type": "call.roster",
                        "group_name": group_name,
                        "joined_ids": joined,
                        "participant_ids": _participant_ids(state),
                        "ringing_ids": [],
                    },
                )
            return

        # Direct 1:1
        if state.get("status") != "ringing":
            return
        target_uid = state.get("targetUserId")
        await consumer.channel_layer.group_send(
            group_name,
            {"type": "call.missed", "group_name": group_name},
        )
        if target_uid:
            await _notify_call_missed_async(target_uid, conv_id, kind)
        await _persist_call_ended_async(call_id, "missed")
        await _clear_call_index(conv_id)
        await asyncio.to_thread(cache.delete, key)
        if conv_id is not None:
            await consumer.channel_layer.group_send(
                f"conv-{conv_id}",
                {
                    "type": "call.room_ended",
                    "payload": {
                        "type": "call.room_ended",
                        "conversationId": conv_id,
                        "groupName": group_name,
                        "reason": "missed",
                        "kind": kind,
                        "callerId": state.get("callerId"),
                    },
                },
            )

    RING_TIMEOUT_TASKS[group_name] = asyncio.create_task(_run())


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
        elif msg_type == "call.leave":
            await self._handle_leave(content)
        elif msg_type == "call.join":
            await self._handle_join(content)
        elif msg_type == "call.end":
            await self._handle_end(content)
        else:
            await super().receive_json(content, **kwargs)

    @database_sync_to_async
    def _verify_members(self, conversation_id: int, user_ids: list[int]) -> bool:
        ids = list({int(u) for u in user_ids})
        if not ids:
            return False
        count = (
            ConversationMembership.objects.filter(
                conversation_id=conversation_id,
                user_id__in=ids,
                is_deleted=False,
            )
            .values("user_id")
            .distinct()
            .count()
        )
        return count == len(ids)

    async def _display_name(self) -> str:
        def _name(u):
            full = (u.get_full_name() or "").strip()
            if full:
                return full
            fn = (getattr(u, "first_name", None) or "").strip()
            ln = (getattr(u, "last_name", None) or "").strip()
            combined = f"{fn} {ln}".strip()
            if combined:
                return combined
            email = (getattr(u, "email", None) or "").strip()
            if "@" in email:
                return email.split("@", 1)[0]
            if email:
                return email
            return f"Member {u.pk}"

        return await database_sync_to_async(_name)(self.user)

    async def _participant_profiles(self, user_ids) -> list[dict]:
        """Display names/avatars for conference UI (avoid 'User N' placeholders)."""
        ids = []
        for raw in user_ids or []:
            try:
                ids.append(int(raw))
            except (TypeError, ValueError):
                continue
        if not ids:
            return []

        def _rows(pk_list):
            from django.contrib.auth import get_user_model

            User = get_user_model()
            out = []
            # Custom User uses email as USERNAME_FIELD (no username column).
            qs = User.objects.filter(pk__in=pk_list).only("id", "first_name", "last_name", "email")
            for u in qs:
                full = (u.get_full_name() or "").strip()
                fn = (u.first_name or "").strip()
                ln = (u.last_name or "").strip()
                combined = f"{fn} {ln}".strip()
                name = full or combined
                if not name:
                    email = (u.email or "").strip()
                    if "@" in email:
                        name = email.split("@", 1)[0]
                    elif email:
                        name = email
                    else:
                        name = f"Member {u.pk}"
                image = None
                try:
                    img = getattr(u, "image", None)
                    if img:
                        image = getattr(img, "url", None) or str(img)
                except Exception:
                    image = None
                out.append(
                    {
                        "id": u.pk,
                        "name": name,
                        "firstName": fn or None,
                        "lastName": ln or None,
                        "avatar": image,
                    }
                )
            return out

        try:
            return await database_sync_to_async(_rows)(ids)
        except Exception:
            return []

    async def _broadcast_room_active(self, conv_id: int, state: dict, group_name: str) -> None:
        caller_id = state.get("callerId")
        payload = {
            "type": "call.room_active",
            "conversationId": conv_id,
            "groupName": group_name,
            "kind": state.get("kind", "voice"),
            "mode": state.get("mode", "direct"),
            "callId": state.get("callId"),
            "callerId": caller_id,
            "joinedIds": _joined_ids(state),
            "participantIds": _participant_ids(state),
            "status": state.get("status"),
        }
        await self.channel_layer.group_send(
            f"conv-{conv_id}",
            {"type": "call.room_active", "payload": payload},
        )

    async def _broadcast_room_ended(
        self,
        conv_id: int | None,
        group_name: str,
        *,
        reason: str = "ended",
        kind: str = "voice",
        caller_id: int | None = None,
    ) -> None:
        if conv_id is None:
            return
        payload = {
            "type": "call.room_ended",
            "conversationId": conv_id,
            "groupName": group_name,
            "reason": reason,
            "kind": kind,
            "callerId": caller_id,
        }
        await self.channel_layer.group_send(
            f"conv-{conv_id}",
            {"type": "call.room_ended", "payload": payload},
        )

    @database_sync_to_async
    def _add_call_participant(self, call_id: int | None, user_id: int) -> None:
        if not call_id:
            return
        try:
            from ..models import CallParticipant

            CallParticipant.objects.get_or_create(call_id=call_id, user_id=user_id)
        except Exception:
            import logging

            logging.getLogger(__name__).exception("add call participant failed")

    @database_sync_to_async
    def _user_in_conversation(self, conversation_id: int, user_id: int) -> bool:
        return ConversationMembership.objects.filter(
            conversation_id=conversation_id, user_id=user_id, is_deleted=False
        ).exists()

    async def _handle_initiate(self, content: dict):
        conv_id = content.get("conversationId", content.get("conversation_id"))
        if conv_id is None:
            await self.send_json({"type": "error", "message": "conversationId required"})
            return
        try:
            conv_id = int(conv_id)
        except (TypeError, ValueError):
            await self.send_json({"type": "error", "message": "invalid ids"})
            return

        raw_targets = content.get("targetUserIds") or content.get("target_user_ids")
        single = content.get("targetUserId", content.get("target_user_id"))
        targets: list[int] = []
        if isinstance(raw_targets, list) and raw_targets:
            for t in raw_targets:
                try:
                    tid = int(t)
                except (TypeError, ValueError):
                    continue
                if tid != self.user.id:
                    targets.append(tid)
        elif single is not None:
            try:
                tid = int(single)
            except (TypeError, ValueError):
                await self.send_json({"type": "error", "message": "invalid ids"})
                return
            if tid != self.user.id:
                targets = [tid]

        # Dedupe preserve order
        seen = set()
        targets = [t for t in targets if not (t in seen or seen.add(t))]

        if not targets:
            await self.send_json({"type": "error", "message": "targetUserId(s) required"})
            return

        mode = str(content.get("mode") or "").strip().lower()
        is_conference = mode == "conference" or len(targets) > 1
        if is_conference and len(targets) + 1 > MAX_CONFERENCE_PARTICIPANTS:
            await self.send_json(
                {
                    "type": "error",
                    "message": f"conference limited to {MAX_CONFERENCE_PARTICIPANTS} participants",
                }
            )
            return

        all_ids = [self.user.id, *targets]
        if not await self._verify_members(conv_id, all_ids):
            await self.send_json({"type": "error", "message": "not a participant"})
            return

        kind = _normalize_call_kind(content.get("kind"))
        call_id = await _persist_call_started_async(conv_id, self.user.id, all_ids, kind)

        if is_conference:
            if not call_id:
                await self.send_json({"type": "error", "message": "could not create call"})
                return
            group_name = _conference_call_group(call_id)
            state = {
                "mode": "conference",
                "callerId": self.user.id,
                "participantIds": all_ids,
                "joinedIds": [self.user.id],
                "ringingIds": list(targets),
                "status": "ringing",
                "startedAt": timezone.now().isoformat(),
                "conversationId": conv_id,
                "kind": kind,
                "callId": call_id,
            }
        else:
            target_id = targets[0]
            group_name = _pair_call_group(self.user.id, target_id)
            state = {
                "mode": "direct",
                "callerId": self.user.id,
                "targetUserId": target_id,
                "participantIds": [self.user.id, target_id],
                "joinedIds": [self.user.id],
                "ringingIds": [target_id],
                "status": "ringing",
                "startedAt": timezone.now().isoformat(),
                "conversationId": conv_id,
                "kind": kind,
                "callId": call_id,
            }

        key = _call_state_cache_key(group_name)
        await asyncio.to_thread(cache.set, key, state, CALL_STATE_TTL)
        await _index_call_for_conversation(conv_id, group_name)
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.call_groups_joined.add(group_name)
        _schedule_ring_timeout(self, group_name)
        await self._broadcast_room_active(conv_id, state, group_name)

        await self.send_json(
            {
                "type": "call.initiated",
                "groupName": group_name,
                "conversationId": conv_id,
                "targetUserId": targets[0],
                "targetUserIds": targets,
                "participantIds": all_ids,
                "joinedIds": [self.user.id],
                "mode": state["mode"],
                "kind": kind,
                "callId": call_id,
            }
        )

        caller_name = await self._display_name()
        for target_id in targets:
            incoming_payload = {
                "type": "call.incoming",
                "callerId": self.user.id,
                "callerName": caller_name,
                "conversationId": conv_id,
                "groupName": group_name,
                "kind": kind,
                "mode": state["mode"],
                "participantIds": all_ids,
                "callId": call_id,
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
        if not state or not _is_member(state, self.user.id):
            await self.send_json({"type": "error", "message": "invalid call"})
            return

        mode = state.get("mode", "direct")
        uid = int(self.user.id)

        if mode == "direct":
            if state.get("targetUserId") != uid:
                await self.send_json({"type": "error", "message": "invalid call"})
                return
            if state.get("status") != "ringing":
                return
            _cancel_ring_timeout(group_name)
            state["status"] = "active"
            state["joinedIds"] = [state.get("callerId"), uid]
            state["ringingIds"] = []
            _mark_answered(state)
        else:
            # Conference: any invited participant may join while ringing or active
            if uid not in _participant_ids(state):
                await self.send_json({"type": "error", "message": "invalid call"})
                return
            if uid in _joined_ids(state):
                return
            joined = _joined_ids(state)
            joined.append(uid)
            state["joinedIds"] = joined
            ringing = [r for r in (state.get("ringingIds") or []) if int(r) != uid]
            state["ringingIds"] = ringing
            state["status"] = "active"
            _mark_answered(state)
            if not ringing:
                _cancel_ring_timeout(group_name)

        await asyncio.to_thread(cache.set, key, state, CALL_STATE_TTL)
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.call_groups_joined.add(group_name)
        recv_name = await self._display_name()
        await self._broadcast_room_active(int(state["conversationId"]), state, group_name)

        profiles = await self._participant_profiles(_participant_ids(state))
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.accepted",
                "sender_channel": self.channel_name,
                "receiver_id": uid,
                "receiver_name": recv_name,
                "group_name": group_name,
                "joined_ids": _joined_ids(state),
                "participant_ids": _participant_ids(state),
                "participants": profiles,
                "mode": mode,
            },
        )

    async def _handle_reject(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or not _is_member(state, self.user.id):
            await self.send_json({"type": "error", "message": "invalid call"})
            return

        uid = int(self.user.id)
        mode = state.get("mode", "direct")

        if mode == "direct":
            if state.get("targetUserId") != uid:
                await self.send_json({"type": "error", "message": "invalid call"})
                return
            _cancel_ring_timeout(group_name)
            await _persist_call_ended_async(state.get("callId"), "declined")
            await _clear_call_index(state.get("conversationId"))
            await asyncio.to_thread(cache.delete, key)
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "call.rejected",
                    "sender_channel": self.channel_name,
                    "group_name": group_name,
                },
            )
            await self._broadcast_room_ended(
                state.get("conversationId"),
                group_name,
                reason="declined",
                kind=state.get("kind", "voice"),
                caller_id=state.get("callerId"),
            )
            return

        # Conference reject = decline invite without ending room for others
        ringing = [r for r in (state.get("ringingIds") or []) if int(r) != uid]
        state["ringingIds"] = ringing
        await _persist_participant_left_async(state.get("callId"), uid)
        if not ringing and len(_joined_ids(state)) <= 1:
            _cancel_ring_timeout(group_name)
            await _persist_call_ended_async(state.get("callId"), "missed")
            await _clear_call_index(state.get("conversationId"))
            await asyncio.to_thread(cache.delete, key)
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "call.ended",
                    "sender_channel": self.channel_name,
                    "group_name": group_name,
                },
            )
            await self._broadcast_room_ended(
                state.get("conversationId"),
                group_name,
                reason="missed",
                kind=state.get("kind", "voice"),
                caller_id=state.get("callerId"),
            )
        else:
            await asyncio.to_thread(cache.set, key, state, CALL_STATE_TTL)
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "call.participant_left",
                    "sender_channel": self.channel_name,
                    "user_id": uid,
                    "group_name": group_name,
                    "joined_ids": _joined_ids(state),
                    "reason": "rejected",
                },
            )

    async def _ensure_in_call_group(self, group_name: str) -> None:
        if not hasattr(self, "call_groups_joined"):
            self.call_groups_joined = set()
        if group_name in self.call_groups_joined:
            return
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.call_groups_joined.add(group_name)

    def _parse_target_user_id(self, content: dict) -> int | None:
        raw = content.get("targetUserId", content.get("target_user_id"))
        if raw is None:
            return None
        try:
            return int(raw)
        except (TypeError, ValueError):
            return None

    async def _handle_offer(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        sdp = _normalize_sdp(content)
        if not group_name or sdp is None:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or state.get("status") not in ("active", "ringing"):
            return
        if not _is_member(state, self.user.id):
            return
        target_user_id = self._parse_target_user_id(content)
        # Conference requires addressed offers; direct may omit target.
        if state.get("mode") == "conference" and target_user_id is None:
            return
        if target_user_id is not None and not _is_member(state, target_user_id):
            return
        await self._ensure_in_call_group(group_name)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.offer",
                "sdp": sdp,
                "sender_id": self.user.id,
                "sender_name": await self._display_name(),
                "target_user_id": target_user_id,
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
        if not state or state.get("status") not in ("active", "ringing"):
            return
        if not _is_member(state, self.user.id):
            return
        target_user_id = self._parse_target_user_id(content)
        if state.get("mode") == "conference" and target_user_id is None:
            return
        if target_user_id is not None and not _is_member(state, target_user_id):
            return
        await self._ensure_in_call_group(group_name)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.answer",
                "sdp": sdp,
                "sender_id": self.user.id,
                "sender_name": await self._display_name(),
                "target_user_id": target_user_id,
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def _handle_ice(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        candidate = content.get("candidate")
        if not group_name or candidate is None:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or not _is_member(state, self.user.id):
            return
        target_user_id = self._parse_target_user_id(content)
        if state.get("mode") == "conference" and target_user_id is None:
            return
        await self._ensure_in_call_group(group_name)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.ice_candidate",
                "candidate": candidate,
                "sender_id": self.user.id,
                "target_user_id": target_user_id,
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def _handle_join(self, content: dict):
        """Late join an active call/conference from the conversation banner."""
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            await self.send_json({"type": "error", "message": "groupName required"})
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state:
            await self.send_json({"type": "error", "message": "call not active"})
            return
        conv_id = state.get("conversationId")
        uid = int(self.user.id)
        if conv_id is None or not await self._user_in_conversation(int(conv_id), uid):
            await self.send_json({"type": "error", "message": "not a participant"})
            return

        participants = _participant_ids(state)
        if uid not in participants:
            if len(participants) >= MAX_CONFERENCE_PARTICIPANTS:
                await self.send_json({"type": "error", "message": "conference is full"})
                return
            participants.append(uid)
            state["participantIds"] = participants
            await self._add_call_participant(state.get("callId"), uid)

        joined = _joined_ids(state)
        if uid in joined:
            profiles = await self._participant_profiles(participants)
            await self.send_json(
                {
                    "type": "call.accepted",
                    "receiverId": uid,
                    "receiverName": await self._display_name(),
                    "groupName": group_name,
                    "joinedIds": joined,
                    "participantIds": participants,
                    "participants": profiles,
                    "mode": state.get("mode", "direct"),
                }
            )
            return

        joined.append(uid)
        state["joinedIds"] = joined
        ringing = [r for r in (state.get("ringingIds") or []) if int(r) != uid]
        state["ringingIds"] = ringing
        state["status"] = "active"
        _mark_answered(state)
        if not ringing:
            _cancel_ring_timeout(group_name)
        await asyncio.to_thread(cache.set, key, state, CALL_STATE_TTL)
        await _index_call_for_conversation(int(conv_id), group_name)
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.call_groups_joined.add(group_name)
        recv_name = await self._display_name()
        profiles = await self._participant_profiles(participants)
        await self._broadcast_room_active(int(conv_id), state, group_name)
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.accepted",
                "sender_channel": self.channel_name,
                "receiver_id": uid,
                "receiver_name": recv_name,
                "group_name": group_name,
                "joined_ids": joined,
                "participant_ids": participants,
                "participants": profiles,
                "mode": state.get("mode", "conference"),
            },
        )
        # Late joiner also needs the roster of names immediately (they skip own group_send).
        await self.send_json(
            {
                "type": "call.accepted",
                "receiverId": uid,
                "receiverName": recv_name,
                "groupName": group_name,
                "joinedIds": joined,
                "participantIds": participants,
                "participants": profiles,
                "mode": state.get("mode", "conference"),
            }
        )

    async def _handle_leave(self, content: dict):
        """Leave a conference without ending it for others."""
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or not _is_member(state, self.user.id):
            return
        uid = int(self.user.id)
        mode = state.get("mode", "direct")
        if mode != "conference":
            await self._handle_end(content)
            return

        joined = [j for j in _joined_ids(state) if j != uid]
        state["joinedIds"] = joined
        ringing = [r for r in (state.get("ringingIds") or []) if int(r) != uid]
        state["ringingIds"] = ringing
        await _persist_participant_left_async(state.get("callId"), uid)
        await self.channel_layer.group_discard(group_name, self.channel_name)
        self.call_groups_joined.discard(group_name)

        if len(joined) == 0:
            _cancel_ring_timeout(group_name)
            outcome = _outcome_from_state(state, default_missed=True)
            await _persist_call_ended_async(state.get("callId"), outcome)
            await _clear_call_index(state.get("conversationId"))
            await asyncio.to_thread(cache.delete, key)
            await self.send_json({"type": "call.ended", "groupName": group_name})
            await self._broadcast_room_ended(
                state.get("conversationId"),
                group_name,
                reason="missed" if outcome == "missed" else "ended",
                kind=state.get("kind", "voice"),
                caller_id=state.get("callerId"),
            )
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "call.ended",
                    "sender_channel": self.channel_name,
                    "group_name": group_name,
                },
            )
            return

        await asyncio.to_thread(cache.set, key, state, CALL_STATE_TTL)
        # Keep conversation banner in sync with remaining participants.
        if state.get("conversationId") is not None:
            await self._broadcast_room_active(int(state["conversationId"]), state, group_name)
        await self.send_json({"type": "call.ended", "groupName": group_name, "reason": "left"})
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.participant_left",
                "sender_channel": self.channel_name,
                "user_id": uid,
                "group_name": group_name,
                "joined_ids": joined,
                "reason": "left",
            },
        )

    async def _handle_end(self, content: dict):
        group_name = content.get("groupName", content.get("group_name"))
        if not group_name:
            return
        key = _call_state_cache_key(group_name)
        state = await asyncio.to_thread(cache.get, key)
        if not state or not _is_member(state, self.user.id):
            return
        _cancel_ring_timeout(group_name)
        outcome = _outcome_from_state(state, default_missed=True)
        await _persist_call_ended_async(state.get("callId"), outcome)
        await _clear_call_index(state.get("conversationId"))
        await asyncio.to_thread(cache.delete, key)
        await self.send_json({"type": "call.ended", "groupName": group_name})
        await self.channel_layer.group_discard(group_name, self.channel_name)
        self.call_groups_joined.discard(group_name)
        await self._broadcast_room_ended(
            state.get("conversationId"),
            group_name,
            reason="missed" if outcome == "missed" else "ended",
            kind=state.get("kind", "voice"),
            caller_id=state.get("callerId"),
        )
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "call.ended",
                "sender_channel": self.channel_name,
                "group_name": group_name,
            },
        )

    async def call_room_active(self, event):
        payload = event.get("payload")
        if payload:
            await self.send_json(payload)

    async def call_room_ended(self, event):
        payload = event.get("payload")
        if payload:
            await self.send_json(payload)

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
                "groupName": event.get("group_name"),
                "joinedIds": event.get("joined_ids") or [],
                "participantIds": event.get("participant_ids") or [],
                "participants": event.get("participants") or [],
                "mode": event.get("mode") or "direct",
            }
        )

    async def call_rejected(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "call.rejected",
                "groupName": event.get("group_name"),
            }
        )
        gn = event.get("group_name")
        if gn:
            await self.channel_layer.group_discard(gn, self.channel_name)
            self.call_groups_joined.discard(gn)

    async def call_offer(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        target = event.get("target_user_id")
        if target is not None and int(target) != int(self.user.id):
            return
        await self.send_json(
            {
                "type": "call.offer",
                "sdp": event["sdp"],
                "senderId": event["sender_id"],
                "senderName": event.get("sender_name"),
                "targetUserId": target,
                "groupName": event.get("group_name"),
            }
        )

    async def call_answer(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        target = event.get("target_user_id")
        if target is not None and int(target) != int(self.user.id):
            return
        await self.send_json(
            {
                "type": "call.answer",
                "sdp": event["sdp"],
                "senderId": event["sender_id"],
                "senderName": event.get("sender_name"),
                "targetUserId": target,
                "groupName": event.get("group_name"),
            }
        )

    async def call_ice_candidate(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        target = event.get("target_user_id")
        if target is not None and int(target) != int(self.user.id):
            return
        await self.send_json(
            {
                "type": "call.ice_candidate",
                "candidate": event["candidate"],
                "senderId": event["sender_id"],
                "targetUserId": target,
                "groupName": event.get("group_name"),
            }
        )

    async def call_participant_left(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "call.participant_left",
                "userId": event.get("user_id"),
                "groupName": event.get("group_name"),
                "joinedIds": event.get("joined_ids") or [],
                "reason": event.get("reason") or "left",
            }
        )

    async def call_roster(self, event):
        await self.send_json(
            {
                "type": "call.roster",
                "groupName": event.get("group_name"),
                "joinedIds": event.get("joined_ids") or [],
                "participantIds": event.get("participant_ids") or [],
                "ringingIds": event.get("ringing_ids") or [],
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
