import base64
import hashlib
import hmac
import json
import logging
import time
from urllib.parse import urlencode
from urllib.request import urlopen

from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import Call, ConversationMembership

logger = logging.getLogger(__name__)

GOOGLE_STUN = {
    "urls": [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
    ],
}

# Metered tokens last hours; cache so every call accept does not hit their API.
_METERED_CACHE_KEY = "webrtc:metered_ice_servers"
_METERED_CACHE_TTL = 300


def _ephemeral_turn_credentials(secret: str, ttl_seconds: int) -> tuple[str, str]:
    """coturn REST API: username = expiry:jure, credential = base64(HMAC-SHA1(secret, username))."""
    expiry = int(time.time()) + max(60, ttl_seconds)
    username = f"{expiry}:jure"
    digest = hmac.new(
        secret.encode("utf-8"),
        username.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    credential = base64.b64encode(digest).decode("ascii")
    return username, credential


def _turn_urls(host: str, port: int, tls_port: int) -> list[str]:
    """UDP plus TCP (and TURNS) so media can relay when UDP/STUN hole-punching fails."""
    urls = [
        f"turn:{host}:{port}?transport=udp",
        f"turn:{host}:{port}?transport=tcp",
    ]
    if tls_port and tls_port != port:
        urls.append(f"turn:{host}:{tls_port}?transport=tcp")
        urls.append(f"turns:{host}:{tls_port}?transport=tcp")
    elif tls_port:
        urls.append(f"turns:{host}:{tls_port}?transport=tcp")
    return urls


def _parse_ice_servers_json(raw: str) -> list[dict] | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("ICE_SERVERS_JSON is not valid JSON")
        return None
    if isinstance(parsed, dict):
        parsed = parsed.get("iceServers") or parsed.get("ice_servers")
    if not isinstance(parsed, list) or not parsed:
        return None
    servers = [entry for entry in parsed if isinstance(entry, dict) and entry.get("urls")]
    return servers or None


def _fetch_metered_ice_servers(domain: str, api_key: str) -> list[dict] | None:
    domain = (domain or "").strip().rstrip("/")
    api_key = (api_key or "").strip()
    if not domain or not api_key:
        return None
    cached = cache.get(_METERED_CACHE_KEY)
    if isinstance(cached, list) and cached:
        return cached
    host = domain.replace("https://", "").replace("http://", "")
    qs = urlencode({"apiKey": api_key})
    url = f"https://{host}/api/v1/turn/credentials?{qs}"
    try:
        with urlopen(url, timeout=4) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception:
        logger.warning("Metered TURN credentials request failed", exc_info=True)
        return None
    if isinstance(payload, dict):
        payload = payload.get("iceServers") or payload.get("ice_servers")
    if not isinstance(payload, list) or not payload:
        return None
    servers = [entry for entry in payload if isinstance(entry, dict) and entry.get("urls")]
    if servers:
        cache.set(_METERED_CACHE_KEY, servers, _METERED_CACHE_TTL)
    return servers or None


def _coturn_ice_server() -> dict | None:
    from django.conf import settings

    host = (getattr(settings, "TURN_HOST", "") or "").strip()
    if not host:
        return None
    port = int(getattr(settings, "TURN_PORT", 3478) or 3478)
    tls_port = int(getattr(settings, "TURN_TLS_PORT", 0) or 0)
    secret = (getattr(settings, "TURN_SECRET", "") or "").strip()
    ttl = int(getattr(settings, "TURN_CREDENTIAL_TTL", 86400) or 86400)
    if secret:
        username, credential = _ephemeral_turn_credentials(secret, ttl)
    else:
        username = getattr(settings, "TURN_USERNAME", "") or ""
        credential = getattr(settings, "TURN_CREDENTIAL", "") or ""

    entry: dict = {"urls": _turn_urls(host, port, tls_port)}
    if username or credential:
        entry["username"] = username
        entry["credential"] = credential
    return entry


def build_ice_servers() -> list[dict]:
    """ICE list for RTCPeerConnection. Production across NATs needs at least one TURN relay."""
    from django.conf import settings

    override = _parse_ice_servers_json(getattr(settings, "ICE_SERVERS_JSON", "") or "")
    if override:
        return override

    ice_servers: list[dict] = [dict(GOOGLE_STUN)]

    metered = _fetch_metered_ice_servers(
        getattr(settings, "METERED_TURN_DOMAIN", "") or "",
        getattr(settings, "METERED_TURN_API_KEY", "") or "",
    )
    if metered:
        ice_servers.extend(metered)
        return ice_servers

    coturn = _coturn_ice_server()
    if coturn:
        ice_servers.append(coturn)
    return ice_servers


class IceServersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"iceServers": build_ice_servers()})


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
