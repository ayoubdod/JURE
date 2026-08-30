import uuid

from django.conf import settings
from django.db import models

from juria.constants import ActivityAction


class JuriaActivity(models.Model):
    """Project-level audit log for professional legal environments."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "juria.JuriaProject",
        on_delete=models.CASCADE,
        related_name="activities",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_activities",
    )
    action = models.CharField(max_length=40, choices=ActivityAction.choices)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} @ {self.project_id}"


class JuriaComment(models.Model):
    """Comment on an artifact or message. Architecture for future collaboration."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "juria.JuriaProject",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    artifact = models.ForeignKey(
        "juria.JuriaArtifact",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    message = models.ForeignKey(
        "juria.JuriaMessage",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="juria_comments",
    )
    body = models.TextField()
    mentioned_user_ids = models.JSONField(default=list, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
