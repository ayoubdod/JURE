"""Organisation credit wallet. All balance changes go through this module."""

from __future__ import annotations

from django.db import IntegrityError, OperationalError, transaction
from django.utils.translation import gettext_lazy as _

from subscriptions.catalog import MODE_TO_OPERATION
from subscriptions.exceptions import EntitlementDenied
from subscriptions.models import AIUsageEvent, CreditLedger, CreditTariff, CreditWallet

_GRANT_TYPES = {
    CreditLedger.Movement.TRIAL_GRANT,
    CreditLedger.Movement.INCLUDED_GRANT,
    CreditLedger.Movement.RELEASE,
    CreditLedger.Movement.ADJUSTMENT,
}
_DEBIT_TYPES = {
    CreditLedger.Movement.DEDUCTION,
    CreditLedger.Movement.EXPIRY,
}


class InsufficientCredits(EntitlementDenied):
    status_code = 402
    default_code = "credit_exhausted"
    default_detail = _("JURIA credits are exhausted. The rest of the workspace stays available.")


def _retry_locked(operation):
    """SQLite (local dev) raises immediately when another request holds the wallet row."""
    import time

    last_error = None
    for attempt in range(6):
        try:
            return operation()
        except OperationalError as exc:
            last_error = exc
            time.sleep(0.05 * (attempt + 1))
    raise last_error


def operation_for_mode(mode: str) -> str:
    return MODE_TO_OPERATION.get((mode or "CHAT").upper(), "legal_question")


def tariff_credits(operation: str) -> int:
    row = CreditTariff.objects.filter(operation=operation, is_active=True).only("credits").first()
    if row is None:
        raise EntitlementDenied(
            detail=_("This JURIA operation is not available."),
            code="unknown_operation",
        )
    return int(row.credits)


def _apply_locked(wallet: CreditWallet, *, movement: str, amount: int, description: str, key: str, usage=None) -> CreditLedger:
    existing = CreditLedger.objects.filter(cabinet_id=wallet.cabinet_id, idempotency_key=key).first()
    if existing is not None:
        return existing
    before = wallet.balance
    if movement in _DEBIT_TYPES:
        if amount > before:
            raise InsufficientCredits()
        after = before - amount
    elif movement in _GRANT_TYPES:
        after = before + amount
    else:
        raise EntitlementDenied(detail=_("Unknown credit movement."), code="invalid_movement")
    wallet.balance = after
    wallet.save(update_fields=["balance", "updated_at"])
    try:
        return CreditLedger.objects.create(
            cabinet_id=wallet.cabinet_id,
            movement_type=movement,
            amount=amount,
            balance_before=before,
            balance_after=after,
            description=description[:255],
            usage_event=usage,
            idempotency_key=key,
        )
    except IntegrityError:
        wallet.balance = before
        wallet.save(update_fields=["balance", "updated_at"])
        return CreditLedger.objects.get(cabinet_id=wallet.cabinet_id, idempotency_key=key)


def grant(*, cabinet, movement: str, amount: int, description: str, idempotency_key: str) -> CreditLedger | None:
    if amount < 0:
        raise EntitlementDenied(detail=_("Credit grants must be positive."), code="invalid_amount")

    def _once():
        with transaction.atomic():
            wallet = CreditWallet.objects.select_for_update().get(cabinet=cabinet)
            if CreditLedger.objects.filter(cabinet=cabinet, idempotency_key=idempotency_key).exists():
                return CreditLedger.objects.get(cabinet=cabinet, idempotency_key=idempotency_key)
            return _apply_locked(
                wallet,
                movement=movement,
                amount=amount,
                description=description,
                key=idempotency_key,
            )

    return _retry_locked(_once)


def expire_balance(*, cabinet, idempotency_key: str, description: str) -> None:
    with transaction.atomic():
        wallet = CreditWallet.objects.select_for_update().get(cabinet=cabinet)
        if wallet.balance <= 0:
            return
        if CreditLedger.objects.filter(cabinet=cabinet, idempotency_key=idempotency_key).exists():
            return
        _apply_locked(
            wallet,
            movement=CreditLedger.Movement.EXPIRY,
            amount=wallet.balance,
            description=description,
            key=idempotency_key,
        )


def reserve_for_operation(*, user, cabinet, operation: str, idempotency_key: str) -> AIUsageEvent | None:
    """Reserve credits before a model call. Returns None when the cabinet has no wallet.

    Cabinets created before billing have no wallet and are not metered.
    """
    if not CreditWallet.objects.filter(cabinet=cabinet).exists():
        return None
    credits = tariff_credits(operation)

    def _once():
        with transaction.atomic():
            wallet = CreditWallet.objects.select_for_update().get(cabinet=cabinet)
            existing = AIUsageEvent.objects.filter(cabinet=cabinet, idempotency_key=idempotency_key).first()
            if existing is not None:
                return existing
            if wallet.balance < credits:
                raise InsufficientCredits()
            usage = AIUsageEvent.objects.create(
                cabinet=cabinet,
                user=user,
                operation=operation,
                credits=credits,
                outcome=AIUsageEvent.Outcome.RESERVED,
                idempotency_key=idempotency_key,
            )
            _apply_locked(
                wallet,
                movement=CreditLedger.Movement.DEDUCTION,
                amount=credits,
                description=operation,
                key=f"deduct:{idempotency_key}",
                usage=usage,
            )
            return usage

    return _retry_locked(_once)


def commit_reservation(usage: AIUsageEvent | None, *, input_tokens: int = 0, output_tokens: int = 0, model_name: str = "") -> None:
    if usage is None:
        return
    AIUsageEvent.objects.filter(pk=usage.pk).update(
        outcome=AIUsageEvent.Outcome.COMMITTED,
        input_tokens=max(int(input_tokens or 0), 0),
        output_tokens=max(int(output_tokens or 0), 0),
        model_name=(model_name or "")[:120],
    )


def release_reservation(usage: AIUsageEvent | None) -> None:
    if usage is None:
        return
    with transaction.atomic():
        locked = AIUsageEvent.objects.select_for_update().get(pk=usage.pk)
        if locked.outcome != AIUsageEvent.Outcome.RESERVED:
            return
        wallet = CreditWallet.objects.select_for_update().get(cabinet_id=locked.cabinet_id)
        _apply_locked(
            wallet,
            movement=CreditLedger.Movement.RELEASE,
            amount=locked.credits,
            description=f"release:{locked.operation}",
            key=f"release:{locked.idempotency_key}",
            usage=locked,
        )
        locked.outcome = AIUsageEvent.Outcome.RELEASED
        locked.save(update_fields=["outcome"])
