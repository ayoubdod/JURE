"""Invoice line items + HT/TVA/TTC recalculation (backend source of truth)."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from finance.models import Invoice, InvoiceItem, Payment


def _dec(value) -> Decimal:
    if value is None:
        return Decimal('0')
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def confirmed_payments_total(invoice: Invoice) -> Decimal:
    qs = Payment.objects.filter(invoice=invoice)
    if hasattr(Payment, 'Status'):
        qs = qs.filter(status=Payment.Status.CONFIRMED)
    return qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')


def invoice_amount_paid(invoice: Invoice) -> Decimal:
    return confirmed_payments_total(invoice).quantize(Decimal('0.01'))


def invoice_amount_outstanding(invoice: Invoice) -> Decimal:
    if invoice.status == Invoice.Status.CANCELLED:
        return Decimal('0.00')
    out = _dec(invoice.amount_ttc) - invoice_amount_paid(invoice)
    return max(Decimal('0.00'), out.quantize(Decimal('0.01')))


@transaction.atomic
def sync_invoice_ht_from_items(invoice: Invoice) -> Invoice:
    """Set amount_ht from sum(items.amount), then let Invoice.save recompute TVA/TTC."""
    total = (
        InvoiceItem.objects.filter(invoice=invoice).aggregate(s=Sum('amount'))['s']
        or Decimal('0')
    )
    invoice.amount_ht = _dec(total).quantize(Decimal('0.01'))
    invoice.save()
    return invoice


@transaction.atomic
def ensure_default_invoice_item(invoice: Invoice, description: str | None = None) -> InvoiceItem:
    """If invoice has no items, create one line matching amount_ht."""
    existing = InvoiceItem.objects.filter(invoice=invoice).first()
    if existing:
        return existing
    desc = description or 'Honoraires'
    if invoice.fee_id:
        desc = f'Honoraires (réf. honoraire #{invoice.fee_id})'
    item = InvoiceItem(
        invoice=invoice,
        description=desc,
        quantity=Decimal('1.00'),
        unit_price=_dec(invoice.amount_ht),
        fee_id=invoice.fee_id,
    )
    item.save()
    return item


@transaction.atomic
def replace_invoice_items(invoice: Invoice, items_data: list[dict]) -> list[InvoiceItem]:
    """
    Replace all items. Each dict: description, quantity, unit_price, fee_id?, expense_id?
    Recalculates invoice HT/TTC from items.
    """
    InvoiceItem.objects.filter(invoice=invoice).delete()
    created = []
    for raw in items_data:
        item = InvoiceItem(
            invoice=invoice,
            description=raw.get('description') or 'Ligne',
            quantity=_dec(raw.get('quantity', 1)),
            unit_price=_dec(raw.get('unit_price', 0)),
            fee_id=raw.get('fee_id') or raw.get('fee'),
            expense_id=raw.get('expense_id') or raw.get('expense'),
        )
        item.save()
        created.append(item)
    sync_invoice_ht_from_items(invoice)
    return created
