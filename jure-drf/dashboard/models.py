import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Case, DateTimeField, IntegerField, Q, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_extensions.db.models import TimeStampedModel

from jurisdictions.constants import VisibilityScope
from jurisdictions.scoping import (
    announcements_visible_to_cabinet_q,
    validate_visibility_scope,
)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg", ".mov", ".m4v"}


def announcement_media_upload_to(instance, filename):
    base, ext = os.path.splitext(filename)
    safe = "".join(c for c in base if c.isalnum() or c in ("-", "_"))[:80] or "media"
    return f"announcements/{safe}{ext.lower()}"


def validate_announcement_media(file_obj):
    name = getattr(file_obj, "name", "") or ""
    ext = os.path.splitext(name)[1].lower()
    if ext not in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS:
        raise ValidationError(
            "Unsupported media type. Upload an image "
            f"({', '.join(sorted(IMAGE_EXTENSIONS))}) or video "
            f"({', '.join(sorted(VIDEO_EXTENSIONS))})."
        )


class Announcement(TimeStampedModel):
    """
    Platform broadcast shown on the cabinet dashboard.

    Visibility is GLOBAL (all jurisdictions), JURISDICTION (one country),
    or CABINET (explicit target_cabinets). Empty cabinet targeting means
    nobody receives a CABINET-scoped announcement.
    """

    class AnnouncementType(models.TextChoices):
        INFO = "INFO", "Information"
        PRODUCT_UPDATE = "PRODUCT_UPDATE", "Product Update"
        FEATURE = "FEATURE", "Feature"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        WARNING = "WARNING", "Warning"
        IMPORTANT = "IMPORTANT", "Important"
        SUCCESS = "SUCCESS", "Success"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        SCHEDULED = "SCHEDULED", "Scheduled"
        ARCHIVED = "ARCHIVED", "Archived"

    class Priority(models.IntegerChoices):
        LOW = 0, "Low"
        NORMAL = 1, "Normal"
        HIGH = 2, "High"
        URGENT = 3, "Urgent"

    class MediaKind(models.TextChoices):
        IMAGE = "IMAGE", "Image"
        VIDEO = "VIDEO", "Video"

    TYPE_PRIORITY = {
        AnnouncementType.IMPORTANT: 0,
        AnnouncementType.WARNING: 1,
        AnnouncementType.MAINTENANCE: 2,
        AnnouncementType.PRODUCT_UPDATE: 3,
        AnnouncementType.FEATURE: 4,
        AnnouncementType.INFO: 5,
        AnnouncementType.SUCCESS: 6,
    }

    LIVE_STATUSES = (Status.PUBLISHED, Status.SCHEDULED)

    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    announcement_type = models.CharField(
        max_length=20,
        choices=AnnouncementType.choices,
        default=AnnouncementType.INFO,
        db_index=True,
    )
    media = models.FileField(
        verbose_name="Image or video",
        upload_to=announcement_media_upload_to,
        null=True,
        blank=True,
        validators=[validate_announcement_media],
        help_text="Optional. Images: jpg, png, gif, webp. Videos: mp4, webm, mov.",
    )
    media_kind = models.CharField(
        max_length=10,
        choices=MediaKind.choices,
        blank=True,
        default="",
        help_text="Auto-detected from the uploaded file.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    priority = models.PositiveSmallIntegerField(
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    link_url = models.CharField(
        "Learn more URL",
        max_length=500,
        blank=True,
        default="",
        help_text=(
            "Optional. Opens from the dashboard announcement. "
            "Use an in-app path such as /dashboard/juria, or a full HTTPS URL."
        ),
    )
    link_label = models.CharField(
        "Learn more button text",
        max_length=80,
        blank=True,
        default="",
        help_text='Optional. Shown on the dashboard button, e.g. "Learn more".',
    )
    start_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="If empty, eligible immediately once active.",
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="If empty, never expires while active.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_announcements",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_announcements",
    )
    target_cabinets = models.ManyToManyField(
        "cabinets.Cabinet",
        related_name="announcements",
        blank=True,
    )
    visibility_scope = models.CharField(
        max_length=16,
        choices=VisibilityScope.choices,
        default=VisibilityScope.CABINET,
        db_index=True,
    )
    jurisdiction = models.ForeignKey(
        "jurisdictions.Jurisdiction",
        on_delete=models.PROTECT,
        related_name="announcements",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created"]
        indexes = [
            models.Index(
                fields=["visibility_scope", "jurisdiction"],
                name="dash_ann_scope_jur_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                name="announcement_scope_jurisdiction_consistent",
                condition=(
                    Q(visibility_scope=VisibilityScope.GLOBAL, jurisdiction__isnull=True)
                    | Q(visibility_scope=VisibilityScope.JURISDICTION, jurisdiction__isnull=False)
                    | Q(visibility_scope=VisibilityScope.CABINET)
                ),
            ),
        ]

    def __str__(self):
        return self.title

    @staticmethod
    def detect_media_kind(filename: str) -> str:
        ext = os.path.splitext(filename or "")[1].lower()
        if ext in IMAGE_EXTENSIONS:
            return Announcement.MediaKind.IMAGE
        if ext in VIDEO_EXTENSIONS:
            return Announcement.MediaKind.VIDEO
        return ""

    def sync_status_and_active(self, at=None):
        """Keep status / is_active aligned with the schedule window."""
        at = at or timezone.now()
        status = self.status or self.Status.DRAFT
        if status == self.Status.ARCHIVED:
            self.is_active = False
            return
        if status == self.Status.DRAFT:
            self.is_active = False
            return
        if self.start_date and self.start_date > at:
            self.status = self.Status.SCHEDULED
            self.is_active = True
            return
        self.status = self.Status.PUBLISHED
        self.is_active = True

    def clean(self):
        from .link_validation import validate_announcement_link

        super().clean()
        if self.media:
            validate_announcement_media(self.media)
            kind = self.detect_media_kind(self.media.name)
            if not kind:
                raise ValidationError({"media": "Unsupported media type."})
            self.media_kind = kind
        elif not self.media:
            self.media_kind = ""
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date must be after start date."})
        try:
            self.link_url = validate_announcement_link(self.link_url)
        except ValidationError as exc:
            raise ValidationError({"link_url": exc.messages}) from exc
        self.link_label = (self.link_label or "").strip()
        if self.link_label and not self.link_url:
            raise ValidationError(
                {"link_url": "A URL is required when a learn-more label is set."}
            )
        if self.visibility_scope == VisibilityScope.GLOBAL:
            self.jurisdiction = None
        validate_visibility_scope(
            visibility_scope=self.visibility_scope,
            jurisdiction=self.jurisdiction,
        )
        self.sync_status_and_active()

    def save(self, *args, **kwargs):
        if self.visibility_scope == VisibilityScope.GLOBAL:
            self.jurisdiction = None
        if self.media:
            self.media_kind = self.detect_media_kind(self.media.name)
        else:
            self.media_kind = ""
        self.sync_status_and_active()
        super().save(*args, **kwargs)

    @classmethod
    def scheduled_q(cls, at=None):
        """Q filter: within optional start/end window (timezone-aware)."""
        at = at or timezone.now()
        return (
            Q(start_date__isnull=True) | Q(start_date__lte=at)
        ) & (
            Q(end_date__isnull=True) | Q(end_date__gte=at)
        )

    @classmethod
    def active_for_cabinet(cls, cabinet, *, at=None, exclude_ids=None):
        """
        Announcements that are active, in schedule, and visible to ``cabinet``:
        GLOBAL + cabinet jurisdiction + cabinet-targeted private rows.
        Ordered by type priority then newest first.
        """
        if cabinet is None:
            return cls.objects.none()

        qs = (
            cls.objects.filter(is_active=True, status__in=cls.LIVE_STATUSES)
            .filter(cls.scheduled_q(at))
            .filter(announcements_visible_to_cabinet_q(cabinet))
            .distinct()
        )
        if exclude_ids:
            qs = qs.exclude(pk__in=exclude_ids)

        priority_whens = [
            When(announcement_type=t, then=Value(p))
            for t, p in cls.TYPE_PRIORITY.items()
        ]
        return qs.annotate(
            type_priority=Case(
                *priority_whens,
                default=Value(99),
                output_field=IntegerField(),
            ),
            sort_start=Coalesce("start_date", "created", output_field=DateTimeField()),
        ).order_by("-priority", "type_priority", "-sort_start", "-created")

    @classmethod
    def pick_for_cabinet(cls, cabinet, *, at=None, exclude_ids=None):
        """Single best announcement for the dashboard card (MVP)."""
        return cls.active_for_cabinet(
            cabinet, at=at, exclude_ids=exclude_ids
        ).first()


class ActivityLog(TimeStampedModel):
    """Optional manual activity stream (you can also auto-build stream from other apps)."""
    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.CASCADE)
    kind = models.CharField(max_length=50)  # e.g., task_completed, client_added, document_uploaded
    message = models.CharField(max_length=255)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    entity_type = models.CharField(max_length=64, blank=True, default="")
    entity_id = models.CharField(max_length=64, blank=True, default="")
    previous_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
