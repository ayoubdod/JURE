from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Expense(models.Model):
    """Matter-linked expense (frais) for a cabinet."""

    class Category(models.TextChoices):
        TRAVEL = 'TRAVEL', _('TRAVEL')
        COURT = 'COURT', _('COURT')
        EXPERT = 'EXPERT', _('EXPERT')
        ADMIN = 'ADMIN', _('ADMIN')
        OTHER = 'OTHER', _('OTHER')

    cabinet = models.ForeignKey(
        'cabinets.Cabinet',
        on_delete=models.CASCADE,
        related_name='finance_expenses',
    )
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='expenses',
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
    )
    description = models.CharField(max_length=500)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='MAD')
    expense_date = models.DateField()
    billable = models.BooleanField(default=True)
    reimbursable = models.BooleanField(default=False)
    receipt_reference = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_expenses_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-expense_date', '-id']
