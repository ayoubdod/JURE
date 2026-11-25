"""Current cookie decision plus an append-only history.

One current row per subject. The subject is either an authenticated user or
an opaque anonymous id held in an HttpOnly cookie. Rows do not store IP
addresses, user agents, emails, or case content.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from cookie_consent.constants import OPTIONAL_OFF_ACTIONS, ConsentAction


class CookieConsent(models.Model):
    """The single current decision for a subject."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="cookie_consents",
    )
    anonymous_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=32, choices=ConsentAction.choices)
    functional = models.BooleanField(default=False)
    analytics = models.BooleanField(default=False)
    policy_version = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="cookie_consent_one_subject",
                condition=(
                    Q(user__isnull=False, anonymous_id__isnull=True)
                    | Q(user__isnull=True, anonymous_id__isnull=False)
                ),
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(user__isnull=False),
                name="cookie_consent_user_unique",
            ),
            models.UniqueConstraint(
                fields=["anonymous_id"],
                condition=Q(anonymous_id__isnull=False),
                name="cookie_consent_anon_unique",
            ),
            models.CheckConstraint(
                name="cookie_consent_action_flags",
                condition=(
                    Q(action=ConsentAction.ACCEPT_ALL, functional=True)
                    | Q(action=ConsentAction.CUSTOM)
                    | Q(
                        action__in=OPTIONAL_OFF_ACTIONS,
                        functional=False,
                        analytics=False,
                    )
                ),
            ),
        ]

    def __str__(self) -> str:
        subject = f"user={self.user_id}" if self.user_id else f"anon={self.anonymous_id}"
        return f"CookieConsent({subject}, {self.action})"


class CookieConsentEvent(models.Model):
    """Append-only record of a decision that changed the current state."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="cookie_consent_events",
    )
    anonymous_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=32, choices=ConsentAction.choices)
    functional = models.BooleanField(default=False)
    analytics = models.BooleanField(default=False)
    policy_version = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                name="cookie_consent_event_one_subject",
                condition=(
                    Q(user__isnull=False, anonymous_id__isnull=True)
                    | Q(user__isnull=True, anonymous_id__isnull=False)
                ),
            ),
            models.CheckConstraint(
                name="cookie_consent_event_action_flags",
                condition=(
                    Q(action=ConsentAction.ACCEPT_ALL, functional=True)
                    | Q(action=ConsentAction.CUSTOM)
                    | Q(
                        action__in=OPTIONAL_OFF_ACTIONS,
                        functional=False,
                        analytics=False,
                    )
                ),
            ),
        ]

    def __str__(self) -> str:
        subject = f"user={self.user_id}" if self.user_id else f"anon={self.anonymous_id}"
        return f"CookieConsentEvent({subject}, {self.action})"
