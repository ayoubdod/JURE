# cases/models.py
from django.db import models
from django_extensions.db.models import TimeStampedModel
from django.utils.translation import gettext_lazy as _
from django.conf import settings  # ✅ make sure this line exists and is at top
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from users.models import User
    from cabinets.models import Cabinet


class Case(TimeStampedModel):
    """
    Case management model supporting three distinct types: consultation,
    litigation, and administrative. Type-specific data is stored in case_specific_data JSONField.
    """

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_created",
        help_text="Cabinet member who created the case (user who called POST).",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_updated",
        help_text="Cabinet member who last saved the case (set on each PATCH/PUT).",
    )

    class CaseStatus(models.TextChoices):
        OPEN = 'OPEN', _('OPEN')
        CLOSED = 'CLOSED', _('CLOSED')
        IN_PROGRESS = 'IN_PROGRESS', _('IN_PROGRESS')
        CANCELLED = 'CANCELLED', _('CANCELLED')
        PENDING = 'PENDING', _('PENDING')
        ARCHIVED = 'ARCHIVED', _('ARCHIVED')
        CONVERTED_TO_CASE = 'CONVERTED_TO_CASE', _('CONVERTED_TO_CASE')

    class CaseCategory(models.TextChoices):
        CRIMINAL = 'CRIMINAL', _('CRIMINAL')
        CIVIL = 'CIVIL', _('CIVIL')
        ECONOMIC = 'ECONOMIC', _('ECONOMIC')
        ENVIRONMENTAL = 'ENVIRONMENTAL', _('ENVIRONMENTAL')
        SOCIAL = 'SOCIAL', _('SOCIAL')
        OTHER = 'OTHER', _('OTHER')

    # Discriminator for case type; determines which sub-fields are valid in case_specific_data.
    class CaseType(models.TextChoices):
        CONSULTATION = 'CONSULTATION', _('CONSULTATION')
        LITIGATION = 'LITIGATION', _('LITIGATION')
        ADMINISTRATIVE = 'ADMINISTRATIVE', _('ADMINISTRATIVE')

    case_type = models.CharField(
        max_length=50,
        choices=CaseType.choices,
        default=CaseType.LITIGATION,
        db_index=True,
        help_text='Discriminator: CONSULTATION | LITIGATION | ADMINISTRATIVE. Determines valid sub-fields.',
    )
    # Type-specific sub-document (discriminator pattern). Structure depends on case_type.
    case_specific_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Type-specific fields: consultation details, litigation details, or administrative details.',
    )

    category   = models.CharField(max_length=50, choices=CaseCategory.choices, default=CaseCategory.OTHER)
    status     = models.CharField(max_length=50, choices=CaseStatus.choices,   default=CaseStatus.OPEN)
    summary    = models.TextField(blank=True, null=True)
    description= models.TextField()
    reference  = models.CharField(max_length=50, unique=True)
    title      = models.CharField(max_length=255)
    court      = models.CharField(max_length=255)

    cabinet    = models.ForeignKey('cabinets.Cabinet', on_delete=models.SET_NULL, null=True, blank=True, related_name='cases')
    assigned_to= models.ForeignKey('users.User',       on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cases')
    client     = models.ForeignKey('users.User',       on_delete=models.SET_NULL, null=True,               related_name='client_cases')

    # Conversion link: consultation -> derived case
    converted_to_case = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_from_cases',
        help_text='For CONSULTATION: the derived case created when converted. Null by default.',
    )
    # Conversion link: derived case -> original consultation
    converted_from_case = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='derived_cases',
        help_text='For LITIGATION/ADMINISTRATIVE: the original consultation. Null by default.',
    )

    class FinancialStatus(models.TextChoices):
        PENDING = 'PENDING', _('PENDING')
        BILLED = 'BILLED', _('BILLED')
        PARTIALLY_PAID = 'PARTIALLY_PAID', _('PARTIALLY_PAID')
        PAID = 'PAID', _('PAID')
        OVERDUE = 'OVERDUE', _('OVERDUE')

    financial_status = models.CharField(
        max_length=20,
        choices=FinancialStatus.choices,
        default=FinancialStatus.PENDING,
        db_index=True,
    )
    total_billed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class CaseSession(TimeStampedModel):
    case = models.ForeignKey(Case, on_delete=models.CASCADE)

    class CaseSessionType(models.TextChoices):
        OPENING = 'OPENING', _('OPENING')
        HEARING = 'HEARING', _('HEARING')
        CLOSING = 'CLOSING', _('CLOSING')

    type    = models.CharField(max_length=50, choices=CaseSessionType.choices, default=CaseSessionType.OPENING)
    summary = models.TextField()
    date    = models.DateTimeField()


class CaseAttachementType(TimeStampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField()


class CaseAttachment(TimeStampedModel):
    case       = models.ForeignKey(Case, on_delete=models.CASCADE)
    type       = models.ForeignKey(CaseAttachementType, on_delete=models.SET_NULL, null=True, blank=True)
    other_type = models.CharField(max_length=255, blank=True, null=True)
    file       = models.FileField(upload_to='case_attachments/')
