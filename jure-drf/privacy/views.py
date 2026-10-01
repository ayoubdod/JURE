"""Privacy Gateway API views."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from privacy.audit import log_privacy_event
from privacy.constants import PrivacyAuditAction
from privacy.models import CabinetPrivacyPolicy, PseudonymMappingSession
from privacy.permissions import IsCabinetStaff, require_staff_cabinet
from privacy.serializers import (
    CabinetPrivacyPolicySerializer,
    PrivacyAuditEntrySerializer,
    ReidentifyRequestSerializer,
)
from privacy.services.policy import get_or_create_cabinet_policy
from privacy.services.reidentifier import ReidentifyError, reidentify_text


class PrivacyPolicyView(APIView):
    permission_classes = [IsAuthenticated, IsCabinetStaff]

    def get(self, request):
        cabinet = require_staff_cabinet(request.user)
        if cabinet is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        policy = get_or_create_cabinet_policy(cabinet)
        return Response(CabinetPrivacyPolicySerializer(policy).data)

    def patch(self, request):
        cabinet = require_staff_cabinet(request.user)
        if cabinet is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        policy = get_or_create_cabinet_policy(cabinet)
        ser = CabinetPrivacyPolicySerializer(policy, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class PrivacyReidentifyView(APIView):
    permission_classes = [IsAuthenticated, IsCabinetStaff]

    def post(self, request):
        cabinet = require_staff_cabinet(request.user)
        if cabinet is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        ser = ReidentifyRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        session_id = ser.validated_data["session_id"]
        text = ser.validated_data["text"]

        try:
            session = PseudonymMappingSession.objects.get(
                id=session_id,
                cabinet_id=cabinet.id,
            )
        except PseudonymMappingSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        policy = get_or_create_cabinet_policy(cabinet)
        if policy.reidentification_requires_authorization and not IsCabinetStaff().has_permission(
            request, self
        ):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        log_privacy_event(
            cabinet=cabinet,
            actor=request.user,
            action=PrivacyAuditAction.REIDENTIFICATION_REQUESTED,
            message="Re-identification requested",
            project=session.project,
            session=session,
        )

        try:
            restored = reidentify_text(text, session=session, cabinet_id=cabinet.id)
        except ReidentifyError:
            return Response(
                {"detail": "Re-identification failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        log_privacy_event(
            cabinet=cabinet,
            actor=request.user,
            action=PrivacyAuditAction.REIDENTIFICATION_COMPLETED,
            message="Re-identification completed",
            project=session.project,
            session=session,
        )
        return Response({"session_id": str(session.id), "text": restored})


class PrivacyAuditListView(APIView):
    permission_classes = [IsAuthenticated, IsCabinetStaff]

    def get(self, request):
        cabinet = require_staff_cabinet(request.user)
        if cabinet is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        from dashboard.models import ActivityLog

        rows = (
            ActivityLog.objects.filter(cabinet_id=cabinet.id, entity_type="privacy")
            .select_related("actor")
            .order_by("-created")[:100]
        )
        payload = []
        for row in rows:
            actor = row.actor
            payload.append(
                {
                    "id": row.id,
                    "kind": row.kind,
                    "message": row.message,
                    "created": row.created,
                    "actor_id": actor.id if actor else None,
                    "actor_email": actor.email if actor else None,
                    "entity_id": row.entity_id,
                    "metadata": row.new_value,
                }
            )
        return Response(PrivacyAuditEntrySerializer(payload, many=True).data)
