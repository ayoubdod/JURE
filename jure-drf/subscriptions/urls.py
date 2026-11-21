from django.urls import path

from .views import (
    CancelSubscriptionView,
    ChangePlanView,
    CurrentSubscriptionView,
    PaymentWebhookView,
    PlanListView,
    UsageView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="subscription-plans"),
    path("current/", CurrentSubscriptionView.as_view(), name="subscription-current"),
    path("change-plan/", ChangePlanView.as_view(), name="subscription-change-plan"),
    path("cancel/", CancelSubscriptionView.as_view(), name="subscription-cancel"),
    path("usage/", UsageView.as_view(), name="subscription-usage"),
    path("payment-events/", PaymentWebhookView.as_view(), name="subscription-payment-events"),
]
