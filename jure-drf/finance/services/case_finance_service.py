from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from cases.models import Case
from clients.models import Client
from finance.models import Fee, Invoice, Payment
from finance.services.invoice_totals_service import confirmed_payments_total


def get_or_create_firm_client(user) -> Client | None:
    if user is None:
        return None
    profile, _ = Client.objects.get_or_create(user=user)
    return profile


def _payment_amount_qs(qs):
    if hasattr(Payment, 'Status'):
        qs = qs.filter(status=Payment.Status.CONFIRMED)
    return qs


def recalculate_fee_amounts(fee: Fee) -> None:
    total_billed = (
        Invoice.objects.filter(fee=fee)
        .exclude(status=Invoice.Status.CANCELLED)
        .aggregate(s=Sum('amount_ttc'))['s']
        or Decimal('0')
    )
    total_paid = (
        _payment_amount_qs(Payment.objects.filter(invoice__fee=fee)).aggregate(s=Sum('amount'))['s']
        or Decimal('0')
    )
    fee.amount_billed = total_billed
    fee.amount_paid = total_paid
    if fee.status == Fee.Status.CANCELLED:
        fee.save(update_fields=['amount_billed', 'amount_paid', 'updated_at'])
        return
    if fee.amount_paid >= fee.amount_expected and fee.amount_expected > 0:
        fee.status = Fee.Status.PAID
    elif fee.amount_paid > 0:
        fee.status = Fee.Status.PARTIALLY_PAID
    elif fee.amount_billed > 0 or fee.amount_expected > 0:
        fee.status = Fee.Status.PENDING
    fee.save(update_fields=['amount_billed', 'amount_paid', 'status', 'updated_at'])


def sync_invoice_status_from_payments(invoice: Invoice) -> None:
    """Authoritative payment-driven status (PAID / PARTIALLY_PAID / OVERDUE / prior)."""
    if invoice.status == Invoice.Status.CANCELLED:
        return
    if invoice.status == Invoice.Status.DRAFT:
        return

    total_paid = confirmed_payments_total(invoice)
    new_status = invoice.status
    if total_paid >= invoice.amount_ttc and invoice.amount_ttc > 0:
        new_status = Invoice.Status.PAID
    elif total_paid > 0:
        new_status = Invoice.Status.PARTIALLY_PAID
    else:
        today = timezone.now().date()
        if invoice.due_date and invoice.due_date < today:
            new_status = Invoice.Status.OVERDUE
        elif invoice.status in (
            Invoice.Status.PAID,
            Invoice.Status.PARTIALLY_PAID,
            Invoice.Status.OVERDUE,
        ):
            new_status = Invoice.Status.SENT

    if new_status != invoice.status:
        invoice.status = new_status
        invoice.save(update_fields=['status', 'updated_at'])


def recalculate_case_financial_totals(case: Case) -> None:
    total_paid = (
        _payment_amount_qs(Payment.objects.filter(case=case)).aggregate(s=Sum('amount'))['s']
        or Decimal('0')
    )
    total_billed = (
        Invoice.objects.filter(case=case)
        .exclude(status=Invoice.Status.CANCELLED)
        .aggregate(s=Sum('amount_ttc'))['s']
        or Decimal('0')
    )
    case.total_paid = total_paid
    case.total_billed = total_billed
    today = timezone.now().date()

    overdue = (
        Invoice.objects.filter(case=case, due_date__lt=today)
        .exclude(
            status__in=[
                Invoice.Status.PAID,
                Invoice.Status.CANCELLED,
                Invoice.Status.DRAFT,
            ]
        )
        .exists()
    )

    if overdue:
        case.financial_status = Case.FinancialStatus.OVERDUE
    elif total_billed == 0 and total_paid == 0:
        case.financial_status = Case.FinancialStatus.PENDING
    elif total_paid >= total_billed > 0:
        case.financial_status = Case.FinancialStatus.PAID
    elif total_paid == 0 and total_billed > 0:
        case.financial_status = Case.FinancialStatus.BILLED
    elif total_paid < total_billed:
        case.financial_status = Case.FinancialStatus.PARTIALLY_PAID
    else:
        case.financial_status = Case.FinancialStatus.PENDING

    case.save(update_fields=['total_paid', 'total_billed', 'financial_status'])
