"""CSRF for the consent write.

DRF marks API views csrf_exempt and this project's JWT cookie authentication
does not enforce CSRF. The consent write is cookie-scoped and AllowAny, so
the view checks the CSRF token itself. Authentication settings are unchanged.
"""

from django.http import HttpResponse
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck


def enforce_csrf(request) -> None:
    check = CSRFCheck(lambda _request: HttpResponse())
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")
