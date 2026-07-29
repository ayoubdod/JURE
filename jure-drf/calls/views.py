from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


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
            username = getattr(settings, "TURN_USERNAME", "") or ""
            credential = getattr(settings, "TURN_CREDENTIAL", "") or ""
            ice_servers.append(
                {
                    "urls": [f"turn:{host}:{port}"],
                    "username": username,
                    "credential": credential,
                }
            )
        return Response({"iceServers": ice_servers})
