from django.urls import path

from .views import (
    AnnouncementDismissView,
    DashboardAskView,
    DashboardBriefingView,
    DashboardOverview,
)

urlpatterns = [
    path("dashboard/overview/", DashboardOverview.as_view(), name="dashboard-overview"),
    path("dashboard/briefing/", DashboardBriefingView.as_view(), name="dashboard-briefing"),
    path("dashboard/ask/", DashboardAskView.as_view(), name="dashboard-ask"),
    path(
        "announcements/<int:announcement_id>/dismiss/",
        AnnouncementDismissView.as_view(),
        name="announcement-dismiss",
    ),
]
