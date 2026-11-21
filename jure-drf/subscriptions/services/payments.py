"""Verified payment events. A browser callback is not a payment."""

from __future__ import annotations

import hashlib
import hmac
import json

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import APIException, ValidationError

from subscriptions.models import PaymentEvent, Subscription
from subscriptions.services.lifecycle import activate_from_verified_payment


class PaymentProviderNotConfigured(APIException):
    status_code = 503
    default_detail = "No payment provider is configured."
    default_code = "payment_provider_unconfigured"


def webhook_secret() -> str:
    return str(getattr(settings, "JURE_BILLING_WEBHOOK_SECRET", "") or "")


def verify_signature(raw_body: bytes, signature: str) -> bool:
    secret = webhook_secret()
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip())


@transaction.atomic
def apply_signed_event(*, raw_body: bytes, signature: str) -> dict:
    if not webhook_secret():
        raise PaymentProviderNotConfigured()
    if not verify_signature(raw_body, signature):
        raise ValidationError({"signature": "Payment notification could not be verified."})
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError({"body": "Payment notification is not valid JSON."}) from exc
    event_id = str(payload.get("event_id") or "").strip()
    event_type = str(payload.get("event_type") or "").strip()
    cabinet_id = payload.get("cabinet_id")
    if not event_id or event_type not in {"payment_succeeded", "payment_failed"}:
        raise ValidationError({"event_type": "Unsupported payment event."})
    existing = PaymentEvent.objects.filter(event_id=event_id).first()
    if existing is not None:
        return {"duplicate": True, "event_id": event_id, "processed": existing.processed}
    event = PaymentEvent.objects.create(
        event_id=event_id,
        event_type=event_type,
        cabinet_id=cabinet_id if cabinet_id else None,
        processed=False,
    )
    subscription = (
        Subscription.objects.select_for_update()
        .filter(cabinet_id=cabinet_id)
        .select_related("plan", "pending_plan")
        .first()
    )
    if subscription is None:
        raise ValidationError({"cabinet_id": "No subscription matches this payment."})
    if event_type == "payment_failed":
        if subscription.status == Subscription.Status.ACTIVE:
            subscription.status = Subscription.Status.PAST_DUE
            subscription.save(update_fields=["status", "updated_at"])
        event.processed = True
        event.save(update_fields=["processed"])
        return {"duplicate": False, "status": subscription.status}
    activate_from_verified_payment(subscription, event_id=event_id)
    event.processed = True
    event.save(update_fields=["processed"])
    subscription.refresh_from_db()
    return {"duplicate": False, "status": subscription.status}
