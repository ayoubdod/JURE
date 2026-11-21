"""Seed and read the plan catalogue. Prices never come from the client."""

from __future__ import annotations

from decimal import Decimal

from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

from subscriptions.catalog import PLANS, TARIFFS, TRIAL_CREDITS, TRIAL_DAYS, TRIAL_MAX_USERS, VAT_RATE
from subscriptions.models import CreditTariff, Plan


def seed_catalog() -> None:
    for row in PLANS:
        defaults = dict(row)
        code = defaults.pop("code")
        Plan.objects.update_or_create(code=code, defaults=defaults)
    for row in TARIFFS:
        CreditTariff.objects.update_or_create(
            operation=row["operation"],
            defaults={"credits": row["credits"], "is_active": True},
        )


def trial_policy() -> dict:
    return {
        "days": TRIAL_DAYS,
        "credits": TRIAL_CREDITS,
        "max_users": TRIAL_MAX_USERS,
        "vat_rate": VAT_RATE,
        "currency": "MAD",
        "prices_exclude_vat": True,
    }


def storage_gb(storage_bytes: int | None) -> int | None:
    if storage_bytes is None:
        return None
    return int(storage_bytes / (1024 ** 3))


def plan_price(plan: Plan, billing_cycle: str) -> Decimal | None:
    if billing_cycle == "annual":
        return plan.annual_price
    if billing_cycle == "monthly":
        return plan.monthly_price
    return None


def public_plan_payload(plan: Plan) -> dict:
    return {
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "monthly_price": None if plan.monthly_price is None else str(plan.monthly_price),
        "annual_price": None if plan.annual_price is None else str(plan.annual_price),
        "currency": plan.currency,
        "maximum_users": plan.maximum_users,
        "storage_gb": storage_gb(plan.storage_bytes),
        "monthly_juria_credits": plan.monthly_juria_credits,
        "is_self_serve": plan.is_self_serve,
        "is_recommended": plan.is_recommended,
        "features": list(plan.feature_entitlements or []),
    }


def resolve_registration_plan(plan_code: str, billing_cycle: str) -> Plan:
    code = (plan_code or "").strip().lower()
    cycle = (billing_cycle or "").strip().lower()
    if cycle not in ("monthly", "annual"):
        raise ValidationError({"billing_cycle": _("Choose monthly or annual billing.")})
    try:
        plan = Plan.objects.get(code=code, is_active=True, is_public=True)
    except Plan.DoesNotExist:
        raise ValidationError({"plan_code": _("Select an available plan.")})
    if not plan.is_self_serve or plan.monthly_price is None or plan.annual_price is None:
        raise ValidationError(
            {"plan_code": _("Enterprise is arranged with the JURE team and cannot be purchased at signup.")}
        )
    return plan
