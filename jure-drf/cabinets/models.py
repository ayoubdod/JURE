import os
import uuid
from django.core.exceptions import ValidationError
from django.db import models
from django_extensions.db.models import TimeStampedModel
from django.utils.translation import gettext_lazy as _
from lawyers.models import Specialization
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from users.models import User


def cabinet_logo_upload_to(instance, filename):
    """Generate a unique path per upload so the URL changes and browsers don't serve cached old logo."""
    ext = os.path.splitext(filename)[1].lower() or '.png'
    ident = instance.pk if instance.pk else uuid.uuid4().hex[:12]
    return f'cabinet_logos/{ident}_{uuid.uuid4().hex[:12]}{ext}'


def validate_ice_length(value):
    """Compatibility validator retained for historical migrations."""
    if value and (not value.isdigit() or len(value) != 15):
        raise ValidationError(_('ICE must contain exactly 15 digits.'))


class Cabinet(TimeStampedModel):
    class PracticeType(models.TextChoices):
        LAW_OFFICE = "LAW_OFFICE", _("Law Office")
        LAW_FIRM = "LAW_FIRM", _("Law Firm")

    owner: models.OneToOneField['User'] = models.OneToOneField(
        'users.User', on_delete=models.CASCADE, related_name='owned_cabinet'
    )
    specialization: models.ForeignKey['Specialization'] = models.ForeignKey(
        Specialization, on_delete=models.SET_NULL, null=True, blank=True
    )
    trade_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    business_address = models.CharField(max_length=255)
    founded_date = models.DateField(blank=True, null=True)
    structure_type = models.CharField(_('structure type'), max_length=100, blank=True, null=True)
    practice_type = models.CharField(
        _('practice type'),
        max_length=20,
        choices=PracticeType.choices,
        blank=True,
        null=True,
        db_index=True,
    )
    jurisdiction = models.ForeignKey(
        'jurisdictions.Jurisdiction',
        on_delete=models.PROTECT,
        related_name='cabinets',
        null=True,
        blank=True,
    )
    team_size = models.PositiveIntegerField(_('team size'), default=1)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(_('logo'), upload_to=cabinet_logo_upload_to, null=True, blank=True)

    def __str__(self) -> str:
        return self.trade_name
