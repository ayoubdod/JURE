from django.db import models
from django.utils.translation import gettext_lazy as _


class TaxAdvance(models.Model):
    """
    Mandatory 100 MAD fiscal advance (acompte fiscal) per case.
    """

    class Status(models.TextChoices):
        UNPAID = 'UNPAID', _('UNPAID')
        PAID = 'PAID', _('PAID')

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='tax_advances',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=100.00)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.UNPAID,
    )
    paid_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
