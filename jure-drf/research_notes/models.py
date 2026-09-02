"""Cabinet-scoped research notebook notes persisted for legal research."""
from __future__ import annotations

from django.conf import settings
from django.db import models
from django_extensions.db.models import TimeStampedModel


class ResearchNote(TimeStampedModel):
    """
    A research note belonging to one author inside a cabinet.

    Each user only sees and mutates their own notes. Optionally associated
    with a matter/case when opened from matter context. Cabinet and author
    are always derived from the authenticated user on write.
    """

    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="research_notes",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="research_notes_authored",
    )
    matter = models.ForeignKey(
        "cases.Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="research_notes",
        help_text="Optional matter this note is associated with.",
    )
    title = models.CharField(max_length=255)
    citation = models.CharField(
        max_length=512,
        blank=True,
        default="",
        help_text="Source / citation / legal reference (e.g. article, case cite).",
    )
    content = models.TextField(
        blank=True,
        default="",
        help_text="Key holding, findings, and relevance notes.",
    )

    class Meta:
        ordering = ["-modified", "-created"]
        indexes = [
            models.Index(fields=["cabinet", "-modified"]),
            models.Index(fields=["cabinet", "matter"]),
            models.Index(
                fields=["cabinet", "author", "-modified"],
                name="research_no_cab_author_idx",
            ),
        ]

    def __str__(self) -> str:
        return f'ResearchNote("{self.title[:60]}", cabinet={self.cabinet_id})'
