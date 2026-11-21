from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

from juria.services.juria_api_service import JuriaAPIError, provider_configured


def juria_error_http_status(exc: JuriaAPIError) -> int:
    """Map upstream provider errors so axios never treats them as app auth 401.

    Provider 401/402 → 502 (misconfigured/unpaid upstream, not the end user).
    Provider 429 → 503 (busy), never a session-killing 401.
    """
    code = int(getattr(exc, "status_code", 502) or 502)
    if code in (401, 402):
        return status.HTTP_502_BAD_GATEWAY
    if code == 429:
        return status.HTTP_503_SERVICE_UNAVAILABLE
    if code in (502, 503):
        return code
    return status.HTTP_502_BAD_GATEWAY


class JuriaUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Juria is disabled."
    default_code = "juria_unavailable"


class JuriaEnabledMixin:
    """Reject Juria requests with 503 when the feature is off or the LLM key is missing.

    Check runs inside ``initial()`` so DRF can render the response. Returning a
    bare Response from ``dispatch()`` 500s in production (``accepted_renderer`` unset).
    """

    def initial(self, request, *args, **kwargs):
        if not getattr(settings, "JURIA_ENABLED", False):
            raise JuriaUnavailable(detail="Juria is disabled.")
        if not provider_configured():
            raise JuriaUnavailable(
                detail="Juria is not configured. Set the provider API key on the server."
            )
        super().initial(request, *args, **kwargs)
