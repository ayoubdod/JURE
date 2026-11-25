"""Record, read, and attach cookie decisions.

Authentication login is not hooked. An anonymous decision is attached to the
user on the next consent request after they are authenticated, and only when
that user does not already have a current decision.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from django.conf import settings
from django.db import IntegrityError, transaction

from cookie_consent.models import CookieConsent, CookieConsentEvent


@dataclass(frozen=True)
class ConsentWriteResult:
    consent: CookieConsent
    created: bool
    set_anonymous_id: uuid.UUID | None
    clear_anonymous_cookie: bool


def policy_version() -> str:
    return settings.COOKIE_CONSENT_POLICY_VERSION


def analytics_configured() -> bool:
    return bool(settings.COOKIE_ANALYTICS_CONFIGURED)


def parse_anonymous_id(raw: str | None) -> uuid.UUID | None:
    if not raw:
        return None
    try:
        return uuid.UUID(str(raw))
    except (ValueError, TypeError, AttributeError):
        return None


def anonymous_id_from_request(request) -> uuid.UUID | None:
    return parse_anonymous_id(request.COOKIES.get(settings.COOKIE_CONSENT_COOKIE_NAME))


def decision_payload(row: CookieConsent | None) -> dict | None:
    if row is None:
        return None
    current = policy_version()
    stale = row.policy_version != current
    analytics_on = (
        row.analytics and analytics_configured() and not stale
    )
    functional_on = row.functional and not stale
    return {
        "action": row.action,
        "functional": row.functional,
        "analytics": row.analytics,
        "policy_version": row.policy_version,
        "updated_at": row.updated_at,
        "stale": stale,
        "effective_functional": functional_on,
        "effective_analytics": analytics_on,
    }


def envelope(row: CookieConsent | None, *, subject: str) -> dict:
    return {
        "policy_version": policy_version(),
        "analytics_configured": analytics_configured(),
        "subject": subject,
        "decision": decision_payload(row),
    }


def current_for_request(request) -> CookieConsent | None:
    if request.user.is_authenticated:
        return CookieConsent.objects.filter(user=request.user).first()
    anonymous_id = anonymous_id_from_request(request)
    if anonymous_id is None:
        return None
    return CookieConsent.objects.filter(anonymous_id=anonymous_id).first()


def link_anonymous_to_user(user, anonymous_id: uuid.UUID | None) -> bool:
    """Move an anonymous current row onto the user, or drop it if the user already chose.

    Returns True when the browser cookie should be cleared.
    """
    if anonymous_id is None or not getattr(user, "is_authenticated", False):
        return False
    with transaction.atomic():
        anonymous = (
            CookieConsent.objects.select_for_update()
            .filter(anonymous_id=anonymous_id)
            .first()
        )
        if anonymous is None:
            return True
        existing = (
            CookieConsent.objects.select_for_update().filter(user=user).first()
        )
        if existing is None:
            anonymous.user = user
            anonymous.anonymous_id = None
            anonymous.save(update_fields=["user", "anonymous_id", "updated_at"])
        else:
            anonymous.delete()
    return True


def record_consent(
    *,
    user,
    anonymous_id: uuid.UUID | None,
    action: str,
    functional: bool,
    analytics: bool,
    clear_anonymous_cookie: bool = False,
) -> ConsentWriteResult:
    authenticated = bool(user and user.is_authenticated)
    if authenticated:
        if anonymous_id is not None:
            link_anonymous_to_user(user, anonymous_id)
        anonymous_id = None
    elif anonymous_id is None:
        anonymous_id = uuid.uuid4()
        clear_anonymous_cookie = False

    for _attempt in range(2):
        try:
            with transaction.atomic():
                return _record_locked(
                    user=user if authenticated else None,
                    anonymous_id=None if authenticated else anonymous_id,
                    action=action,
                    functional=functional,
                    analytics=analytics,
                    clear_anonymous_cookie=clear_anonymous_cookie and authenticated,
                    set_anonymous_id=None if authenticated else anonymous_id,
                )
        except IntegrityError as exc:
            if authenticated or "unique" not in str(exc).lower():
                raise
            continue
    raise IntegrityError("Could not store a single current cookie decision.")


def _record_locked(
    *,
    user,
    anonymous_id: uuid.UUID | None,
    action: str,
    functional: bool,
    analytics: bool,
    clear_anonymous_cookie: bool,
    set_anonymous_id: uuid.UUID | None,
) -> ConsentWriteResult:
    if user is not None:
        row = CookieConsent.objects.select_for_update().filter(user=user).first()
    else:
        row = (
            CookieConsent.objects.select_for_update()
            .filter(anonymous_id=anonymous_id)
            .first()
        )
    version = policy_version()
    if (
        row is not None
        and row.action == action
        and row.functional == functional
        and row.analytics == analytics
        and row.policy_version == version
    ):
        return ConsentWriteResult(
            consent=row,
            created=False,
            set_anonymous_id=set_anonymous_id if row.anonymous_id else None,
            clear_anonymous_cookie=clear_anonymous_cookie,
        )

    created = row is None
    if row is None:
        row = CookieConsent(
            user=user,
            anonymous_id=anonymous_id,
            action=action,
            functional=functional,
            analytics=analytics,
            policy_version=version,
        )
        row.save()
    else:
        row.action = action
        row.functional = functional
        row.analytics = analytics
        row.policy_version = version
        row.save(
            update_fields=[
                "action",
                "functional",
                "analytics",
                "policy_version",
                "updated_at",
            ]
        )

    CookieConsentEvent.objects.create(
        user=user,
        anonymous_id=anonymous_id,
        action=action,
        functional=functional,
        analytics=analytics,
        policy_version=version,
    )
    return ConsentWriteResult(
        consent=row,
        created=created,
        set_anonymous_id=set_anonymous_id,
        clear_anonymous_cookie=clear_anonymous_cookie,
    )
