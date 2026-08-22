from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_extensions.db.models import TimeStampedModel


class Jurisdiction(TimeStampedModel):
    """A legal market (country / legal system). Not a content scope."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", _("Active")
        INACTIVE = "INACTIVE", _("Inactive")

    code = models.CharField(
        max_length=8,
        unique=True,
        db_index=True,
        help_text=_("Stable identifier, e.g. MA, QA. Never a display name."),
    )
    name = models.CharField(max_length=120)
    country_code = models.CharField(
        max_length=2,
        help_text=_("ISO 3166-1 alpha-2 country code."),
    )
    legal_system = models.CharField(max_length=64, blank=True, default="")
    default_language = models.CharField(max_length=8, default="en")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ["code"]
        verbose_name = _("jurisdiction")
        verbose_name_plural = _("jurisdictions")

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"

    def clean(self):
        super().clean()
        self.code = (self.code or "").strip().upper()
        self.country_code = (self.country_code or "").strip().upper()
        if self.code and not self.code.isalnum():
            raise ValidationError({"code": _("Use a stable alphanumeric code such as MA or QA.")})
        if self.country_code and len(self.country_code) != 2:
            raise ValidationError({"country_code": _("Country code must be ISO 3166-1 alpha-2.")})

    def save(self, *args, **kwargs):
        self.code = (self.code or "").strip().upper()
        self.country_code = (self.country_code or "").strip().upper()
        super().save(*args, **kwargs)

    def has_dependent_data(self) -> bool:
        return (
            self.cabinets.exists()
            or self.documents.exists()
            or self.announcements.exists()
        )
