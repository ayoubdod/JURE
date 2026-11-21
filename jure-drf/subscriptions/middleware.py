"""Block workspace writes when a subscription is not in a usable state.

Legacy cabinets with no subscription row are left untouched.
"""

from __future__ import annotations

from django.http import JsonResponse

from subscriptions.services.lifecycle import blocks_writes

_SAFE = {"GET", "HEAD", "OPTIONS", "TRACE"}
_ALLOW_PREFIXES = (
    "/api/v1/subscriptions/",
    "/api/v1/dj-rest-auth/",
    "/api/v1/auth/",
    "/admin/",
)


def _authenticated_user(request):
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return user
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if not header.startswith("Bearer ") and "sessionid" not in request.COOKIES and "jwt" not in request.COOKIES:
        return None
    try:
        from users.authentication import SessionJWTCookieAuthentication

        result = SessionJWTCookieAuthentication().authenticate(request)
    except Exception:
        return None
    if not result:
        return None
    return result[0]


class SubscriptionWriteGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in _SAFE:
            return self.get_response(request)
        path = request.path or ""
        if path.startswith(_ALLOW_PREFIXES):
            return self.get_response(request)
        user = _authenticated_user(request)
        if user is None:
            return self.get_response(request)
        if blocks_writes(user):
            return JsonResponse(
                {
                    "code": "subscription_inactive",
                    "detail": "The subscription does not allow changes. You can still review data and manage billing.",
                },
                status=403,
            )
        return self.get_response(request)
