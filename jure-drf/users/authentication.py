"""JWT authentication that rejects superseded sessions."""

from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from dj_rest_auth.jwt_auth import JWTCookieAuthentication

from .session import session_version_matches


class SessionVersionMixin:
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not session_version_matches(user, validated_token):
            raise exceptions.AuthenticationFailed(
                detail="session_replaced",
                code="session_replaced",
            )
        return user


class SessionJWTAuthentication(SessionVersionMixin, JWTAuthentication):
    """Bearer JWT auth with single-session enforcement."""


class SessionJWTCookieAuthentication(SessionVersionMixin, JWTCookieAuthentication):
    """dj-rest-auth cookie/Bearer JWT auth with single-session enforcement."""
