from django.conf import settings
from rest_framework import status
from rest_framework.response import Response


class JuriaEnabledMixin:
    """Return 503 when Juria is globally disabled."""

    def dispatch(self, request, *args, **kwargs):
        if not getattr(settings, "JURIA_ENABLED", True):
            return Response(
                {"detail": "Juria is disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().dispatch(request, *args, **kwargs)
