from django.urls import path

from .views import ActiveCallView, IceServersView

urlpatterns = [
    path("ice-servers/", IceServersView.as_view(), name="ice-servers"),
    path("active/", ActiveCallView.as_view(), name="active-call"),
]
