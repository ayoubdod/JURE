# backend/tasks/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, AppointmentViewSet, CalendarEventsView

router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')
router.register('appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('', include(router.urls)),
    path('calendar/events', CalendarEventsView.as_view(), name='calendar-events'),
]
