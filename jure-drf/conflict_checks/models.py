"""Persistable conflict-check runs and potential matches (not legal determinations)."""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_extensions.db.models import TimeStampedModel


class ConflictCheck(TimeStampedModel):
    """One authorized conflict-search run for a cabinet."""

    class ReviewStatus(models.TextChoices):
        PENDING_REVIEW = "PENDING_REVIEW", _("Pending Review")
        REVIEWED_NO_CONFLICT = "REVIEWED_NO_CONFLICT", _("Reviewed — No Conflict")
        CONFLICT_IDENTIFIED = "CONFLICT_IDENTIFIED", _("Conflict Identified")
        WAIVER_REQUIRED = "WAIVER_REQUIRED", _("Waiver Required")
        DISMISSED = "DISMISSED", _("Dismissed")

    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="conflict_checks",
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conflict_checks_initiated",
    )
    matter = models.ForeignKey(
        "cases.Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conflict_checks",
        help_text="Optional matter this check is associated with (e.g. during creation).",
    )
    search_query = models.CharField(max_length=255)
    result_count = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=32,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING_REVIEW,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conflict_checks_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created"]
        indexes = [
            models.Index(fields=["cabinet", "-created"]),
            models.Index(fields=["cabinet", "search_query"]),
        ]

    def __str__(self) -> str:
        return f'ConflictCheck("{self.search_query}", {self.result_count})'


class PotentialMatch(TimeStampedModel):
    """A potential relationship hit found during a conflict check."""

    class EntityType(models.TextChoices):
        CLIENT = "CLIENT", _("Client")
        ORGANIZATION = "ORGANIZATION", _("Organization")
        PARTY = "PARTY", _("Party")
        COUNSEL = "COUNSEL", _("Counsel")
        RELATED_PARTY = "RELATED_PARTY", _("Related Party")

    class MatchType(models.TextChoices):
        EXACT = "EXACT", _("Exact")
        HIGH = "HIGH", _("High")
        POSSIBLE = "POSSIBLE", _("Possible")

    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending Review")
        NO_CONFLICT = "NO_CONFLICT", _("Reviewed — No Conflict")
        CONFLICT = "CONFLICT", _("Conflict Identified")
        WAIVER = "WAIVER", _("Waiver Required")
        DISMISSED = "DISMISSED", _("Dismissed")

    class Role(models.TextChoices):
        CLIENT = "CLIENT", _("Client")
        FORMER_CLIENT = "FORMER_CLIENT", _("Former Client")
        OPPOSING_PARTY = "OPPOSING_PARTY", _("Opposing Party")
        OPPOSING_COUNSEL = "OPPOSING_COUNSEL", _("Opposing Counsel")
        THIRD_PARTY = "THIRD_PARTY", _("Third Party")
        RELATED_PARTY = "RELATED_PARTY", _("Related Party")
        PLAINTIFF = "PLAINTIFF", _("Plaintiff")
        DEFENDANT = "DEFENDANT", _("Defendant")
        OTHER = "OTHER", _("Other Participant")

    conflict_check = models.ForeignKey(
        ConflictCheck,
        on_delete=models.CASCADE,
        related_name="matches",
    )
    entity_type = models.CharField(max_length=32, choices=EntityType.choices)
    entity_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="User id when the entity is a client; null for free-text parties.",
    )
    entity_name = models.CharField(max_length=255)
    matter = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="conflict_potential_matches",
    )
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.OTHER)
    match_type = models.CharField(max_length=16, choices=MatchType.choices)
    confidence = models.FloatField(default=0.0)
    match_reason = models.CharField(max_length=255, blank=True, default="")
    review_status = models.CharField(
        max_length=32,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conflict_matches_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-confidence", "entity_name", "id"]
        indexes = [
            models.Index(fields=["conflict_check", "match_type"]),
            models.Index(fields=["matter", "role"]),
        ]

    def __str__(self) -> str:
        return f"{self.entity_name} ({self.role}) @ {self.matter_id}"
