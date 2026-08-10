"""
Legal deadline rules, holidays, and calculated deadlines.

Separation of concerns (mandatory):
- LegalSource / DeadlineRule  → legal configuration (versioned)
- CalculatedDeadline          → matter-bound result (auditable snapshot)
- Task (tasks.Task)           → user work item (existing system)
- DeadlineReminder            → user reminder offsets (not legal rules)
"""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django_extensions.db.models import TimeStampedModel


class LegalSource(TimeStampedModel):
    """Official legal instrument (code / law) with version window."""

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending entry into force")
        IN_FORCE = "in_force", _("In force")
        REPEALED = "repealed", _("Repealed")

    jurisdiction = models.CharField(max_length=8, default="MA", db_index=True)
    code_name = models.CharField(max_length=255)
    law_number = models.CharField(max_length=64)
    title = models.CharField(max_length=512)
    publication_date = models.DateField(null=True, blank=True)
    effective_from = models.DateField()
    effective_until = models.DateField(null=True, blank=True)
    official_reference = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_FORCE)
    source_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-effective_from", "law_number"]
        verbose_name = _("Legal source")
        verbose_name_plural = _("Legal sources")

    def __str__(self) -> str:
        return f"{self.law_number} — {self.title}"

    def is_effective_on(self, on_date) -> bool:
        if on_date < self.effective_from:
            return False
        if self.effective_until and on_date > self.effective_until:
            return False
        return True


class DeadlineRule(TimeStampedModel):
    """
    Versioned procedural deadline rule.

    Historical calculations keep a FK + JSON snapshot of the rule version
    used at calculation time; never overwrite a version in place.
    """

    class LegalDomain(models.TextChoices):
        CIVIL_PROCEDURE = "civil_procedure", _("Civil Procedure")
        COMMERCIAL_PROCEDURE = "commercial_procedure", _("Commercial Procedure")
        LABOUR = "labour", _("Labour")
        FAMILY = "family", _("Family")
        CRIMINAL = "criminal", _("Criminal")
        ADMINISTRATIVE = "administrative", _("Administrative")
        TAX = "tax", _("Tax")
        OTHER = "other", _("Other")

    class ProcedureType(models.TextChoices):
        APPEAL = "appeal", _("Appeal")
        OPPOSITION = "opposition", _("Opposition")
        CASSATION = "cassation", _("Cassation")
        REFERE = "refere", _("Urgent proceedings / référé")
        RESPONSE = "response", _("Response")
        OTHER = "other", _("Other")

    class EventType(models.TextChoices):
        NOTIFICATION = "notification", _("Official notification")
        JUDGMENT = "judgment", _("Judgment")
        FILING = "filing", _("Filing")
        SERVICE = "service", _("Service / signification")
        OTHER = "other", _("Other")

    class DurationUnit(models.TextChoices):
        DAYS = "days", _("Days")
        WEEKS = "weeks", _("Weeks")
        MONTHS = "months", _("Months")
        YEARS = "years", _("Years")

    class ComputationMethod(models.TextChoices):
        DELAI_FRANC = "delai_franc", _("Délai franc")
        CALENDAR_DAYS = "calendar_days", _("Calendar days")
        BUSINESS_DAYS = "business_days", _("Business days")

    class VerificationStatus(models.TextChoices):
        VERIFIED = "verified", _("Verified")
        REQUIRES_VERIFICATION = "requires_verification", _("Requires legal verification")
        INACTIVE = "inactive", _("Inactive")

    code = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=255)
    jurisdiction = models.CharField(max_length=8, default="MA", db_index=True)
    legal_domain = models.CharField(
        max_length=40,
        choices=LegalDomain.choices,
        default=LegalDomain.CIVIL_PROCEDURE,
        db_index=True,
    )
    procedure_type = models.CharField(max_length=40, choices=ProcedureType.choices, db_index=True)
    event_type = models.CharField(max_length=40, choices=EventType.choices, default=EventType.NOTIFICATION)
    duration_value = models.PositiveIntegerField()
    duration_unit = models.CharField(max_length=16, choices=DurationUnit.choices, default=DurationUnit.DAYS)
    computation_method = models.CharField(
        max_length=32,
        choices=ComputationMethod.choices,
        default=ComputationMethod.DELAI_FRANC,
    )
    exclude_triggering_day = models.BooleanField(
        default=True,
        help_text="If True, the triggering event day is not counted (typical for délai franc).",
    )
    adjust_non_working_final_day = models.BooleanField(
        default=True,
        help_text="If True and the final day is a weekend/holiday, prorogate to next working day.",
    )
    # Python weekday(): Mon=0 … Sun=6. Moroccan courts: Sat+Sun non-working by default.
    weekend_days = models.JSONField(default=list, blank=True)

    source = models.ForeignKey(
        LegalSource,
        on_delete=models.PROTECT,
        related_name="rules",
        null=True,
        blank=True,
    )
    article_reference = models.CharField(max_length=128, blank=True)
    version = models.CharField(max_length=32, help_text="Immutable version label, e.g. 1974.1 or 2026.1")
    effective_from = models.DateField()
    effective_until = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True, db_index=True)
    verification_status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.REQUIRES_VERIFICATION,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    special_conditions = models.TextField(blank=True)

    class Meta:
        ordering = ["legal_domain", "procedure_type", "-effective_from"]
        constraints = [
            models.UniqueConstraint(
                fields=["code", "version", "jurisdiction"],
                name="uniq_deadline_rule_code_version_jurisdiction",
            ),
        ]
        verbose_name = _("Deadline rule")
        verbose_name_plural = _("Deadline rules")

    def __str__(self) -> str:
        return f"{self.name} ({self.version})"

    def is_effective_on(self, on_date) -> bool:
        if not self.active:
            return False
        if on_date < self.effective_from:
            return False
        if self.effective_until and on_date > self.effective_until:
            return False
        return True

    def to_snapshot(self) -> dict:
        """Freeze rule fields for auditability of past calculations."""
        return {
            "id": self.pk,
            "code": self.code,
            "name": self.name,
            "jurisdiction": self.jurisdiction,
            "legal_domain": self.legal_domain,
            "procedure_type": self.procedure_type,
            "event_type": self.event_type,
            "duration_value": self.duration_value,
            "duration_unit": self.duration_unit,
            "computation_method": self.computation_method,
            "exclude_triggering_day": self.exclude_triggering_day,
            "adjust_non_working_final_day": self.adjust_non_working_final_day,
            "weekend_days": self.weekend_days or [5, 6],
            "article_reference": self.article_reference,
            "version": self.version,
            "effective_from": self.effective_from.isoformat() if self.effective_from else None,
            "effective_until": self.effective_until.isoformat() if self.effective_until else None,
            "verification_status": self.verification_status,
            "source": {
                "id": self.source_id,
                "law_number": getattr(self.source, "law_number", None),
                "title": getattr(self.source, "title", None),
                "official_reference": getattr(self.source, "official_reference", None),
            }
            if self.source_id
            else None,
            "special_conditions": self.special_conditions,
            "notes": self.notes,
        }


class LegalHoliday(TimeStampedModel):
    """Jurisdiction holiday calendar entry (annual / movable)."""

    class HolidayType(models.TextChoices):
        FIXED = "fixed", _("Fixed national holiday")
        MOVABLE_RELIGIOUS = "movable_religious", _("Movable / religious holiday")
        OTHER = "other", _("Other")

    jurisdiction = models.CharField(max_length=8, default="MA", db_index=True)
    name = models.CharField(max_length=255)
    date = models.DateField(db_index=True)
    year = models.PositiveIntegerField(db_index=True)
    holiday_type = models.CharField(max_length=32, choices=HolidayType.choices, default=HolidayType.FIXED)
    is_legally_relevant = models.BooleanField(
        default=True,
        help_text="Whether this day may affect deadline prorogation when the rule so provides.",
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(
                fields=["jurisdiction", "date", "name"],
                name="uniq_legal_holiday_jurisdiction_date_name",
            ),
        ]
        verbose_name = _("Legal holiday")
        verbose_name_plural = _("Legal holidays")

    def __str__(self) -> str:
        return f"{self.date} — {self.name}"


class CalculatedDeadline(TimeStampedModel):
    """
    Persisted legal deadline for a case/matter.

    Distinct from DeadlineRule (configuration) and from Task (work item).
    """

    class Status(models.TextChoices):
        UPCOMING = "upcoming", _("Upcoming")
        DUE_SOON = "due_soon", _("Due soon")
        DUE_TODAY = "due_today", _("Due today")
        OVERDUE = "overdue", _("Overdue")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="legal_deadlines",
    )
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="legal_deadlines",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legal_deadlines_created",
    )
    rule = models.ForeignKey(
        DeadlineRule,
        on_delete=models.PROTECT,
        related_name="calculated_deadlines",
        help_text="Rule version used at calculation time (do not retarget to a newer version).",
    )
    rule_snapshot = models.JSONField(default=dict, blank=True)
    triggering_event_type = models.CharField(max_length=40)
    triggering_date = models.DateField()
    calculated_deadline = models.DateField(
        help_text="Date produced by the calculation engine (immutable after override).",
    )
    final_deadline = models.DateField(
        help_text="Effective deadline date (equals calculated unless manually overridden).",
    )
    is_manual_override = models.BooleanField(default=False)
    original_calculated_deadline = models.DateField(null=True, blank=True)
    override_reason = models.TextField(blank=True)
    override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legal_deadlines_overridden",
    )
    override_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING, db_index=True)
    calculation_explanation = models.JSONField(default=dict, blank=True)
    contextual_parameters = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    linked_task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legal_deadlines",
    )

    class Meta:
        ordering = ["final_deadline", "-created"]
        indexes = [
            models.Index(fields=["cabinet", "final_deadline"]),
            models.Index(fields=["case", "status"]),
        ]
        verbose_name = _("Calculated deadline")
        verbose_name_plural = _("Calculated deadlines")

    def __str__(self) -> str:
        return f"{self.case_id}: {self.final_deadline} ({self.rule_id})"

    def refresh_status(self, today=None) -> str:
        """Derive status from final_deadline vs today (does not set COMPLETED/CANCELLED)."""
        if self.status in (self.Status.COMPLETED, self.Status.CANCELLED):
            return self.status
        today = today or timezone.localdate()
        delta = (self.final_deadline - today).days
        if delta < 0:
            self.status = self.Status.OVERDUE
        elif delta == 0:
            self.status = self.Status.DUE_TODAY
        elif delta <= 7:
            self.status = self.Status.DUE_SOON
        else:
            self.status = self.Status.UPCOMING
        return self.status


class DeadlineReminder(TimeStampedModel):
    """User-configured reminder offsets — not legal computation rules."""

    deadline = models.ForeignKey(
        CalculatedDeadline,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    days_before = models.PositiveIntegerField(
        help_text="0 = day of deadline; 1 = one day before, etc.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deadline_reminders_created",
    )
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-days_before"]
        constraints = [
            models.UniqueConstraint(
                fields=["deadline", "days_before"],
                name="uniq_deadline_reminder_offset",
            ),
        ]
        verbose_name = _("Deadline reminder")
        verbose_name_plural = _("Deadline reminders")

    def __str__(self) -> str:
        return f"Reminder T-{self.days_before} for deadline {self.deadline_id}"
