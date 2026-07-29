import calendar
from calendar import month_abbr
from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count
from django.utils import timezone

from cases.models import Case
from finance.models import Invoice, Payment, TaxAdvance
from finance.services.ca_tracking_service import build_tva_status_payload


def _cabinet_case_ids(cabinet):
    return Case.objects.filter(cabinet=cabinet).values_list('id', flat=True)


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


def build_dashboard_payload(cabinet, period: str, year: int) -> dict:
    case_ids = list(_cabinet_case_ids(cabinet))
    if not case_ids:
        empty_months = [{'month': month_abbr[m], 'ca': 0, 'received': 0} for m in range(1, 13)]
        return {
            'kpis': {
                'ca_total': 0,
                'total_received': 0,
                'tva_to_pay': 0,
                'tax_advances_unpaid': 0,
                'outstanding': 0,
            },
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

    pay_all = Payment.objects.filter(case_id__in=case_ids)
    pay_period = pay_all.filter(payment_date__gte=d_start, payment_date__lte=d_end)
    total_received = pay_period.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    tva_to_pay = (
        Invoice.objects.filter(
            case_id__in=case_ids,
            status__in=[Invoice.Status.SENT, Invoice.Status.PARTIALLY_PAID, Invoice.Status.OVERDUE],
        ).aggregate(s=Sum('tva_amount'))['s']
        or Decimal('0')
    )

    unpaid_advances = TaxAdvance.objects.filter(
        case_id__in=case_ids,
        status=TaxAdvance.Status.UNPAID,
    ).aggregate(c=Count('id'))['c'] or 0
    tax_advances_unpaid = Decimal(str(unpaid_advances * 100))

    ca_firm = inv_all.aggregate(s=Sum('amount_ttc'))['s'] or Decimal('0')
    received_firm = pay_all.aggregate(s=Sum('amount'))['s'] or Decimal('0')
    outstanding = ca_firm - received_firm

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
            Payment.objects.filter(
                case_id__in=case_ids,
                payment_date__gte=ms,
                payment_date__lte=me,
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
    for p in Payment.objects.filter(case_id__in=case_ids).select_related(
        'case', 'client__user'
    )[:20]:
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

    return {
        'kpis': {
            'ca_total': float(ca_total),
            'total_received': float(total_received),
            'tva_to_pay': float(tva_to_pay),
            'tax_advances_unpaid': float(tax_advances_unpaid),
            'outstanding': float(outstanding),
        },
        'charts': {
            'monthly_revenue': monthly_revenue,
            'revenue_by_lawyer': revenue_by_lawyer,
        },
        'alerts': alerts,
        'recent_transactions': recent_transactions,
        'tva_status': build_tva_status_payload(cabinet),
    }
