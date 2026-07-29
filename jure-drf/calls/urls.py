from django.urls import path

from .views import IceServersView

urlpatterns = [
    path("ice-servers/", IceServersView.as_view(), name="ice-servers"),
]
