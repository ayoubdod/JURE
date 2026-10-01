from __future__ import annotations

import os

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_extensions.db.models import TimeStampedModel


def consultation_attachment_upload_to(instance, filename):
    base, ext = os.path.splitext(filename)
    safe = "".join(c for c in base if c.isalnum() or c in ("-", "_"))[:80] or "file"
    req_id = getattr(instance, "consultation_id", None) or "new"
    return f"consultation_requests/{req_id}/{safe}{ext.lower()}"


class ConsultationRequest(TimeStampedModel):
    """Client-initiated consultation request managed by the law firm."""

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", _("Submitted")
        UNDER_REVIEW = "UNDER_REVIEW", _("Under review")
        NEEDS_INFORMATION = "NEEDS_INFORMATION", _("Needs information")
        ASSIGNED = "ASSIGNED", _("Assigned")
        CONFIRMED = "CONFIRMED", _("Confirmed")
        IN_PROGRESS = "IN_PROGRESS", _("In progress")
        COMPLETED = "COMPLETED", _("Completed")
        DECLINED = "DECLINED", _("Declined")

    class LegalArea(models.TextChoices):
        BUSINESS = "BUSINESS", _("Business law")
        LABOR = "LABOR", _("Labor law")
        REAL_ESTATE = "REAL_ESTATE", _("Real estate law")
        COMMERCIAL = "COMMERCIAL", _("Commercial law")
        CORPORATE = "CORPORATE", _("Corporate law")
        TAX = "TAX", _("Tax law")
        IP = "IP", _("Intellectual property")
        DATA_PROTECTION = "DATA_PROTECTION", _("Data protection")
        OTHER = "OTHER", _("Other")

    class PreferredFormat(models.TextChoices):
        CHAT = "CHAT", _("JURE Chat")
        VIDEO = "VIDEO", _("Video consultation")
        PHONE = "PHONE", _("Phone")
        IN_PERSON = "IN_PERSON", _("In-person")

    class Priority(models.TextChoices):
        LOW = "LOW", _("Low")
        NORMAL = "NORMAL", _("Normal")
        HIGH = "HIGH", _("High")

    reference = models.CharField(max_length=32, db_index=True)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consultation_requests",
    )
    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="consultation_requests",
    )
    related_case = models.ForeignKey(
        "cases.Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_requests",
    )
    subject = models.CharField(max_length=255)
    legal_area = models.CharField(
        max_length=32,
        choices=LegalArea.choices,
        default=LegalArea.OTHER,
    )
    description = models.TextField()
    preferred_format = models.CharField(
        max_length=20,
        choices=PreferredFormat.choices,
        default=PreferredFormat.CHAT,
    )
    preferred_datetime = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.SUBMITTED,
        db_index=True,
    )
    assigned_lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_consultation_requests",
    )
    priority = models.CharField(
        max_length=16,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    conversation = models.ForeignKey(
        "chat.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_requests",
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created"]
        indexes = [
            models.Index(fields=["cabinet", "status"]),
            models.Index(fields=["cabinet", "client"]),
            models.Index(fields=["cabinet", "assigned_lawyer"]),
        ]

    def __str__(self) -> str:
        return f"{self.reference} — {self.subject}"

    @property
    def chat_available(self) -> bool:
        return (
            self.status
            in (
                self.Status.CONFIRMED,
                self.Status.IN_PROGRESS,
                self.Status.COMPLETED,
            )
            and self.conversation_id is not None
        )


class ConsultationComment(TimeStampedModel):
    class Visibility(models.TextChoices):
        CLIENT = "CLIENT", _("Client-facing")
        INTERNAL = "INTERNAL", _("Internal")

    consultation = models.ForeignKey(
        ConsultationRequest,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="consultation_comments",
    )
    content = models.TextField()
    visibility = models.CharField(
        max_length=16,
        choices=Visibility.choices,
        default=Visibility.CLIENT,
    )

    class Meta:
        ordering = ["created"]


class ConsultationEvent(TimeStampedModel):
    class EventType(models.TextChoices):
        CREATED = "CREATED", _("Created")
        STATUS_CHANGED = "STATUS_CHANGED", _("Status changed")
        LAWYER_ASSIGNED = "LAWYER_ASSIGNED", _("Lawyer assigned")
        COMMENT_ADDED = "COMMENT_ADDED", _("Comment added")
        DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED", _("Document uploaded")
        CONFIRMED = "CONFIRMED", _("Confirmed")
        DECLINED = "DECLINED", _("Declined")
        CHAT_ACTIVATED = "CHAT_ACTIVATED", _("Chat activated")
        INFORMATION_REQUESTED = "INFORMATION_REQUESTED", _("Information requested")

    consultation = models.ForeignKey(
        ConsultationRequest,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_events",
    )
    metadata = models.JSONField(default=dict, blank=True)
    # When True, event is shown in the client portal timeline.
    client_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["created"]


class ConsultationAttachment(TimeStampedModel):
    consultation = models.ForeignKey(
        ConsultationRequest,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to=consultation_attachment_upload_to)
    original_name = models.CharField(max_length=255, blank=True, default="")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_attachments_uploaded",
    )

    def display_name(self) -> str:
        return (
            (self.original_name or "").strip()
            or (self.file.name.rsplit("/", 1)[-1] if self.file else "")
        )


class ConsultationReferenceSequence(models.Model):
    """Per-cabinet yearly counters for CR- references."""

    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="consultation_request_sequences",
    )
    year = models.PositiveIntegerField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cabinet", "year"],
                name="uniq_consultation_request_sequence",
            )
        ]
