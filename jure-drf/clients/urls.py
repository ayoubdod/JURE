from django.urls import path
from clients.views import ClientViewSet
from rest_framework.routers import DefaultRouter
from django.conf.urls import include

router = DefaultRouter()

router.register('clients', ClientViewSet, basename='client')
urlpatterns = [
    path('', include(router.urls)),
]