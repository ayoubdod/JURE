import uuid

from django.conf import settings
from django.db import models

from juria.models.conversation import JuriaConversation


class JuriaThread(models.Model):
    """A conversation thread inside a Juria project."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "juria.JuriaProject",
        on_delete=models.CASCADE,
        related_name="threads",
    )
    title = models.CharField(max_length=200, blank=True, default="")
    mode = models.CharField(
        max_length=30,
        choices=JuriaConversation.Mode.choices,
        default=JuriaConversation.Mode.CHAT,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_threads_created",
    )
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["project", "is_archived", "is_deleted"]),
        ]

    def __str__(self) -> str:
        return f"JuriaThread({self.title or self.id})"
