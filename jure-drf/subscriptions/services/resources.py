"""Storage and JURIA credit add-ons. A request does not grant the entitlement."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from subscriptions.models import (
    AddonPurchase,
    CreditLedger,
    CreditLot,
    CreditPackage,
    PaymentEvent,
    StorageEntitlement,
    StoragePackage,
    Subscription,
)
from subscriptions.services.bank_transfer import transfer_reference_taken
from subscriptions.services.credits import _expire_elapsed_lots, _purchased_remaining, grant_purchased_credits
from subscriptions.services.entitlements import purchased_storage_bytes, storage_breakdown


def _require_subscription(cabinet) -> Subscription:
    try:
        return Subscription.objects.select_related("plan").get(cabinet=cabinet)
    except Subscription.DoesNotExist as exc:
        raise ValidationError(_("This organisation has no subscription yet.")) from exc


def _reference(kind: str) -> str:
    prefix = "STO" if kind == AddonPurchase.Kind.STORAGE else "AIC"
    return f"JURE-{prefix}-{uuid.uuid4().hex[:10].upper()}"


def package_payload_storage(package: StoragePackage) -> dict:
    return {
        "code": package.code,
        "name": package.name,
        "description": package.description,
        "capacity_bytes": package.capacity_bytes,
        "price": None if package.price is None else str(package.price),
        "currency": package.currency,
        "billing_type": package.billing_type,
        "is_purchasable": package.is_purchasable,
        "price_approved": package.price is not None and package.price > 0,
    }


def package_payload_credits(package: CreditPackage) -> dict:
    return {
        "code": package.code,
        "name": package.name,
        "description": package.description,
        "credits": package.credits,
        "price": None if package.price is None else str(package.price),
        "currency": package.currency,
        "validity_days": package.validity_days,
        "is_purchasable": package.is_purchasable,
    }


def purchase_payload(purchase: AddonPurchase) -> dict:
    return {
        "id": purchase.pk,
        "kind": purchase.kind,
        "package_code": purchase.package_code,
        "package_name": purchase.package_name,
        "capacity_bytes": purchase.capacity_bytes,
        "credits": purchase.credits,
        "validity_days": purchase.validity_days,
        "subtotal": str(purchase.subtotal),
        "currency": purchase.currency,
        "tax_confirmed": False,
        "payment_reference": purchase.payment_reference,
        "bank_reference": purchase.bank_reference,
        "status": purchase.status,
        "created_at": purchase.created_at,
        "activated_at": purchase.activated_at,
    }


@transaction.atomic
def request_storage_purchase(*, cabinet, package_code: str) -> AddonPurchase:
    subscription = _require_subscription(cabinet)
    package = StoragePackage.objects.filter(code=(package_code or "").strip()).first()
    if package is None or not package.is_active:
        raise ValidationError(_("This storage package is not available."))
    if not package.is_purchasable:
        raise ValidationError(_("This storage package does not have an approved price yet."))
    purchase = AddonPurchase.objects.create(
        cabinet=cabinet,
        subscription=subscription,
        kind=AddonPurchase.Kind.STORAGE,
        storage_package=package,
        package_code=package.code,
        package_name=package.name,
        capacity_bytes=package.capacity_bytes,
        subtotal=package.price,
        currency=package.currency or "MAD",
        payment_reference=_reference(AddonPurchase.Kind.STORAGE),
        status=AddonPurchase.Status.PENDING_VERIFICATION,
    )
    return purchase


@transaction.atomic
def request_credit_purchase(*, cabinet, package_code: str) -> AddonPurchase:
    subscription = _require_subscription(cabinet)
    package = CreditPackage.objects.filter(code=(package_code or "").strip()).first()
    if package is None or not package.is_purchasable:
        raise ValidationError(_("This credit package is not available."))
    purchase = AddonPurchase.objects.create(
        cabinet=cabinet,
        subscription=subscription,
        kind=AddonPurchase.Kind.CREDITS,
        credit_package=package,
        package_code=package.code,
        package_name=package.name,
        credits=package.credits,
        validity_days=package.validity_days,
        subtotal=package.price,
        currency=package.currency or "MAD",
        payment_reference=_reference(AddonPurchase.Kind.CREDITS),
        status=AddonPurchase.Status.PENDING_VERIFICATION,
    )
    return purchase


@transaction.atomic
def cancel_purchase(*, cabinet, purchase_id: int) -> AddonPurchase:
    purchase = AddonPurchase.objects.select_for_update().filter(cabinet=cabinet, pk=purchase_id).first()
    if purchase is None:
        raise ValidationError(_("This purchase was not found."))
    if purchase.status != AddonPurchase.Status.PENDING_VERIFICATION:
        raise ValidationError(_("Only a purchase waiting for verification can be cancelled."))
    purchase.status = AddonPurchase.Status.CANCELLED
    purchase.save(update_fields=["status"])
    return purchase


@transaction.atomic
def verify_addon_purchase(*, purchase: AddonPurchase, bank_reference: str, note: str, verified_by) -> AddonPurchase:
    locked = AddonPurchase.objects.select_for_update().select_related("cabinet").get(pk=purchase.pk)
    if locked.status != AddonPurchase.Status.PENDING_VERIFICATION:
        raise ValidationError(_("This purchase is not waiting for verification."))
    reference = (bank_reference or "").strip()
    if not reference:
        raise ValidationError(_("Enter the bank transfer reference."))
    if transfer_reference_taken(reference):
        raise ValidationError(_("This transfer reference was already recorded."))
    now = timezone.now()
    if locked.kind == AddonPurchase.Kind.STORAGE:
        StorageEntitlement.objects.create(
            cabinet=locked.cabinet,
            purchase=locked,
            capacity_bytes=locked.capacity_bytes or 0,
            activated_at=now,
        )
    elif locked.kind == AddonPurchase.Kind.CREDITS:
        days = locked.validity_days or 90
        grant_purchased_credits(
            cabinet=locked.cabinet,
            amount=int(locked.credits or 0),
            expires_at=now + timezone.timedelta(days=days),
            purchase=locked,
            idempotency_key=f"purchase-credits:{locked.pk}",
        )
    else:
        raise ValidationError(_("This purchase cannot be activated."))
    PaymentEvent.objects.create(
        event_id=f"bank-transfer:{reference}",
        event_type="addon_bank_transfer",
        cabinet=locked.cabinet,
        processed=True,
    )
    locked.bank_reference = reference
    locked.status = AddonPurchase.Status.PAID
    locked.note = (note or "")[:4000]
    locked.verified_by = verified_by if getattr(verified_by, "pk", None) else None
    locked.verified_at = now
    locked.activated_at = now
    locked.save()
    return locked


@transaction.atomic
def reject_addon_purchase(*, purchase: AddonPurchase, note: str, verified_by) -> AddonPurchase:
    locked = AddonPurchase.objects.select_for_update().get(pk=purchase.pk)
    if locked.status != AddonPurchase.Status.PENDING_VERIFICATION:
        raise ValidationError(_("This purchase is not waiting for verification."))
    locked.status = AddonPurchase.Status.FAILED
    locked.note = (note or "")[:4000]
    locked.verified_by = verified_by if getattr(verified_by, "pk", None) else None
    locked.verified_at = timezone.now()
    locked.save()
    return locked


def storage_summary(cabinet, subscription) -> dict:
    breakdown = storage_breakdown(cabinet)
    included = None
    if subscription is not None and subscription.plan.storage_bytes is not None:
        included = int(subscription.plan.storage_bytes)
    extra = purchased_storage_bytes(cabinet)
    total = None if included is None else included + extra
    used = breakdown["total_bytes"]
    remaining = None if total is None else max(total - used, 0)
    ratio = None
    if total:
        ratio = round(min(used / total, 1) * 100, 1)
    level = "normal"
    if ratio is not None:
        if ratio >= 100:
            level = "full"
        elif ratio >= 90:
            level = "critical"
        elif ratio >= 80:
            level = "warning"
    return {
        "included_bytes": included,
        "purchased_bytes": extra,
        "total_bytes": total,
        "used_bytes": used,
        "remaining_bytes": remaining,
        "usage_percent": ratio,
        "level": level,
        "breakdown": breakdown,
        "tax_confirmed": False,
    }


def credit_summary(cabinet, subscription) -> dict:
    from subscriptions.models import CreditWallet

    wallet = CreditWallet.objects.filter(cabinet=cabinet).first()
    if wallet is None:
        return {
            "total_available": 0,
            "monthly_allowance": None,
            "monthly_remaining": 0,
            "monthly_used": 0,
            "purchased_remaining": 0,
            "trial_remaining": 0,
            "lots": [],
            "alerts": [],
            "history": [],
            "tax_confirmed": False,
        }
    with transaction.atomic():
        locked = CreditWallet.objects.select_for_update().get(pk=wallet.pk)
        _expire_elapsed_lots(locked)
        locked.refresh_from_db()
    purchased = _purchased_remaining(cabinet.pk)
    pool = max(locked.balance - purchased, 0)
    status = subscription.status if subscription is not None else ""
    trialing = status in {Subscription.Status.TRIALING, Subscription.Status.PENDING_VERIFICATION}
    allowance = None
    if subscription is not None and not trialing:
        allowance = subscription.plan.monthly_juria_credits
    monthly_remaining = 0 if trialing else pool
    trial_remaining = pool if trialing else 0
    monthly_used = 0
    if allowance:
        monthly_used = max(int(allowance) - monthly_remaining, 0)
    now = timezone.now()
    soon = now + timezone.timedelta(days=14)
    lots = [
        {
            "remaining": lot.remaining,
            "issued": lot.issued,
            "expires_at": lot.expires_at,
            "expiring_soon": lot.expires_at <= soon,
        }
        for lot in CreditLot.objects.filter(cabinet=cabinet, remaining__gt=0, expires_at__gt=now).order_by("expires_at")
    ]
    alerts = []
    if allowance and monthly_used >= allowance:
        alerts.append("monthly_exhausted")
    elif allowance and monthly_used >= int(Decimal(allowance) * Decimal("0.8")):
        alerts.append("monthly_low")
    if any(lot["expiring_soon"] for lot in lots):
        alerts.append("purchased_expiring")
    if locked.balance <= 0:
        alerts.append("balance_empty")
    history = [
        {
            "movement_type": row.movement_type,
            "amount": row.amount,
            "balance_after": row.balance_after,
            "created_at": row.created_at,
        }
        for row in CreditLedger.objects.filter(cabinet=cabinet).order_by("-created_at")[:20]
    ]
    return {
        "total_available": locked.balance,
        "monthly_allowance": allowance,
        "monthly_remaining": monthly_remaining,
        "monthly_used": monthly_used,
        "purchased_remaining": purchased,
        "trial_remaining": trial_remaining,
        "lots": lots,
        "alerts": alerts,
        "history": history,
        "tax_confirmed": False,
    }
