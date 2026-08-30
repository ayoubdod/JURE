import uuid

from django.conf import settings
from django.db import models


class JuriaMessage(models.Model):
    """A single message in a Juria thread (user, assistant, or system)."""

    class Role(models.TextChoices):
        USER = "USER", "USER"
        ASSISTANT = "ASSISTANT", "ASSISTANT"
        SYSTEM = "SYSTEM", "SYSTEM"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        "juria.JuriaConversation",
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )
    thread = models.ForeignKey(
        "juria.JuriaThread",
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_messages",
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    mode = models.CharField(max_length=30)
    has_attachment = models.BooleanField(default=False)
    attachment_name = models.CharField(max_length=255, blank=True)
    attachment_type = models.CharField(max_length=50, blank=True)
    attachment_path = models.CharField(max_length=500, blank=True)
    tokens_used = models.IntegerField(null=True, blank=True)
    response_time_ms = models.IntegerField(null=True, blank=True)
    juria_message_id = models.CharField(max_length=100, blank=True)
    generated_document_path = models.CharField(max_length=500, blank=True)
    parent_message = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_messages",
    )
    language = models.CharField(max_length=16, blank=True, default="")
    sources = models.JSONField(default=list, blank=True)
    analysis = models.JSONField(default=dict, blank=True)
    proposed_actions = models.JSONField(default=list, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_superseded = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["thread", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"JuriaMessage({self.id}, role={self.role})"


class JuriaMessageVersion(models.Model):
    """Preserved prompt/response versions for legal audit history."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        JuriaMessage,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    content = models.TextField()
    version_number = models.PositiveIntegerField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_message_versions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["message", "version_number"]]
        ordering = ["version_number"]
