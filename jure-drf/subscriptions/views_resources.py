from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from subscriptions.models import AddonPurchase, CreditPackage, StoragePackage, SubscriptionInvoice
from subscriptions.permissions import IsBillingAdmin
from subscriptions.services.lifecycle import is_billing_admin, load_subscription
from subscriptions.services.resources import (
    cancel_purchase,
    credit_summary,
    package_payload_credits,
    package_payload_storage,
    purchase_payload,
    request_credit_purchase,
    request_storage_purchase,
    storage_summary,
)


def _error(exc: ValidationError):
    messages = getattr(exc, "messages", None) or [str(exc)]
    return Response({"detail": " ".join(messages)}, status=400)


def _pending_purchases(cabinet, user, kind: str):
    if cabinet is None or not is_billing_admin(user):
        return []
    rows = AddonPurchase.objects.filter(
        cabinet=cabinet,
        kind=kind,
        status=AddonPurchase.Status.PENDING_VERIFICATION,
    ).order_by("-created_at")[:20]
    return [purchase_payload(row) for row in rows]


class StorageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cabinet = get_user_cabinet(request.user)
        if cabinet is None:
            return Response({"subscription": None})
        subscription = load_subscription(cabinet)
        packages = StoragePackage.objects.filter(is_active=True)
        return Response(
            {
                **storage_summary(cabinet, subscription),
                "packages": [package_payload_storage(package) for package in packages],
                "pending_purchases": _pending_purchases(cabinet, request.user, AddonPurchase.Kind.STORAGE),
                "can_manage": is_billing_admin(request.user),
            }
        )


class StoragePurchaseView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def post(self, request):
        cabinet = get_user_cabinet(request.user)
        try:
            purchase = request_storage_purchase(
                cabinet=cabinet,
                package_code=str(request.data.get("package_code") or ""),
            )
        except ValidationError as exc:
            return _error(exc)
        return Response(purchase_payload(purchase), status=201)


class CreditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cabinet = get_user_cabinet(request.user)
        if cabinet is None:
            return Response({"subscription": None})
        subscription = load_subscription(cabinet)
        packages = CreditPackage.objects.filter(is_active=True)
        return Response(
            {
                **credit_summary(cabinet, subscription),
                "packages": [package_payload_credits(package) for package in packages],
                "pending_purchases": _pending_purchases(cabinet, request.user, AddonPurchase.Kind.CREDITS),
                "can_manage": is_billing_admin(request.user),
            }
        )


class CreditPurchaseView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def post(self, request):
        cabinet = get_user_cabinet(request.user)
        try:
            purchase = request_credit_purchase(
                cabinet=cabinet,
                package_code=str(request.data.get("package_code") or ""),
            )
        except ValidationError as exc:
            return _error(exc)
        return Response(purchase_payload(purchase), status=201)


class PurchaseListView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def get(self, request):
        cabinet = get_user_cabinet(request.user)
        if cabinet is None:
            return Response({"results": []})
        kind = request.query_params.get("kind")
        rows = AddonPurchase.objects.filter(cabinet=cabinet)
        if kind in {AddonPurchase.Kind.STORAGE, AddonPurchase.Kind.CREDITS}:
            rows = rows.filter(kind=kind)
        return Response({"results": [purchase_payload(row) for row in rows[:100]]})


class PurchaseCancelView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def post(self, request, purchase_id):
        cabinet = get_user_cabinet(request.user)
        try:
            purchase = cancel_purchase(cabinet=cabinet, purchase_id=purchase_id)
        except ValidationError as exc:
            return _error(exc)
        return Response(purchase_payload(purchase))


class BillingHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsBillingAdmin]

    def get(self, request):
        cabinet = get_user_cabinet(request.user)
        if cabinet is None:
            return Response({"invoices": [], "purchases": [], "tax_confirmed": False})
        invoices = [
            {
                "number": row.number,
                "status": row.status,
                "subtotal": str(row.subtotal),
                "total": str(row.total),
                "currency": row.currency,
                "description": row.description,
                "created_at": row.created_at,
                "paid_at": row.paid_at,
                "tax_confirmed": False,
            }
            for row in SubscriptionInvoice.objects.filter(cabinet=cabinet).order_by("-created_at")[:100]
        ]
        purchases = [
            purchase_payload(row)
            for row in AddonPurchase.objects.filter(cabinet=cabinet).order_by("-created_at")[:100]
        ]
        return Response({"invoices": invoices, "purchases": purchases, "tax_confirmed": False})
