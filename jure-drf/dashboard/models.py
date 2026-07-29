from django.db import models
from django.conf import settings
from django_extensions.db.models import TimeStampedModel

class Announcement(TimeStampedModel):
    """Lightweight broadcast for the dashboard hero card."""
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    # Scope to a cabinet if you want per-tenant announcements (nullable means global)
    cabinet = models.ForeignKey("cabinets.Cabinet", null=True, blank=True, on_delete=models.CASCADE)

    class Meta:
        ordering = ["-created"]

class ActivityLog(TimeStampedModel):
    """Optional manual activity stream (you can also auto-build stream from other apps)."""
    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.CASCADE)
    kind = models.CharField(max_length=50)  # e.g., task_completed, client_added, document_uploaded
    message = models.CharField(max_length=255)
