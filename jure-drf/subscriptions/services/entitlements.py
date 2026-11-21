"""Server-side organisation entitlements. Callers must not trust the client."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from subscriptions.catalog import TRIAL_MAX_USERS
from subscriptions.exceptions import EntitlementDenied
from subscriptions.models import Subscription

User = get_user_model()


def seats_used(cabinet) -> int:
    return (
        User.objects.filter(
            Q(pk=cabinet.owner_id) | Q(cabinet=cabinet, is_cabinet_member=True),
            is_active=True,
        )
        .distinct()
        .count()
    )


def seat_limit(subscription: Subscription | None) -> int | None:
    """None means do not enforce (legacy cabinet, or a custom unlimited plan)."""
    if subscription is None:
        return None
    status = subscription.status
    if status in (Subscription.Status.TRIALING, Subscription.Status.PENDING_VERIFICATION):
        return TRIAL_MAX_USERS
    if status == Subscription.Status.ACTIVE:
        return subscription.plan.maximum_users
    return 0


def storage_limit_bytes(subscription: Subscription | None) -> int | None:
    if subscription is None:
        return None
    if subscription.status not in Subscription.WRITE_ALLOWED:
        return 0
    return subscription.plan.storage_bytes


def storage_used_bytes(cabinet) -> int:
    total = 0
    from library.models import Document

    for doc in Document.objects.filter(cabinet=cabinet).exclude(file="").only("file"):
        try:
            total += int(doc.file.size or 0)
        except Exception:
            continue
    from cases.models import CaseAttachment

    for attachment in (
        CaseAttachment.objects.filter(case__cabinet=cabinet).exclude(file="").only("file")
    ):
        try:
            total += int(attachment.file.size or 0)
        except Exception:
            continue
    from juria.models import JuriaFile

    sizes = JuriaFile.objects.filter(project__cabinet=cabinet).values_list("size_bytes", flat=True)
    for size in sizes:
        if size:
            total += int(size)
    return total


def assert_can_add_member(cabinet) -> None:
    from subscriptions.services.lifecycle import load_subscription

    subscription = load_subscription(cabinet)
    limit = seat_limit(subscription)
    if limit is None:
        return
    used = seats_used(cabinet)
    if used >= limit:
        raise EntitlementDenied(
            detail=_("This organisation has reached its user limit."),
            code="seat_limit",
        )


def assert_storage(cabinet, additional_bytes: int) -> None:
    from subscriptions.services.lifecycle import load_subscription

    subscription = load_subscription(cabinet)
    limit = storage_limit_bytes(subscription)
    if limit is None:
        return
    additional = max(int(additional_bytes or 0), 0)
    if storage_used_bytes(cabinet) + additional > limit:
        raise EntitlementDenied(
            detail=_("This organisation has reached its storage limit."),
            code="storage_limit",
        )


def has_feature(subscription: Subscription | None, key: str) -> bool:
    if subscription is None:
        return True
    if subscription.status not in Subscription.WRITE_ALLOWED:
        return False
    return key in set(subscription.plan.feature_entitlements or [])
