# cases/services.py
"""Case domain operations not tied to HTTP (e.g. consultation → litigation/administrative)."""
from django.db import transaction

from .constants import ADMINISTRATIVE_CONVERSION_FIELD_KEYS, LITIGATION_CONVERSION_FIELD_KEYS
from .models import Case
from .utils import generate_unique_reference


def execute_consultation_conversion(
    source: Case,
    target_type: str,
    extra_data: dict,
    cabinet,
    user,
) -> Case:
    """
    Create the derived case and link source.converted_to_case (atomic).

    Caller must validate case type, readiness, target_type, and duplicate conversion.

    Args:
        source: CONSULTATION case to convert from.
        target_type: Case.CaseType.LITIGATION or ADMINISTRATIVE.
        extra_data: Request payload without targetType; optional type-specific fields.
        cabinet: Target cabinet for the new case.
        user: Acting user (created_by).

    Returns:
        The newly created Case instance.
    """
    consultation_data = source.case_specific_data or {}
    new_reference = generate_unique_reference()
    new_case_data = {
        "reference": new_reference,
        "title": source.title,
        "client": source.client,
        "assigned_to": source.assigned_to,
        "description": consultation_data.get("legalQuestion") or source.description,
        "summary": consultation_data.get("adviceSummary") or source.summary or "",
        "status": Case.CaseStatus.OPEN,
        "case_type": target_type,
        "cabinet": cabinet,
        "court": source.court or "",
        "category": source.category,
        "case_specific_data": {},
        "converted_from_case": source,
        "created_by": user,
    }

    allowed = (
        LITIGATION_CONVERSION_FIELD_KEYS
        if target_type == Case.CaseType.LITIGATION
        else ADMINISTRATIVE_CONVERSION_FIELD_KEYS
    )
    for key, value in extra_data.items():
        if key in allowed and value is not None:
            new_case_data["case_specific_data"][key] = value

    with transaction.atomic():
        new_case = Case.objects.create(**new_case_data)
        source.converted_to_case = new_case
        source.save(update_fields=["converted_to_case"])

    try:
        from notifications.services.notification_service import notify_case_converted

        notify_case_converted(source, new_case, target_type)
    except Exception:
        import logging

        logging.getLogger(__name__).exception("notify_case_converted failed")

    return new_case
