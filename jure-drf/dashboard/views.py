from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.downloads import serve_file_field
from core.permissions import IsCabinetMember
from core.utils import get_user_cabinet
from juria.views.mixins import JuriaEnabledMixin

from .announcements import (
    dismiss_announcement_in_session,
    get_dismissed_announcement_ids,
    serialize_announcement,
)
from .models import Announcement
from .services.assist import AssistUnavailable, answer_dashboard_query, generate_daily_briefing
from .services.overview import build_dashboard_stats, build_overview_payload

# Re-export for existing tests that import from dashboard.views
__all__ = [
    "DashboardOverview",
    "DashboardBriefingView",
    "DashboardAskView",
    "AnnouncementListView",
    "AnnouncementDetailView",
    "AnnouncementMediaDownloadView",
    "AnnouncementDismissView",
    "build_dashboard_stats",
]


class DashboardOverview(APIView):
    """
    Role-aware cabinet dashboard overview.

    Cabinet is resolved solely from the authenticated user. Finance is included
    only when the user passes the same OWNER/ADMIN rule as IsFinanceAuthorized.
    """

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)

        # Ignore any client-supplied cabinet identifiers.
        payload = build_overview_payload(
            user=request.user,
            cabinet=cab,
            request=request,
            juria_enabled=bool(getattr(settings, "JURIA_ENABLED", False)),
        )
        return Response(payload)


class DashboardBriefingView(JuriaEnabledMixin, APIView):
    """P3.1 — read-only JURIA daily briefing over authorized dashboard queues."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        language = (request.query_params.get("language") or getattr(request.user, "language", None) or "fr")
        try:
            payload = generate_daily_briefing(
                user=request.user,
                cabinet=cab,
                language=str(language)[:16],
                request=request,
            )
        except AssistUnavailable as exc:
            return Response({"detail": exc.detail, "code": exc.code}, status=exc.status)
        return Response(payload)


class DashboardAskView(JuriaEnabledMixin, APIView):
    """P3.2 — NL ask over authorized dashboard facts (keyword-ranked, not vector RAG)."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def post(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        question = request.data.get("question") if hasattr(request, "data") else None
        language = (
            (request.data.get("language") if hasattr(request, "data") else None)
            or getattr(request.user, "language", None)
            or "fr"
        )
        try:
            payload = answer_dashboard_query(
                user=request.user,
                cabinet=cab,
                question=str(question or ""),
                language=str(language)[:16],
                request=request,
            )
        except AssistUnavailable as exc:
            return Response({"detail": exc.detail, "code": exc.code}, status=exc.status)
        return Response(payload)


class AnnouncementListView(APIView):
    """GLOBAL + current cabinet jurisdiction announcements. Backend-enforced."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        dismissed_ids = get_dismissed_announcement_ids(request)
        qs = Announcement.active_for_cabinet(cab, exclude_ids=dismissed_ids)
        return Response([serialize_announcement(item, request=request) for item in qs])


class AnnouncementDetailView(APIView):
    """Object-level: a Morocco user cannot retrieve a Qatar announcement by ID."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request, announcement_id: int):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        announcement = Announcement.active_for_cabinet(cab).filter(pk=announcement_id).first()
        if not announcement:
            return Response({"detail": "Announcement not found."}, status=404)
        return Response(serialize_announcement(announcement, request=request))


class AnnouncementMediaDownloadView(APIView):
    """Authenticated media download for announcements visible to the user's cabinet."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request, announcement_id: int):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        announcement = Announcement.active_for_cabinet(cab).filter(pk=announcement_id).first()
        if announcement is None or not announcement.media:
            return Response({"detail": "Announcement not found."}, status=404)
        return serve_file_field(
            request,
            announcement.media,
            filename=announcement.media.name,
            content_type=getattr(announcement.media, "content_type", None),
        )


class AnnouncementDismissView(APIView):
    """
    Hide an announcement for the current connection/session only.

    Dismissal is stored on the Django session — it does NOT permanently
    hide the announcement for the user or cabinet. A new login/session
    will show the announcement again if it is still active.
    """

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def post(self, request, announcement_id: int):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)

        announcement = Announcement.active_for_cabinet(cab).filter(pk=announcement_id).first()
        if announcement is None:
            # Do not leak existence of other cabinets' announcements.
            return Response({"detail": "Announcement not found."}, status=404)

        dismiss_announcement_in_session(request, announcement.id)
        return Response({"detail": "Announcement hidden for this session."}, status=200)
