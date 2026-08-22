from django.urls import path

from .views import AnnouncementDetailView, AnnouncementDismissView, AnnouncementListView

urlpatterns = [
    path("", AnnouncementListView.as_view(), name="announcement-list"),
    path(
        "<int:announcement_id>/",
        AnnouncementDetailView.as_view(),
        name="announcement-detail",
    ),
    path(
        "<int:announcement_id>/dismiss/",
        AnnouncementDismissView.as_view(),
        name="announcement-dismiss",
    ),
]
