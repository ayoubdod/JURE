import hashlib
import hmac
import time

from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import Call, ConversationMembership


def _ephemeral_turn_credentials(secret: str, ttl_seconds: int) -> tuple[str, str]:
    """coturn REST / HMAC time-limited credentials: username = expiry:jure, credential = HMAC-SHA1."""
    expiry = int(time.time()) + max(60, ttl_seconds)
    username = f"{expiry}:jure"
    credential = hmac.new(
        secret.encode("utf-8"),
        username.encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()
    return username, credential


class IceServersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.conf import settings

        ice_servers = [
            {
                "urls": [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                ],
            },
        ]
        host = getattr(settings, "TURN_HOST", "") or ""
        if host.strip():
            port = getattr(settings, "TURN_PORT", 3478)
            tls_port = getattr(settings, "TURN_TLS_PORT", 0) or 0
            secret = (getattr(settings, "TURN_SECRET", "") or "").strip()
            ttl = int(getattr(settings, "TURN_CREDENTIAL_TTL", 86400) or 86400)
            if secret:
                username, credential = _ephemeral_turn_credentials(secret, ttl)
            else:
                username = getattr(settings, "TURN_USERNAME", "") or ""
                credential = getattr(settings, "TURN_CREDENTIAL", "") or ""

            urls = [f"turn:{host}:{port}"]
            if tls_port:
                urls.append(f"turns:{host}:{tls_port}")

            entry: dict = {"urls": urls}
            if username or credential:
                entry["username"] = username
                entry["credential"] = credential
            ice_servers.append(entry)

        return Response({"iceServers": ice_servers})


class ActiveCallView(APIView):
    """Return the active WebRTC room for a conversation, if any."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw = request.query_params.get("conversation_id") or request.query_params.get(
            "conversationId"
        )
        if raw is None:
            return Response({"detail": "conversation_id required"}, status=400)
        try:
            conv_id = int(raw)
        except (TypeError, ValueError):
            return Response({"detail": "invalid conversation_id"}, status=400)

        is_member = ConversationMembership.objects.filter(
            conversation_id=conv_id, user=request.user, is_deleted=False
        ).exists()
        if not is_member:
            return Response({"detail": "forbidden"}, status=403)

        group_name = cache.get(f"webrtc_call_conv:{conv_id}")
        state = cache.get(f"webrtc_call:{group_name}") if group_name else None
        if not state:
            # Orphaned DB row without live cache is not joinable — treat as inactive.
            call = (
                Call.objects.filter(conversation_id=conv_id, ended_at__isnull=True)
                .order_by("-id")
                .first()
            )
            if call and not call.ended_at:
                # Soft-close stale open calls so the banner cannot stick forever.
                from django.utils import timezone as dj_tz

                Call.objects.filter(pk=call.pk, ended_at__isnull=True).update(
                    ended_at=dj_tz.now()
                )
            return Response({"active": False})

        joined = state.get("joinedIds") or []
        ringing = state.get("ringingIds") or []
        # No one left in the room (and nobody still ringing) → not active.
        if not joined and not ringing:
            cache.delete(f"webrtc_call:{group_name}")
            cache.delete(f"webrtc_call_conv:{conv_id}")
            call_id = state.get("callId")
            if call_id:
                from django.utils import timezone as dj_tz

                Call.objects.filter(pk=call_id, ended_at__isnull=True).update(
                    ended_at=dj_tz.now()
                )
            return Response({"active": False})

        return Response(
            {
                "active": True,
                "conversationId": conv_id,
                "groupName": group_name,
                "callId": state.get("callId"),
                "kind": state.get("kind", "voice"),
                "mode": state.get("mode", "direct"),
                "callerId": state.get("callerId"),
                "joinedIds": joined,
                "participantIds": state.get("participantIds") or [],
                "status": state.get("status"),
            }
        )
