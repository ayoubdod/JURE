from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Fee(models.Model):
    """
    Represents the fee agreement for a case.
    """

    class FeeType(models.TextChoices):
        FIXED = 'FIXED', _('FIXED')
        HOURLY = 'HOURLY', _('HOURLY')
        SUCCESS_FEE = 'SUCCESS_FEE', _('SUCCESS_FEE')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('PENDING')
        PARTIALLY_PAID = 'PARTIALLY_PAID', _('PARTIALLY_PAID')
        PAID = 'PAID', _('PAID')
        CANCELLED = 'CANCELLED', _('CANCELLED')

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='fees',
    )
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_fees',
    )
    fee_type = models.CharField(max_length=20, choices=FeeType.choices)
    amount_expected = models.DecimalField(max_digits=12, decimal_places=2)
    amount_billed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
