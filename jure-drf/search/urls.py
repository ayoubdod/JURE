from django.urls import path

from .views import ShareableSearchView

urlpatterns = [
    path("shareable/", ShareableSearchView.as_view(), name="search-shareable"),
]
