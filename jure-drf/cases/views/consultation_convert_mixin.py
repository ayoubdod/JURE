# cases/views/consultation_convert_mixin.py
"""POST .../convert/ action for consultation → litigation/administrative."""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.utils import get_user_cabinet

from ..models import Case
from ..services import execute_consultation_conversion
from ..utils import is_consultation_ready_to_convert


class ConsultationConvertMixin:
    """Adds `convert` action to a CaseViewSet."""

    @action(detail=True, methods=["POST"], url_path="convert")
    def convert(self, request, pk=None):
        """
        POST /api/v1/cases/:id/convert/

        Convert a CONSULTATION to LITIGATION or ADMINISTRATIVE when readiness rules pass.
        """
        source = self.get_object()

        if source.case_type != Case.CaseType.CONSULTATION:
            return Response(
                {
                    "detail": "Source case is not a CONSULTATION.",
                    "code": "wrong_case_type",
                    "case_type": source.case_type,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ready, fields_checked = is_consultation_ready_to_convert(source)
        if not ready:
            return Response(
                {
                    "detail": "This consultation cannot be converted in its current state.",
                    "code": "not_ready_to_convert",
                    "fields_checked": fields_checked,
                    "status": source.status,
                    "case_specific_data": source.case_specific_data or {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_type = request.data.get("targetType")
        if not target_type:
            return Response(
                {
                    "detail": "targetType is required.",
                    "code": "target_type_required",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_type not in (Case.CaseType.LITIGATION, Case.CaseType.ADMINISTRATIVE):
            return Response(
                {
                    "detail": "targetType must be LITIGATION or ADMINISTRATIVE.",
                    "code": "invalid_target_type",
                    "target_type": target_type,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if source.converted_to_case_id is not None:
            derived = source.converted_to_case
            return Response(
                {
                    "detail": f"This consultation has already been converted to case [{derived.reference}].",
                    "code": "already_converted",
                    "converted_to_case_id": derived.id,
                    "converted_to_case_reference": derived.reference,
                },
                status=status.HTTP_409_CONFLICT,
            )

        cab = get_user_cabinet(request.user)
        if not cab:
            raise PermissionDenied("User has no cabinet.")

        extra_data = request.data.copy()
        extra_data.pop("targetType", None)

        new_case = execute_consultation_conversion(
            source=source,
            target_type=target_type,
            extra_data=extra_data,
            cabinet=cab,
            user=request.user,
        )

        serializer = self.get_serializer(new_case)
        return Response(
            {
                "success": True,
                "newCase": serializer.data,
                "originalConsultation": {
                    "id": source.id,
                    "reference": source.reference,
                    "convertedToCase": {"id": new_case.id, "reference": new_case.reference},
                },
            },
            status=status.HTTP_201_CREATED,
        )
