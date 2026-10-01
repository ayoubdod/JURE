from django.urls import include, path
from rest_framework.routers import DefaultRouter

from consultations.views import PortalCaseViewSet, PortalDashboardView

router = DefaultRouter()
router.register("cases", PortalCaseViewSet, basename="portal-case")

urlpatterns = [
    path("dashboard/", PortalDashboardView.as_view(), name="portal-dashboard"),
    path("", include(router.urls)),
]
