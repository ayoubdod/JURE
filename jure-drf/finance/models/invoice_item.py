from decimal import Decimal

from django.db import models
from django.utils.translation import gettext_lazy as _


class InvoiceItem(models.Model):
    """Line item on an invoice. Amount is always quantity × unit_price (backend)."""

    invoice = models.ForeignKey(
        'finance.Invoice',
        on_delete=models.CASCADE,
        related_name='items',
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('1.00'))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fee = models.ForeignKey(
        'finance.Fee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
    )
    expense = models.ForeignKey(
        'finance.Expense',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def recalculate_amount(self) -> Decimal:
        qty = self.quantity if self.quantity is not None else Decimal('0')
        price = self.unit_price if self.unit_price is not None else Decimal('0')
        self.amount = (Decimal(str(qty)) * Decimal(str(price))).quantize(Decimal('0.01'))
        return self.amount

    def save(self, *args, **kwargs):
        self.recalculate_amount()
        super().save(*args, **kwargs)
