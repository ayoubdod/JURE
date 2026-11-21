from django.urls import path

from .views import (
    anonymize_me,
    anonymize_user_by_id,
    user_media_download,
    user_workspace,
)

urlpatterns = [
    path("me/anonymize/", anonymize_me, name="user-anonymize-me"),
    path("<int:pk>/anonymize/", anonymize_user_by_id, name="user-anonymize"),
    path("<int:pk>/workspace/", user_workspace, name="user-workspace"),
    path("<int:pk>/<slug:field>/download/", user_media_download, name="user-media-download"),
]
