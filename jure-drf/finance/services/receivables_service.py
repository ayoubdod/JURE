"""Receivables KPIs and aging from persisted invoices/payments."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from cases.models import Case
from finance.models import Invoice, Payment


def _confirmed_paid_for_invoice(invoice: Invoice) -> Decimal:
    qs = Payment.objects.filter(invoice=invoice)
    if hasattr(Payment, 'Status'):
        qs = qs.filter(status=Payment.Status.CONFIRMED)
    return qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')


def invoice_outstanding(invoice: Invoice) -> Decimal:
    if invoice.status == Invoice.Status.CANCELLED:
        return Decimal('0.00')
    paid = _confirmed_paid_for_invoice(invoice)
    out = Decimal(str(invoice.amount_ttc)) - paid
    return max(Decimal('0.00'), out.quantize(Decimal('0.01')))


def _aging_bucket(due_date, today, outstanding: Decimal) -> str | None:
    if outstanding <= 0:
        return None
    if due_date is None or due_date >= today:
        return 'CURRENT'
    days = (today - due_date).days
    if days <= 30:
        return '1_30'
    if days <= 60:
        return '31_60'
    if days <= 90:
        return '61_90'
    return '90_PLUS'


def build_receivables_payload(cabinet) -> dict:
    case_ids = list(Case.objects.filter(cabinet=cabinet).values_list('id', flat=True))
    empty_aging = {
        'CURRENT': 0.0,
        '1_30': 0.0,
        '31_60': 0.0,
        '61_90': 0.0,
        '90_PLUS': 0.0,
    }
    if not case_ids:
        return {
            'total_invoiced': 0.0,
            'total_collected': 0.0,
            'total_outstanding': 0.0,
            'total_overdue': 0.0,
            'aging': empty_aging,
            'invoices': [],
        }

    today = timezone.now().date()
    invoices = (
        Invoice.objects.filter(case_id__in=case_ids)
        .exclude(status__in=[Invoice.Status.CANCELLED, Invoice.Status.DRAFT])
        .select_related('case', 'client__user')
        .order_by('-issued_date', '-id')
    )

    total_invoiced = Decimal('0')
    total_outstanding = Decimal('0')
    total_overdue = Decimal('0')
    aging = {k: Decimal('0') for k in empty_aging}
    rows = []

    for inv in invoices:
        total_invoiced += Decimal(str(inv.amount_ttc))
        paid = _confirmed_paid_for_invoice(inv)
        outstanding = max(Decimal('0.00'), Decimal(str(inv.amount_ttc)) - paid)
        total_outstanding += outstanding
        bucket = _aging_bucket(inv.due_date, today, outstanding)
        is_overdue = bool(
            outstanding > 0
            and inv.due_date
            and inv.due_date < today
        )
        if is_overdue:
            total_overdue += outstanding
        if bucket:
            aging[bucket] += outstanding
        u = inv.client.user if inv.client_id else None
        client_name = ''
        if u:
            client_name = f'{u.first_name} {u.last_name}'.strip() or (u.email or '')
        rows.append(
            {
                'invoice_id': inv.id,
                'invoice_number': inv.invoice_number,
                'case_id': inv.case_id,
                'case_reference': inv.case.reference if inv.case_id else '',
                'client_name': client_name,
                'status': inv.status,
                'total': float(inv.amount_ttc),
                'amount_paid': float(paid),
                'amount_outstanding': float(outstanding),
                'due_date': inv.due_date.isoformat() if inv.due_date else None,
                'aging_bucket': bucket,
                'is_overdue': is_overdue,
            }
        )

    pay_qs = Payment.objects.filter(case_id__in=case_ids)
    if hasattr(Payment, 'Status'):
        pay_qs = pay_qs.filter(status=Payment.Status.CONFIRMED)
    total_collected = pay_qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    return {
        'total_invoiced': float(total_invoiced),
        'total_collected': float(total_collected),
        'total_outstanding': float(total_outstanding),
        'total_overdue': float(total_overdue),
        'aging': {k: float(v) for k, v in aging.items()},
        'invoices': rows,
    }
