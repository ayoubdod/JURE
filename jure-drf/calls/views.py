import hashlib
import hmac
import time

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


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
