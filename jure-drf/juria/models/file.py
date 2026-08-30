import uuid

from django.conf import settings
from django.db import models

from juria.constants import OcrStatus


class JuriaFile(models.Model):
    """A file uploaded into a Juria project (PDF/DOCX)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "juria.JuriaProject",
        on_delete=models.CASCADE,
        related_name="files",
    )
    file = models.FileField(upload_to="juria/project_files/%Y/%m/")
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True, default="")
    file_kind = models.CharField(max_length=16, blank=True, default="")  # pdf | docx
    size_bytes = models.IntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="juria_files_uploaded",
    )
    extracted_text = models.TextField(blank=True, default="")
    page_count = models.IntegerField(null=True, blank=True)
    ocr_status = models.CharField(
        max_length=16,
        choices=OcrStatus.choices,
        default=OcrStatus.PENDING,
    )
    chunks = models.JSONField(default=list, blank=True)
    is_removed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_name or str(self.id)
