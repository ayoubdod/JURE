from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from cabinets.permissions import has_permission
from core.utils import NumericPagination, get_user_cabinet
from dashboard.models import ActivityLog

from .engine import search_conflicts
from .models import ConflictCheck, PotentialMatch
from .serializers import (
    ConflictCheckReviewSerializer,
    ConflictCheckSerializer,
    ConflictSearchSerializer,
    PotentialMatchReviewSerializer,
    PotentialMatchSerializer,
)


class IsCabinetConflictChecker(permissions.BasePermission):
    """Require cases.view and clients.view — conflict search spans both resources."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_permission(request.user, "cases.view") and has_permission(
            request.user, "clients.view"
        )


def _persist_search(*, cabinet, user, query: str, matter_id, exclude_matter_id) -> ConflictCheck:
    outcome = search_conflicts(
        cabinet=cabinet,
        query=query,
        exclude_matter_id=exclude_matter_id,
    )

    with transaction.atomic():
        check = ConflictCheck.objects.create(
            cabinet=cabinet,
            initiated_by=user,
            matter_id=matter_id,
            search_query=query,
            result_count=len(outcome.hits),
            status=ConflictCheck.ReviewStatus.PENDING_REVIEW,
        )
        PotentialMatch.objects.bulk_create(
            [
                PotentialMatch(
                    conflict_check=check,
                    entity_type=hit.entity_type,
                    entity_id=hit.entity_id,
                    entity_name=hit.entity_name[:255],
                    matter_id=hit.matter_id,
                    role=hit.role,
                    match_type=hit.match_type,
                    confidence=hit.confidence,
                    match_reason=hit.match_reason[:255],
                )
                for hit in outcome.hits
            ]
        )
        ActivityLog.objects.create(
            cabinet=cabinet,
            kind="conflict_check",
            message=(
                f'{_user_label(user)} ran conflict check for "{query[:80]}" '
                f"({len(outcome.hits)} potential match(es))"
            )[:255],
        )
    return check


def _user_label(user) -> str:
    parts = [p for p in (getattr(user, "first_name", "") or "", getattr(user, "last_name", "") or "") if p]
    return " ".join(parts).strip() or getattr(user, "email", "User")


class ConflictSearchView(APIView):
    """
    POST /api/v1/conflict-checks/search/

    Body: { "query": "...", "matter_id": null, "exclude_matter_id": null }
    Runs an authorized search, persists the check + matches, returns the record.
    """

    permission_classes = [permissions.IsAuthenticated, IsCabinetConflictChecker]

    def post(self, request):
        cabinet = get_user_cabinet(request.user)
        if not cabinet:
            return Response(
                {"detail": "You must belong to a cabinet to run a conflict check."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ConflictSearchSerializer(
            data=request.data,
            context={"cabinet": cabinet},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        check = _persist_search(
            cabinet=cabinet,
            user=request.user,
            query=data["query"].strip(),
            matter_id=data.get("matter_id"),
            exclude_matter_id=data.get("exclude_matter_id"),
        )
        check = (
            ConflictCheck.objects.filter(pk=check.pk)
            .select_related("initiated_by", "matter", "reviewed_by")
            .prefetch_related("matches__matter")
            .get()
        )
        return Response(ConflictCheckSerializer(check).data, status=status.HTTP_201_CREATED)


class ConflictCheckViewSet(viewsets.ReadOnlyModelViewSet):
    """List/retrieve persisted conflict checks for the authenticated cabinet."""

    permission_classes = [permissions.IsAuthenticated, IsCabinetConflictChecker]
    serializer_class = ConflictCheckSerializer
    pagination_class = NumericPagination

    def get_queryset(self):
        cabinet = get_user_cabinet(self.request.user)
        if not cabinet:
            return ConflictCheck.objects.none()
        return (
            ConflictCheck.objects.filter(cabinet=cabinet)
            .select_related("initiated_by", "matter", "reviewed_by")
            .prefetch_related("matches__matter")
        )

    @action(detail=True, methods=["patch"], url_path="review")
    def review(self, request, pk=None):
        """Record overall lawyer review outcome for the conflict check."""
        check = self.get_object()
        ser = ConflictCheckReviewSerializer(check, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        check.status = ser.validated_data.get("status", check.status)
        check.notes = ser.validated_data.get("notes", check.notes)
        check.reviewed_by = request.user
        check.reviewed_at = timezone.now()
        check.save(
            update_fields=["status", "notes", "reviewed_by", "reviewed_at", "modified"]
        )
        ActivityLog.objects.create(
            cabinet=check.cabinet,
            kind="conflict_check_review",
            message=(
                f'{_user_label(request.user)} reviewed conflict check "{check.search_query[:60]}" '
                f"→ {check.status}"
            )[:255],
        )
        return Response(ConflictCheckSerializer(check).data)

    @action(
        detail=True,
        methods=["patch"],
        url_path=r"matches/(?P<match_id>[0-9]+)/review",
    )
    def review_match(self, request, pk=None, match_id=None):
        check = self.get_object()
        try:
            match = check.matches.get(pk=match_id)
        except PotentialMatch.DoesNotExist:
            return Response({"detail": "Match not found."}, status=status.HTTP_404_NOT_FOUND)

        ser = PotentialMatchReviewSerializer(match, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        match.review_status = ser.validated_data.get("review_status", match.review_status)
        match.notes = ser.validated_data.get("notes", match.notes)
        match.reviewed_by = request.user
        match.reviewed_at = timezone.now()
        match.save(
            update_fields=[
                "review_status",
                "notes",
                "reviewed_by",
                "reviewed_at",
                "modified",
            ]
        )
        return Response(PotentialMatchSerializer(match).data)
