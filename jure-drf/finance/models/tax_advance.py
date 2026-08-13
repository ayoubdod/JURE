from decimal import Decimal

from django.db import models
from django.utils.translation import gettext_lazy as _


class TaxAdvance(models.Model):
    """
    Mandatory fiscal advance (acompte fiscal) per case.
    Creation amount is taken from FirmFinanceSettings.tax_advance_default_amount.
    """

    class Status(models.TextChoices):
        UNPAID = 'UNPAID', _('UNPAID')
        PAID = 'PAID', _('PAID')

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='tax_advances',
    )
    # DB default kept for migrations; runtime creation uses FirmFinanceSettings.
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.UNPAID,
    )
    paid_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
