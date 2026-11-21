"""Subscription creation and status transitions. Payment does not happen here."""

from __future__ import annotations

import calendar
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied, ValidationError

from subscriptions.catalog import TRIAL_CREDITS, TRIAL_DAYS, VAT_RATE
from subscriptions.models import CreditLedger, CreditWallet, Plan, Subscription, SubscriptionInvoice
from subscriptions.services.catalog import plan_price, resolve_registration_plan
from subscriptions.services.credits import expire_balance, grant

BILLING_ADMIN_ROLES = {"OWNER", "ADMIN"}
_BLOCKED_WRITE_STATUSES = {
    Subscription.Status.PENDING_PAYMENT,
    Subscription.Status.PAST_DUE,
    Subscription.Status.CANCELLED,
    Subscription.Status.EXPIRED,
}


def add_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def is_billing_admin(user) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    role = getattr(user, "role", None) or ""
    if role in BILLING_ADMIN_ROLES:
        return True
    owned = getattr(user, "get_owned_cabinet_or_none", lambda: None)()
    return owned is not None and (not role or role == "OWNER")


def require_billing_admin(user) -> None:
    if not is_billing_admin(user):
        raise PermissionDenied(_("Only the organisation owner or a billing administrator can do this."))


def load_subscription(cabinet) -> Subscription | None:
    if cabinet is None:
        return None
    try:
        subscription = Subscription.objects.select_related("plan", "pending_plan").get(cabinet=cabinet)
    except Subscription.DoesNotExist:
        return None
    return refresh_status(subscription)


def refresh_status(subscription: Subscription) -> Subscription:
    now = timezone.now()
    changed = False
    if (
        subscription.status in (Subscription.Status.TRIALING, Subscription.Status.PENDING_VERIFICATION)
        and subscription.trial_end
        and subscription.trial_end <= now
    ):
        subscription.status = (
            Subscription.Status.CANCELLED
            if subscription.cancel_at_period_end
            else Subscription.Status.EXPIRED
        )
        changed = True
    elif (
        subscription.status == Subscription.Status.ACTIVE
        and subscription.current_period_end
        and subscription.current_period_end <= now
    ):
        if subscription.pending_plan_id and subscription.pending_plan.display_order < subscription.plan.display_order:
            subscription.plan = subscription.pending_plan
            if subscription.pending_billing_cycle:
                subscription.billing_cycle = subscription.pending_billing_cycle
            subscription.list_price = plan_price(subscription.plan, subscription.billing_cycle)
            subscription.pending_plan = None
            subscription.pending_billing_cycle = ""
        if subscription.cancel_at_period_end:
            subscription.status = Subscription.Status.CANCELLED
        else:
            subscription.status = Subscription.Status.PENDING_PAYMENT
        changed = True
    if changed:
        subscription.save()
    return subscription


def blocks_writes(user) -> bool:
    from core.utils import get_user_cabinet

    cabinet = get_user_cabinet(user)
    if cabinet is None:
        return False
    subscription = load_subscription(cabinet)
    if subscription is None:
        return False
    return subscription.status in _BLOCKED_WRITE_STATUSES


@transaction.atomic
def provision_trial(*, cabinet, plan_code: str, billing_cycle: str) -> Subscription:
    if Subscription.objects.filter(cabinet=cabinet).exists():
        raise ValidationError({"subscription": _("This organisation already has a subscription.")})
    plan = resolve_registration_plan(plan_code, billing_cycle)
    now = timezone.now()
    subscription = Subscription.objects.create(
        cabinet=cabinet,
        plan=plan,
        billing_cycle=billing_cycle,
        status=Subscription.Status.PENDING_VERIFICATION,
        list_price=plan_price(plan, billing_cycle),
        currency=plan.currency or "MAD",
        start_date=now,
        trial_start=now,
        trial_end=now + timezone.timedelta(days=TRIAL_DAYS),
    )
    CreditWallet.objects.create(cabinet=cabinet, balance=0)
    grant(
        cabinet=cabinet,
        movement=CreditLedger.Movement.TRIAL_GRANT,
        amount=TRIAL_CREDITS,
        description="Trial allowance",
        idempotency_key=f"trial:{cabinet.pk}",
    )
    return subscription


def mark_verified(user) -> None:
    from core.utils import get_user_cabinet

    cabinet = get_user_cabinet(user)
    if cabinet is None:
        return
    Subscription.objects.filter(
        cabinet=cabinet,
        status=Subscription.Status.PENDING_VERIFICATION,
    ).update(status=Subscription.Status.TRIALING, updated_at=timezone.now())


def _invoice(subscription: Subscription, *, description: str) -> SubscriptionInvoice:
    price = subscription.list_price if subscription.pending_plan_id is None else plan_price(
        subscription.pending_plan, subscription.pending_billing_cycle or subscription.billing_cycle
    )
    if price is None:
        raise ValidationError({"plan_code": _("This plan has no self-serve price.")})
    subtotal = Decimal(price)
    vat_rate = Decimal(VAT_RATE)
    vat_amount = (subtotal * vat_rate).quantize(Decimal("0.01"))
    total = subtotal + vat_amount
    sequence = subscription.invoices.count() + 1
    return SubscriptionInvoice.objects.create(
        cabinet=subscription.cabinet,
        subscription=subscription,
        number=f"SUB-{subscription.cabinet_id}-{sequence:04d}",
        status=SubscriptionInvoice.Status.OPEN,
        currency=subscription.currency or "MAD",
        subtotal=subtotal,
        vat_rate=vat_rate,
        vat_amount=vat_amount,
        total=total,
        description=description[:255],
    )


@transaction.atomic
def change_plan(*, user, plan_code: str, billing_cycle: str) -> dict:
    require_billing_admin(user)
    from core.utils import get_user_cabinet

    cabinet = get_user_cabinet(user)
    subscription = load_subscription(cabinet)
    if subscription is None:
        raise ValidationError({"subscription": _("This organisation has no subscription.")})
    plan = resolve_registration_plan(plan_code, billing_cycle)
    price = plan_price(plan, billing_cycle)
    if (
        subscription.status in (Subscription.Status.TRIALING, Subscription.Status.PENDING_VERIFICATION)
    ):
        subscription.plan = plan
        subscription.billing_cycle = billing_cycle
        subscription.list_price = price
        subscription.pending_plan = None
        subscription.pending_billing_cycle = ""
        subscription.save()
        return {"payment_required": False, "subscription": subscription}

    if subscription.status == Subscription.Status.ACTIVE and plan.display_order < subscription.plan.display_order:
        subscription.pending_plan = plan
        subscription.pending_billing_cycle = billing_cycle
        subscription.save(update_fields=["pending_plan", "pending_billing_cycle", "updated_at"])
        return {"payment_required": False, "subscription": subscription, "effective": "period_end"}

    subscription.pending_plan = plan
    subscription.pending_billing_cycle = billing_cycle
    if subscription.status != Subscription.Status.ACTIVE:
        subscription.plan = plan
        subscription.billing_cycle = billing_cycle
        subscription.list_price = price
        subscription.status = Subscription.Status.PENDING_PAYMENT
    subscription.save()
    invoice = _invoice(subscription, description=f"{plan.name} · {billing_cycle}")
    return {"payment_required": True, "subscription": subscription, "invoice": invoice}


@transaction.atomic
def cancel_subscription(*, user) -> Subscription:
    require_billing_admin(user)
    from core.utils import get_user_cabinet

    cabinet = get_user_cabinet(user)
    subscription = load_subscription(cabinet)
    if subscription is None:
        raise ValidationError({"subscription": _("This organisation has no subscription.")})
    if subscription.status in (Subscription.Status.CANCELLED, Subscription.Status.EXPIRED):
        return subscription
    now = timezone.now()
    subscription.cancel_at_period_end = True
    if subscription.status == Subscription.Status.ACTIVE and subscription.current_period_end:
        subscription.cancellation_date = subscription.current_period_end
    elif subscription.trial_end:
        subscription.cancellation_date = subscription.trial_end
    else:
        subscription.cancellation_date = now
        subscription.status = Subscription.Status.CANCELLED
    subscription.save()
    return subscription


@transaction.atomic
def activate_from_verified_payment(subscription: Subscription, *, event_id: str) -> Subscription:
    """Move a subscription to ACTIVE after a verified payment event. Does not stack trial credits."""
    locked = Subscription.objects.select_for_update().select_related("plan", "pending_plan").get(pk=subscription.pk)
    if locked.pending_plan_id:
        locked.plan = locked.pending_plan
        if locked.pending_billing_cycle:
            locked.billing_cycle = locked.pending_billing_cycle
        locked.pending_plan = None
        locked.pending_billing_cycle = ""
        locked.list_price = plan_price(locked.plan, locked.billing_cycle)
    now = timezone.now()
    months = 12 if locked.billing_cycle == Subscription.BillingCycle.ANNUAL else 1
    expire_balance(
        cabinet=locked.cabinet,
        idempotency_key=f"expire-before:{event_id}",
        description="Clear trial balance before paid allowance",
    )
    allowance = locked.plan.monthly_juria_credits or 0
    if allowance:
        grant(
            cabinet=locked.cabinet,
            movement=CreditLedger.Movement.INCLUDED_GRANT,
            amount=allowance,
            description="Monthly JURIA allowance",
            idempotency_key=f"included:{locked.pk}:{event_id}",
        )
    locked.status = Subscription.Status.ACTIVE
    locked.current_period_start = now
    locked.current_period_end = add_months(now, months)
    locked.cancel_at_period_end = False
    if locked.start_date is None:
        locked.start_date = now
    locked.save()
    SubscriptionInvoice.objects.filter(
        subscription=locked,
        status=SubscriptionInvoice.Status.OPEN,
    ).update(status=SubscriptionInvoice.Status.PAID, paid_at=now)
    return locked
