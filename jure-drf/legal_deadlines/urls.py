from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CalculateDeadlineView,
    CalculatedDeadlineViewSet,
    DeadlineRuleListView,
    LegalDomainListView,
    LegalHolidayListView,
    LegalSourceListView,
    SeedLegalDataView,
)

router = DefaultRouter()
router.register(r"deadlines", CalculatedDeadlineViewSet, basename="legal-deadline")

urlpatterns = [
    path("domains/", LegalDomainListView.as_view(), name="legal-deadline-domains"),
    path("rules/", DeadlineRuleListView.as_view(), name="legal-deadline-rules"),
    path("holidays/", LegalHolidayListView.as_view(), name="legal-deadline-holidays"),
    path("sources/", LegalSourceListView.as_view(), name="legal-deadline-sources"),
    path("calculate/", CalculateDeadlineView.as_view(), name="legal-deadline-calculate"),
    path("seed/", SeedLegalDataView.as_view(), name="legal-deadline-seed"),
    path("", include(router.urls)),
]
