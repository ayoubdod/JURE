# case_calendar/views/calendar.py
"""HTTP entrypoints for the unified calendar API."""
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from cabinets.permissions import HasTasksPermission

from ..services import fetch_unified_calendar_events


class UnifiedCalendarEventsView(APIView):
    """
    GET /api/v1/calendar/events/?dateFrom=&dateTo=&types=

    Returns merged tasks, appointments, and case-derived dates for the user's cabinet.
    """

    permission_classes = [permissions.IsAuthenticated, HasTasksPermission]

    def get(self, request):
        events = fetch_unified_calendar_events(
            request.user,
            request.query_params.get("dateFrom"),
            request.query_params.get("dateTo"),
            request.query_params.get("types"),
        )
        return Response(events)
