from django.urls import path

from .views import user_workspace

urlpatterns = [
    path("<int:pk>/workspace/", user_workspace, name="user-workspace"),
]
