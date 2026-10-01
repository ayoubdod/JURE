from django.urls import include, path
from rest_framework.routers import DefaultRouter

from consultations.views import ConsultationRequestViewSet

router = DefaultRouter()
router.register("", ConsultationRequestViewSet, basename="consultation-request")

urlpatterns = [
    path("", include(router.urls)),
]
