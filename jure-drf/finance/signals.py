from decimal import Decimal

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from cases.models import Case
from finance.models import Invoice, Payment, TaxAdvance
from finance.services.case_finance_service import (
    recalculate_case_financial_totals,
    recalculate_fee_amounts,
    sync_invoice_status_from_payments,
)
from finance.services.invoice_service import allocate_invoice_number
from finance.services.ca_tracking_service import check_and_update_tva_threshold
from finance.services.notification_service import dispatch_tva_threshold_notification


@receiver(pre_save, sender=Invoice)
def ensure_invoice_number(sender, instance, **kwargs):
    if instance.invoice_number:
        return
    if not instance.cabinet_id:
        return
    year = timezone.now().year
    instance.invoice_number = allocate_invoice_number(instance.cabinet_id, year)


@receiver(post_save, sender=Case)
def create_tax_advance(sender, instance, created, **kwargs):
    if not created:
        return
    TaxAdvance.objects.get_or_create(
        case=instance,
        defaults={
            'amount': Decimal('100.00'),
            'status': TaxAdvance.Status.UNPAID,
        },
    )


@receiver(post_save, sender=Payment)
def on_payment_saved(sender, instance, **kwargs):
    case = instance.case
    recalculate_case_financial_totals(case)
    if instance.invoice_id:
        inv = Invoice.objects.filter(pk=instance.invoice_id).first()
        if inv:
            sync_invoice_status_from_payments(inv)
            if inv.fee_id:
                recalculate_fee_amounts(inv.fee)


@receiver(post_delete, sender=Payment)
def on_payment_deleted(sender, instance, **kwargs):
    case = instance.case
    recalculate_case_financial_totals(case)
    if instance.invoice_id:
        inv = Invoice.objects.filter(pk=instance.invoice_id).first()
        if inv:
            sync_invoice_status_from_payments(inv)
            if inv.fee_id:
                recalculate_fee_amounts(inv.fee)


@receiver(post_save, sender=Invoice)
def on_invoice_saved(sender, instance, created, **kwargs):
    recalculate_case_financial_totals(instance.case)
    if instance.fee_id:
        recalculate_fee_amounts(instance.fee)


@receiver(post_save, sender=Invoice)
def track_invoice_lifetime_ca(sender, instance, **kwargs):
    """Recalculate lifetime HT CA when invoice is billable or cancelled."""
    if not instance.cabinet_id:
        return
    billable = (
        Invoice.Status.SENT,
        Invoice.Status.PARTIALLY_PAID,
        Invoice.Status.PAID,
        Invoice.Status.OVERDUE,
    )
    if instance.status == Invoice.Status.CANCELLED:
        check_and_update_tva_threshold(instance.cabinet)
        return
    if instance.status in billable:
        result = check_and_update_tva_threshold(instance.cabinet)
        if result.get('threshold_just_crossed'):
            dispatch_tva_threshold_notification(result, instance.cabinet)


@receiver(post_delete, sender=Invoice)
def on_invoice_deleted(sender, instance, **kwargs):
    recalculate_case_financial_totals(instance.case)
    if instance.fee_id:
        recalculate_fee_amounts(instance.fee)
