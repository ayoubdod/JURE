from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from cookie_consent.cookies import apply_anonymous_cookie, clear_anonymous_cookie
from cookie_consent.csrf import enforce_csrf
from cookie_consent.serializers import CookieConsentWriteSerializer
from cookie_consent.services import (
    anonymous_id_from_request,
    current_for_request,
    envelope,
    link_anonymous_to_user,
    record_consent,
)
from cookie_consent.throttles import CookieConsentThrottle


def _with_csrf(request, payload: dict) -> dict:
    # The SPA may be on another site and cannot read the API host's cookie.
    # The token is returned only to an origin allowed by CORS.
    body = dict(payload)
    body["csrf_token"] = get_token(request)
    return body


def _subject_label(request) -> str:
    if request.user.is_authenticated:
        return "user"
    return "anonymous"


def _has_anonymous_cookie(request) -> bool:
    return bool(request.COOKIES.get(settings.COOKIE_CONSENT_COOKIE_NAME))


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CookieConsentView(APIView):
    """Current cookie decision for this browser or signed-in user.

    There is no collection endpoint. Callers cannot address another subject.
    """

    permission_classes = [AllowAny]
    throttle_classes = [CookieConsentThrottle]

    def get(self, request):
        clear_cookie = False
        if request.user.is_authenticated and _has_anonymous_cookie(request):
            link_anonymous_to_user(request.user, anonymous_id_from_request(request))
            clear_cookie = True
        row = current_for_request(request)
        response = Response(_with_csrf(request, envelope(row, subject=_subject_label(request))))
        if clear_cookie:
            clear_anonymous_cookie(response)
        return response

    def put(self, request):
        enforce_csrf(request)
        serializer = CookieConsentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        authenticated = request.user.is_authenticated
        result = record_consent(
            user=request.user,
            anonymous_id=anonymous_id_from_request(request),
            action=data["action"],
            functional=data["functional"],
            analytics=data["analytics"],
            clear_anonymous_cookie=authenticated and _has_anonymous_cookie(request),
        )
        code = status.HTTP_201_CREATED if result.created else status.HTTP_200_OK
        response = Response(
            _with_csrf(request, envelope(result.consent, subject=_subject_label(request))),
            status=code,
        )
        if result.clear_anonymous_cookie:
            clear_anonymous_cookie(response)
        elif result.set_anonymous_id is not None:
            apply_anonymous_cookie(response, result.set_anonymous_id)
        return response
