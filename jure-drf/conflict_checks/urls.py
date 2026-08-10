from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConflictCheckViewSet, ConflictSearchView

router = DefaultRouter()
router.register(r"", ConflictCheckViewSet, basename="conflict-check")

urlpatterns = [
    path("search/", ConflictSearchView.as_view(), name="conflict-check-search"),
    path("", include(router.urls)),
]
