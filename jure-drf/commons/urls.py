from django.urls import path, include
from .views import ContactViewSet, ActivityViewSet, FunctionViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

router.register(r'contacts', ContactViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'functions', FunctionViewSet)  

urlpatterns = [
    path('', include(router.urls)),
]

