from django.urls import path
from .views import DashboardOverview, AnnouncementDismissView

urlpatterns = [
    path("dashboard/overview/", DashboardOverview.as_view(), name="dashboard-overview"),
    path(
        "announcements/<int:announcement_id>/dismiss/",
        AnnouncementDismissView.as_view(),
        name="announcement-dismiss",
    ),
]
