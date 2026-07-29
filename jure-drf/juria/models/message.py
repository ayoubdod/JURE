import uuid

from django.db import models


class JuriaMessage(models.Model):
    """A single message in a Juria conversation (user, assistant, or system)."""

    class Role(models.TextChoices):
        USER = "USER", "USER"
        ASSISTANT = "ASSISTANT", "ASSISTANT"
        SYSTEM = "SYSTEM", "SYSTEM"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        "juria.JuriaConversation",
        on_delete=models.CASCADE,
        related_name="messages",
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"JuriaMessage({self.id}, role={self.role})"
