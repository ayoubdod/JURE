from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

from juria.services.juria_api_service import JuriaAPIError, provider_configured


def juria_error_http_status(exc: JuriaAPIError) -> int:
    code = int(getattr(exc, "status_code", 502) or 502)
    if code in (401, 402, 429, 502, 503):
        return code
    return status.HTTP_502_BAD_GATEWAY


class JuriaEnabledMixin:
    """Return 503 when Juria is globally disabled or the provider key is missing."""

    def dispatch(self, request, *args, **kwargs):
        if not getattr(settings, "JURIA_ENABLED", True):
            return Response(
                {"detail": "Juria is disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not provider_configured():
            return Response(
                {"detail": "Juria is not configured. Set the provider API key on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().dispatch(request, *args, **kwargs)
