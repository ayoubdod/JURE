from django.urls import path

from .views import UnifiedCalendarEventsView

urlpatterns = [
    path("events/", UnifiedCalendarEventsView.as_view(), name="unified-calendar-events"),
]
