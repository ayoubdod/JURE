import calendar
from calendar import month_abbr
from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count
from django.utils import timezone

from cases.models import Case
from finance.models import Expense, Invoice, Payment, TaxAdvance
from finance.services.ca_tracking_service import build_tva_status_payload
from finance.services.receivables_service import build_receivables_payload


def _cabinet_case_ids(cabinet):
    return Case.objects.filter(cabinet=cabinet).values_list('id', flat=True)


def _confirmed_payments(qs):
    if hasattr(Payment, 'Status'):
        return qs.filter(status=Payment.Status.CONFIRMED)
    return qs


def _period_range(period: str, year: int):
    now = timezone.now().date()
    if period == 'year':
        return (date(year, 1, 1), date(year, 12, 31))
    if period == 'quarter':
        q = (now.month - 1) // 3
        start_m = q * 3 + 1
        end_m = start_m + 2
        last_day = calendar.monthrange(year, end_m)[1]
        return (date(year, start_m, 1), date(year, end_m, last_day))
    m = now.month if year == now.year else 1
    last_day = calendar.monthrange(year, m)[1]
    return (date(year, m, 1), date(year, m, last_day))


def _empty_kpis() -> dict:
    return {
        'ca_total': 0,
        'total_received': 0,
        'tva_to_pay': 0,
        'tax_advances_unpaid': 0,
        'outstanding': 0,
        'invoices_total': 0,
        'invoices_unpaid': 0,
        'invoices_partially_paid': 0,
        'invoices_paid': 0,
        'invoices_overdue': 0,
        'total_outstanding': 0,
        'total_overdue': 0,
        'total_expenses': 0,
        'net_revenue': 0,
        'total_ca_ttc': 0,
        'total_collected': 0,
        'tva_unpaid': 0,
        'tax_advances_due_mad': 0,
    }


def build_dashboard_payload(cabinet, period: str, year: int) -> dict:
    case_ids = list(_cabinet_case_ids(cabinet))
    if not case_ids:
        empty_months = [{'month': month_abbr[m], 'ca': 0, 'received': 0} for m in range(1, 13)]
        return {
            'kpis': _empty_kpis(),
            'charts': {
                'monthly_revenue': empty_months,
                'revenue_by_lawyer': [],
            },
            'alerts': [],
            'recent_transactions': [],
            'tva_status': build_tva_status_payload(cabinet),
        }

    d_start, d_end = _period_range(period, year)

    inv_all = Invoice.objects.filter(case_id__in=case_ids).exclude(status=Invoice.Status.CANCELLED)
    inv_period = inv_all.filter(issued_date__gte=d_start, issued_date__lte=d_end)

    ca_total = inv_period.aggregate(s=Sum('amount_ttc'))['s'] or Decimal('0')

    pay_all = _confirmed_payments(Payment.objects.filter(case_id__in=case_ids))
    pay_period = pay_all.filter(payment_date__gte=d_start, payment_date__lte=d_end)
    total_received = pay_period.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    tva_to_pay = (
        Invoice.objects.filter(
            case_id__in=case_ids,
            status__in=[Invoice.Status.SENT, Invoice.Status.PARTIALLY_PAID, Invoice.Status.OVERDUE],
        ).aggregate(s=Sum('tva_amount'))['s']
        or Decimal('0')
    )

    tax_advances_unpaid = (
        TaxAdvance.objects.filter(
            case_id__in=case_ids,
            status=TaxAdvance.Status.UNPAID,
        ).aggregate(s=Sum('amount'))['s']
        or Decimal('0')
    )

    ca_firm = inv_all.aggregate(s=Sum('amount_ttc'))['s'] or Decimal('0')
    received_firm = pay_all.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    outstanding = ca_firm - received_firm

    inv_status_counts = (
        Invoice.objects.filter(case_id__in=case_ids)
        .exclude(status=Invoice.Status.CANCELLED)
        .values('status')
        .annotate(c=Count('id'))
    )
    status_map = {row['status']: row['c'] for row in inv_status_counts}
    invoices_total = sum(status_map.values())
    invoices_paid = status_map.get(Invoice.Status.PAID, 0)
    invoices_partially_paid = status_map.get(Invoice.Status.PARTIALLY_PAID, 0)
    invoices_overdue = status_map.get(Invoice.Status.OVERDUE, 0)
    invoices_unpaid = status_map.get(Invoice.Status.SENT, 0) + invoices_overdue

    receivables = build_receivables_payload(cabinet)
    total_outstanding = Decimal(str(receivables.get('total_outstanding', 0)))
    total_overdue = Decimal(str(receivables.get('total_overdue', 0)))

    total_expenses = (
        Expense.objects.filter(case_id__in=case_ids).aggregate(s=Sum('amount'))['s']
        or Decimal('0')
    )
    net_revenue = (received_firm - total_expenses).quantize(Decimal('0.01'))

    monthly_revenue = []
    for m in range(1, 13):
        ms = date(year, m, 1)
        me = date(year, m, calendar.monthrange(year, m)[1])
        ca_m = (
            Invoice.objects.filter(
                case_id__in=case_ids,
                issued_date__gte=ms,
                issued_date__lte=me,
            )
            .exclude(status=Invoice.Status.CANCELLED)
            .aggregate(s=Sum('amount_ttc'))['s']
            or Decimal('0')
        )
        recv_m = (
            _confirmed_payments(
                Payment.objects.filter(
                    case_id__in=case_ids,
                    payment_date__gte=ms,
                    payment_date__lte=me,
                )
            ).aggregate(s=Sum('amount'))['s']
            or Decimal('0')
        )
        monthly_revenue.append(
            {'month': month_abbr[m], 'ca': float(ca_m), 'received': float(recv_m)}
        )

    lawyer_totals = defaultdict(lambda: Decimal('0'))
    for inv in (
        Invoice.objects.filter(case_id__in=case_ids)
        .exclude(status=Invoice.Status.CANCELLED)
        .select_related('fee', 'case')
    ):
        uid = None
        name = ''
        if inv.fee and inv.fee.lawyer_id:
            uid = inv.fee.lawyer_id
            u = inv.fee.lawyer
            name = f'{u.first_name} {u.last_name}'.strip()
        elif inv.case and inv.case.assigned_to_id:
            uid = inv.case.assigned_to_id
            u = inv.case.assigned_to
            name = f'{u.first_name} {u.last_name}'.strip()
        if uid:
            lawyer_totals[(uid, name)] += inv.amount_ttc

    revenue_by_lawyer = [
        {
            'lawyer_id': uid,
            'name': name,
            'total_billed': float(total),
        }
        for (uid, name), total in lawyer_totals.items()
    ]

    alerts = []
    today = timezone.now().date()
    for inv in Invoice.objects.filter(case_id__in=case_ids, due_date__lt=today).exclude(
        status__in=[Invoice.Status.PAID, Invoice.Status.CANCELLED, Invoice.Status.DRAFT]
    ):
        alerts.append(
            {
                'type': 'OVERDUE_INVOICE',
                'message': f'Invoice {inv.invoice_number} is overdue.',
                'case_id': str(inv.case_id),
                'amount': float(inv.amount_ttc),
                'due_date': inv.due_date.isoformat() if inv.due_date else None,
            }
        )

    for ta in TaxAdvance.objects.filter(case_id__in=case_ids, status=TaxAdvance.Status.UNPAID):
        alerts.append(
            {
                'type': 'UNPAID_TAX_ADVANCE',
                'message': 'Unpaid fiscal advance (acompte) for case.',
                'case_id': str(ta.case_id),
                'amount': float(ta.amount),
                'due_date': None,
            }
        )

    if tva_to_pay > 0:
        alerts.append(
            {
                'type': 'TVA_DUE',
                'message': 'Outstanding TVA on issued invoices.',
                'case_id': None,
                'amount': float(tva_to_pay),
                'due_date': None,
            }
        )

    recent_transactions = []
    for p in _confirmed_payments(
        Payment.objects.filter(case_id__in=case_ids)
    ).select_related('case', 'client__user')[:20]:
        u = p.client.user
        recent_transactions.append(
            {
                'case_reference': p.case.reference,
                'client_name': f'{u.first_name} {u.last_name}'.strip(),
                'amount': float(p.amount),
                'type': 'PAYMENT',
                'date': p.payment_date.isoformat(),
                'status': 'PAID',
            }
        )
    for inv in (
        Invoice.objects.filter(case_id__in=case_ids)
        .exclude(status=Invoice.Status.CANCELLED)
        .select_related('case', 'client__user')[:20]
    ):
        u = inv.client.user
        recent_transactions.append(
            {
                'case_reference': inv.case.reference,
                'client_name': f'{u.first_name} {u.last_name}'.strip(),
                'amount': float(inv.amount_ttc),
                'type': 'INVOICE',
                'date': inv.issued_date.isoformat(),
                'status': inv.status,
            }
        )
    recent_transactions.sort(key=lambda x: x['date'], reverse=True)
    recent_transactions = recent_transactions[:15]

    ca_total_f = float(ca_total)
    total_received_f = float(total_received)
    tva_to_pay_f = float(tva_to_pay)
    tax_advances_unpaid_f = float(tax_advances_unpaid)

    return {
        'kpis': {
            'ca_total': ca_total_f,
            'total_received': total_received_f,
            'tva_to_pay': tva_to_pay_f,
            'tax_advances_unpaid': tax_advances_unpaid_f,
            'outstanding': float(outstanding),
            'invoices_total': invoices_total,
            'invoices_unpaid': invoices_unpaid,
            'invoices_partially_paid': invoices_partially_paid,
            'invoices_paid': invoices_paid,
            'invoices_overdue': invoices_overdue,
            'total_outstanding': float(total_outstanding),
            'total_overdue': float(total_overdue),
            'total_expenses': float(total_expenses),
            'net_revenue': float(net_revenue),
            # Frontend aliases
            'total_ca_ttc': ca_total_f,
            'total_collected': total_received_f,
            'tva_unpaid': tva_to_pay_f,
            'tax_advances_due_mad': tax_advances_unpaid_f,
        },
        'charts': {
            'monthly_revenue': monthly_revenue,
            'revenue_by_lawyer': revenue_by_lawyer,
        },
        'alerts': alerts,
        'recent_transactions': recent_transactions,
        'tva_status': build_tva_status_payload(cabinet),
    }
