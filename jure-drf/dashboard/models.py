import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone
from django_extensions.db.models import TimeStampedModel

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

    Targeting is many-to-many: only users whose cabinet is in
    ``target_cabinets`` may receive the announcement. An empty
    target set means nobody receives it (no implicit global).
    """

    class AnnouncementType(models.TextChoices):
        INFO = "INFO", "Info"
        SUCCESS = "SUCCESS", "Success"
        WARNING = "WARNING", "Warning"
        IMPORTANT = "IMPORTANT", "Important"

    class MediaKind(models.TextChoices):
        IMAGE = "IMAGE", "Image"
        VIDEO = "VIDEO", "Video"

    TYPE_PRIORITY = {
        AnnouncementType.IMPORTANT: 0,
        AnnouncementType.WARNING: 1,
        AnnouncementType.INFO: 2,
        AnnouncementType.SUCCESS: 3,
    }

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
    target_cabinets = models.ManyToManyField(
        "cabinets.Cabinet",
        related_name="announcements",
        blank=True,
    )

    class Meta:
        ordering = ["-created"]

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

    def clean(self):
        super().clean()
        if self.media:
            validate_announcement_media(self.media)
            kind = self.detect_media_kind(self.media.name)
            if not kind:
                raise ValidationError({"media": "Unsupported media type."})
            self.media_kind = kind
        elif not self.media:
            self.media_kind = ""

    def save(self, *args, **kwargs):
        if self.media:
            self.media_kind = self.detect_media_kind(self.media.name)
        else:
            self.media_kind = ""
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
        Announcements that are active, in schedule, and target ``cabinet``.
        Ordered by type priority then newest first.
        """
        if cabinet is None:
            return cls.objects.none()

        qs = (
            cls.objects.filter(is_active=True)
            .filter(cls.scheduled_q(at))
            .filter(target_cabinets=cabinet)
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
            )
        ).order_by("type_priority", "-created")

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
