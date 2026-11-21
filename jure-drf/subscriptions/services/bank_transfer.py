"""Staff-confirmed bank transfers. A browser never marks a subscription paid."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from subscriptions.catalog import VAT_RATE
from subscriptions.models import BankTransfer, CreditLedger, PaymentEvent, Plan, Subscription, SubscriptionInvoice
from subscriptions.services.catalog import plan_price
from subscriptions.services.credits import grant
from subscriptions.services.lifecycle import _invoice, activate_from_verified_payment, refresh_status


def expected_total(plan: Plan, billing_cycle: str) -> Decimal | None:
    price = plan_price(plan, billing_cycle)
    if price is None:
        return None
    subtotal = Decimal(price)
    vat_amount = (subtotal * Decimal(str(VAT_RATE))).quantize(Decimal("0.01"))
    return subtotal + vat_amount


@transaction.atomic
def record_bank_transfer(
    *,
    subscription: Subscription,
    reference: str,
    amount: Decimal,
    received_on,
    note: str = "",
    recorded_by=None,
    plan: Plan | None = None,
    billing_cycle: str = "",
    credit_allowance: int | None = None,
) -> BankTransfer:
    reference = (reference or "").strip()
    if not reference:
        raise ValidationError(_("Enter the bank transfer reference."))
    if len(reference) > 128:
        raise ValidationError(_("The transfer reference is too long."))
    if amount is None or Decimal(amount) <= 0:
        raise ValidationError(_("Enter the amount received."))
    if received_on is None:
        raise ValidationError(_("Enter the date the transfer was received."))
    if received_on > timezone.localdate():
        raise ValidationError(_("The received date cannot be in the future."))
    if BankTransfer.objects.filter(reference=reference).exists() or PaymentEvent.objects.filter(
        event_id=f"bank-transfer:{reference}"
    ).exists():
        raise ValidationError(_("This transfer reference was already recorded."))

    locked = (
        Subscription.objects.select_for_update()
        .select_related("plan", "pending_plan", "cabinet")
        .get(pk=subscription.pk)
    )
    locked = refresh_status(locked)
    if (
        locked.status == Subscription.Status.ACTIVE
        and locked.current_period_end
        and locked.current_period_end > timezone.now()
    ):
        raise ValidationError(_("This subscription is already paid for the current period."))

    if plan is not None:
        locked.plan = plan
    cycle = (billing_cycle or locked.billing_cycle or "").strip().lower()
    if cycle not in {Subscription.BillingCycle.MONTHLY, Subscription.BillingCycle.ANNUAL}:
        raise ValidationError(_("Choose monthly or annual billing."))
    locked.billing_cycle = cycle
    locked.pending_plan = None
    locked.pending_billing_cycle = ""
    price = plan_price(locked.plan, locked.billing_cycle)
    if price is not None:
        locked.list_price = price
    else:
        vat_rate = Decimal(str(VAT_RATE))
        locked.list_price = (Decimal(amount) / (Decimal("1") + vat_rate)).quantize(Decimal("0.01"))
    locked.save()

    SubscriptionInvoice.objects.filter(
        subscription=locked,
        status=SubscriptionInvoice.Status.OPEN,
    ).update(status=SubscriptionInvoice.Status.VOID)
    _invoice(locked, description=f"Bank transfer {reference}")

    event_id = f"bank-transfer:{reference}"
    event = PaymentEvent.objects.create(
        event_id=event_id,
        event_type="bank_transfer",
        cabinet=locked.cabinet,
        processed=False,
    )
    activate_from_verified_payment(locked, event_id=event_id)
    locked.refresh_from_db()
    allowance = locked.plan.monthly_juria_credits
    if allowance is None and credit_allowance:
        grant(
            cabinet=locked.cabinet,
            movement=CreditLedger.Movement.INCLUDED_GRANT,
            amount=int(credit_allowance),
            description="Enterprise JURIA allowance",
            idempotency_key=f"included-manual:{locked.pk}:{event_id}",
        )
    event.processed = True
    event.save(update_fields=["processed"])
    return BankTransfer.objects.create(
        subscription=locked,
        cabinet=locked.cabinet,
        reference=reference,
        amount=Decimal(amount),
        currency=locked.currency or "MAD",
        received_on=received_on,
        note=(note or "")[:4000],
        recorded_by=recorded_by if getattr(recorded_by, "pk", None) else None,
    )
