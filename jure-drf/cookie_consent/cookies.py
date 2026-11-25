"""HttpOnly subject cookie. The value is an opaque id, never a token or a preference."""

from __future__ import annotations

import uuid

from django.conf import settings


def _samesite() -> str:
    """Follow the session cookie so the id is stored on the same cross-site API calls."""
    value = getattr(settings, "SESSION_COOKIE_SAMESITE", None) or "Lax"
    return str(value)


def _secure() -> bool:
    # SameSite=None is ignored by browsers unless the cookie is Secure.
    if _samesite() == "None":
        return True
    return bool(getattr(settings, "SESSION_COOKIE_SECURE", False))


def apply_anonymous_cookie(response, anonymous_id: uuid.UUID) -> None:
    response.set_cookie(
        settings.COOKIE_CONSENT_COOKIE_NAME,
        str(anonymous_id),
        max_age=settings.COOKIE_CONSENT_MAX_AGE,
        httponly=True,
        secure=_secure(),
        samesite=_samesite(),
        path="/",
    )


def clear_anonymous_cookie(response) -> None:
    response.set_cookie(
        settings.COOKIE_CONSENT_COOKIE_NAME,
        "",
        max_age=0,
        httponly=True,
        secure=_secure(),
        samesite=_samesite(),
        path="/",
    )
