from django.urls import path, include
from .views import CaseViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# Empty prefix: POST/GET /api/v1/cases/ (not /api/v1/cases/cases/)
router.register('', CaseViewSet, basename='case')

urlpatterns = [
    path('', include(router.urls)),
]

