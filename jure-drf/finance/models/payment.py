from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Payment(models.Model):
    """
    Payment received from a client for a case (manual recording — no PSP).
    """

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', _('CASH')
        VIREMENT_BANCAIRE = 'VIREMENT_BANCAIRE', _('VIREMENT_BANCAIRE')
        BANK_TRANSFER = 'BANK_TRANSFER', _('BANK_TRANSFER')
        CHEQUE = 'CHEQUE', _('CHEQUE')
        OTHER = 'OTHER', _('OTHER')

    class Status(models.TextChoices):
        CONFIRMED = 'CONFIRMED', _('CONFIRMED')
        CANCELLED = 'CANCELLED', _('CANCELLED')

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.PROTECT,
        related_name='payments',
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        related_name='payments',
    )
    invoice = models.ForeignKey(
        'finance.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices)
    payment_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments_recorded',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date', '-id']
