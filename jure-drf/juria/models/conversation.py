import uuid

from django.conf import settings
from django.db import models


class JuriaConversation(models.Model):
    """
    Legacy conversation session. New work uses JuriaProject + JuriaThread.
    Existing rows are migrated onto a project/thread pair.
    """

    class Mode(models.TextChoices):
        CHAT = "CHAT", "CHAT"
        CONTRACT_ANALYSIS = "CONTRACT_ANALYSIS", "CONTRACT_ANALYSIS"
        LEGAL_RESEARCH = "LEGAL_RESEARCH", "LEGAL_RESEARCH"
        DOCUMENT_DRAFTING = "DOCUMENT_DRAFTING", "DOCUMENT_DRAFTING"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="juria_conversations",
    )
    title = models.CharField(max_length=200, blank=True)
    linked_case = models.ForeignKey(
        "cases.Case",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="juria_conversations",
    )
    mode = models.CharField(max_length=30, choices=Mode.choices)
    is_archived = models.BooleanField(default=False)
    project = models.ForeignKey(
        "juria.JuriaProject",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="legacy_conversations",
    )
    thread = models.ForeignKey(
        "juria.JuriaThread",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="legacy_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"JuriaConversation({self.id}, mode={self.mode})"
