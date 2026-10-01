"""Privacy Gateway models — cabinet-isolated policies and encrypted mappings."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_extensions.db.models import TimeStampedModel

from privacy.constants import EntityType, PrivacyMode


class CabinetPrivacyPolicy(TimeStampedModel):
    """Per-cabinet default privacy behaviour for JURIA egress."""

    cabinet = models.OneToOneField(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="privacy_policy",
    )
    default_mode = models.CharField(
        max_length=20,
        choices=PrivacyMode.choices,
        default=PrivacyMode.PSEUDONYMIZED,
        db_index=True,
    )
    require_pseudonymization_for_documents = models.BooleanField(
        default=True,
        help_text=_("Force Pseudonymized mode when documents or retrieved context are sent."),
    )
    reidentification_requires_authorization = models.BooleanField(
        default=True,
        help_text=_("Only cabinet staff may restore pseudonyms after AI responses."),
    )

    class Meta:
        verbose_name = _("cabinet privacy policy")
        verbose_name_plural = _("cabinet privacy policies")

    def __str__(self) -> str:
        return f"PrivacyPolicy({self.cabinet_id}, {self.default_mode})"


class PseudonymMappingSession(models.Model):
    """One AI-egress sanitization scope (request / document set)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="privacy_sessions",
    )
    project = models.ForeignKey(
        "juria.JuriaProject",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="privacy_sessions",
    )
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="privacy_sessions",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="privacy_sessions_created",
    )
    jurisdiction_code = models.CharField(max_length=8, blank=True, default="")
    mode = models.CharField(
        max_length=20,
        choices=PrivacyMode.choices,
        default=PrivacyMode.PSEUDONYMIZED,
    )
    entity_counts = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Counts by entity type only — never original values."),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["cabinet", "created_at"]),
            models.Index(fields=["cabinet", "project"]),
        ]

    def __str__(self) -> str:
        return f"PrivacySession({self.id})"


class PseudonymMapping(models.Model):
    """Encrypted real-value ↔ opaque token mapping. Never expose ciphertext via API."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        PseudonymMappingSession,
        on_delete=models.CASCADE,
        related_name="mappings",
    )
    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="privacy_mappings",
        help_text=_("Denormalized for cabinet queryset isolation."),
    )
    token = models.CharField(max_length=64, db_index=True)
    entity_type = models.CharField(max_length=32, choices=EntityType.choices, db_index=True)
    value_hash = models.CharField(
        max_length=64,
        help_text=_("HMAC of normalized value for stable token lookup within a session."),
    )
    encrypted_value = models.TextField(
        help_text=_("AES-256-GCM ciphertext (nonce + tag + ciphertext), base64-encoded."),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "token"],
                name="uniq_privacy_session_token",
            ),
            models.UniqueConstraint(
                fields=["session", "entity_type", "value_hash"],
                name="uniq_privacy_session_entity_hash",
            ),
        ]
        indexes = [
            models.Index(fields=["cabinet", "session"]),
            models.Index(fields=["cabinet", "token"]),
        ]

    def __str__(self) -> str:
        return f"Mapping({self.token}, {self.entity_type})"
