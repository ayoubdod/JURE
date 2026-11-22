from django.urls import path

from .views import (
    CancelSubscriptionView,
    ChangePlanView,
    CurrentSubscriptionView,
    PaymentWebhookView,
    PlanListView,
    UsageView,
)
from .views_resources import (
    BillingHistoryView,
    CreditPurchaseView,
    CreditView,
    PurchaseCancelView,
    PurchaseListView,
    StoragePurchaseView,
    StorageView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="subscription-plans"),
    path("current/", CurrentSubscriptionView.as_view(), name="subscription-current"),
    path("change-plan/", ChangePlanView.as_view(), name="subscription-change-plan"),
    path("cancel/", CancelSubscriptionView.as_view(), name="subscription-cancel"),
    path("usage/", UsageView.as_view(), name="subscription-usage"),
    path("payment-events/", PaymentWebhookView.as_view(), name="subscription-payment-events"),
    path("storage/", StorageView.as_view(), name="subscription-storage"),
    path("storage/purchase/", StoragePurchaseView.as_view(), name="subscription-storage-purchase"),
    path("credits/", CreditView.as_view(), name="subscription-credits"),
    path("credits/purchase/", CreditPurchaseView.as_view(), name="subscription-credits-purchase"),
    path("purchases/", PurchaseListView.as_view(), name="subscription-purchases"),
    path("purchases/<int:purchase_id>/cancel/", PurchaseCancelView.as_view(), name="subscription-purchase-cancel"),
    path("billing/", BillingHistoryView.as_view(), name="subscription-billing"),
]
