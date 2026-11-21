from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from subscriptions.models import AIUsageEvent, CreditWallet, Plan, SubscriptionInvoice
from subscriptions.permissions import IsBillingAdmin
from subscriptions.services.catalog import public_plan_payload, trial_policy
from subscriptions.services.entitlements import seats_used, seat_limit, storage_limit_bytes, storage_used_bytes
from subscriptions.services.lifecycle import cancel_subscription, change_plan, is_billing_admin, load_subscription
from subscriptions.services.payments import apply_signed_event


def _subscription_payload(user) -> dict | None:
    cabinet = get_user_cabinet(user)
    if cabinet is None:
        return None
    subscription = load_subscription(cabinet)
    if subscription is None:
        return None
    wallet = CreditWallet.objects.filter(cabinet=cabinet).first()
    limit_bytes = storage_limit_bytes(subscription)
    now = timezone.now()
    trial_days_left = None
    if subscription.trial_end and subscription.status in (
        subscription.Status.TRIALING,
        subscription.Status.PENDING_VERIFICATION,
    ):
        remaining = subscription.trial_end - now
        trial_days_left = max(remaining.days, 0)
    renews_at = subscription.current_period_end or subscription.trial_end
    payload = {
        "plan": public_plan_payload(subscription.plan),
        "billing_cycle": subscription.billing_cycle,
        "status": subscription.status,
        "list_price": None if subscription.list_price is None else str(subscription.list_price),
        "currency": subscription.currency,
        "trial_start": subscription.trial_start,
        "trial_end": subscription.trial_end,
        "trial_days_left": trial_days_left,
        "current_period_start": subscription.current_period_start,
        "current_period_end": subscription.current_period_end,
        "renews_or_expires_at": renews_at,
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "cancellation_date": subscription.cancellation_date,
        "pending_plan": public_plan_payload(subscription.pending_plan) if subscription.pending_plan_id else None,
        "pending_billing_cycle": subscription.pending_billing_cycle or None,
        "seats_used": seats_used(cabinet),
        "seat_limit": seat_limit(subscription),
        "storage_used_bytes": storage_used_bytes(cabinet),
        "storage_limit_bytes": limit_bytes,
        "monthly_juria_credits": subscription.plan.monthly_juria_credits,
        "credits_remaining": wallet.balance if wallet else 0,
        "can_manage": is_billing_admin(user),
        "payment_required": subscription.status == subscription.Status.PENDING_PAYMENT,
    }
    if payload["can_manage"]:
        payload["invoices"] = [
            {
                "number": row.number,
                "status": row.status,
                "currency": row.currency,
                "subtotal": str(row.subtotal),
                "vat_amount": str(row.vat_amount),
                "total": str(row.total),
                "description": row.description,
                "created_at": row.created_at,
                "paid_at": row.paid_at,
            }
            for row in SubscriptionInvoice.objects.filter(cabinet=cabinet).order_by("-created_at")[:50]
        ]
    return payload


class PlanListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        plans = Plan.objects.filter(is_active=True, is_public=True).order_by("display_order")
        return Response({"trial": trial_policy(), "plans": [public_plan_payload(plan) for plan in plans]})


class CurrentSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = _subscription_payload(request.user)
        if payload is None:
            return Response({"subscription": None})
        return Response(payload)


class ChangePlanView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        forbidden = {"monthly_price", "annual_price", "price", "list_price", "feature_entitlements", "maximum_users"}
        if forbidden & set(body.keys()):
            return Response(
                {"code": "price_override", "detail": "Prices and entitlements are defined by the catalogue."},
                status=400,
            )
        result = change_plan(
            user=request.user,
            plan_code=str(body.get("plan_code") or ""),
            billing_cycle=str(body.get("billing_cycle") or ""),
        )
        invoice = result.get("invoice")
        return Response(
            {
                "payment_required": result["payment_required"],
                "effective": result.get("effective"),
                "status": result["subscription"].status,
                "invoice": None
                if invoice is None
                else {
                    "number": invoice.number,
                    "status": invoice.status,
                    "total": str(invoice.total),
                    "currency": invoice.currency,
                },
                "subscription": _subscription_payload(request.user),
            }
        )


class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def post(self, request):
        subscription = cancel_subscription(user=request.user)
        return Response(
            {
                "status": subscription.status,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "cancellation_date": subscription.cancellation_date,
                "subscription": _subscription_payload(request.user),
            }
        )


class UsageView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def get(self, request):
        cabinet = get_user_cabinet(request.user)
        if cabinet is None:
            return Response({"results": []})
        rows = (
            AIUsageEvent.objects.filter(cabinet=cabinet)
            .select_related("user")
            .order_by("-created_at")[:100]
        )
        return Response(
            {
                "results": [
                    {
                        "operation": row.operation,
                        "credits": row.credits,
                        "outcome": row.outcome,
                        "user": getattr(row.user, "email", None),
                        "input_tokens": row.input_tokens,
                        "output_tokens": row.output_tokens,
                        "created_at": row.created_at,
                    }
                    for row in rows
                ]
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class PaymentWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        signature = request.headers.get("X-Jure-Signature", "")
        result = apply_signed_event(raw_body=request.body, signature=signature)
        return Response(result)
