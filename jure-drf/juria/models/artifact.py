import uuid

from django.conf import settings
from django.db import models

from juria.constants import ArtifactType


class JuriaArtifact(models.Model):
    """A generated or edited legal document belonging to a project."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "juria.JuriaProject",
        on_delete=models.CASCADE,
        related_name="artifacts",
    )
    thread = models.ForeignKey(
        "juria.JuriaThread",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="artifacts",
    )
    title = models.CharField(max_length=255)
    artifact_type = models.CharField(
        max_length=40,
        choices=ArtifactType.choices,
        default=ArtifactType.AUTRE,
    )
    content_html = models.TextField(blank=True, default="")
    content_markdown = models.TextField(blank=True, default="")
    current_version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_artifacts_created",
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.title} v{self.current_version}"


class JuriaArtifactVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artifact = models.ForeignKey(
        JuriaArtifact,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    content_html = models.TextField(blank=True, default="")
    content_markdown = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_artifact_versions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        unique_together = [["artifact", "version_number"]]
        ordering = ["version_number"]

    def __str__(self) -> str:
        return f"{self.artifact_id} v{self.version_number}"
