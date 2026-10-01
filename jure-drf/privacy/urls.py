from django.urls import path

from privacy.views import PrivacyAuditListView, PrivacyPolicyView, PrivacyReidentifyView

urlpatterns = [
    path("policies/", PrivacyPolicyView.as_view(), name="privacy-policies"),
    path("reidentify/", PrivacyReidentifyView.as_view(), name="privacy-reidentify"),
    path("audit/", PrivacyAuditListView.as_view(), name="privacy-audit"),
]
