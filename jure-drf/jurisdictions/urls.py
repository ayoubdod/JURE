from django.urls import path

from .views import JurisdictionViewSet

app_name = "jurisdictions"

urlpatterns = [
    path(
        "",
        JurisdictionViewSet.as_view({"get": "list"}),
        name="jurisdiction-list",
    ),
    path(
        "<str:code>/",
        JurisdictionViewSet.as_view({"get": "retrieve"}),
        name="jurisdiction-detail",
    ),
]
