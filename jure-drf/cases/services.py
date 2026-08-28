# cases/services.py
"""Case domain operations not tied to HTTP (e.g. consultation → litigation/administrative)."""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .activity import log_consultation_activity
from .constants import ADMINISTRATIVE_CONVERSION_FIELD_KEYS, LITIGATION_CONVERSION_FIELD_KEYS
from .models import Case, CaseAttachment
from .reference import allocate_follow_up_reference, allocate_typed_reference
from .utils import generate_unique_reference


def close_case(
    case: Case,
    user,
    *,
    outcome: str = "",
    lessons: str = "",
    precedents: str = "",
) -> tuple[Case, bool, str]:
    """
    Persist matter closure: set status=CLOSED, optional close notes, audit ActivityLog.

    Idempotent when already CLOSED (no duplicate audit row).

    Returns:
        (case, already_closed, previous_status)
    """
    previous_status = case.status
    already_closed = previous_status == Case.CaseStatus.CLOSED

    if already_closed:
        return case, True, previous_status

    data = dict(case.case_specific_data or {})
    notes = {
        k: v.strip()
        for k, v in {
            "outcome": outcome or "",
            "lessons": lessons or "",
            "precedents": precedents or "",
        }.items()
        if (v or "").strip()
    }
    if notes:
        existing = data.get("close_summary")
        if not isinstance(existing, dict):
            existing = {}
        data["close_summary"] = {
            **existing,
            **notes,
            "closed_at": timezone.now().isoformat(),
            "closed_by_id": getattr(user, "id", None),
            "previous_status": previous_status,
        }

    with transaction.atomic():
        case.status = Case.CaseStatus.CLOSED
        case.updated_by = user
        update_fields = ["status", "updated_by", "modified"]
        if notes:
            case.case_specific_data = data
            update_fields.append("case_specific_data")
        case.save(update_fields=update_fields)

        if case.cabinet_id:
            from dashboard.models import ActivityLog

            ref = case.reference or str(case.id)
            title = case.title or "Untitled"
            ActivityLog.objects.create(
                cabinet_id=case.cabinet_id,
                kind="matter_closed",
                message=(
                    f"Matter closed: {ref} — {title} "
                    f"({previous_status} → {Case.CaseStatus.CLOSED})"
                ),
            )

    return case, False, previous_status


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
    if cabinet:
        new_reference = allocate_typed_reference(cabinet, target_type)
    else:
        new_reference = generate_unique_reference()
    legal_domain = consultation_data.get("legalDomain")
    custom_domain = consultation_data.get("customLegalDomain")
    facts = consultation_data.get("factsContext") or ""
    notes = consultation_data.get("adviceSummary") or source.summary or ""
    legal_question = consultation_data.get("legalQuestion") or source.description
    description_parts = [legal_question]
    if facts:
        description_parts.append(f"Facts / additional context:\n{facts}")
    if notes:
        description_parts.append(f"Consultation notes:\n{notes}")
    new_case_data = {
        "reference": new_reference,
        "title": source.title,
        "client": source.client,
        "assigned_to": source.assigned_to,
        "description": "\n\n".join(p for p in description_parts if p),
        "summary": notes,
        "status": Case.CaseStatus.OPEN,
        "case_type": target_type,
        "cabinet": cabinet,
        "court": source.court or "",
        "category": source.category,
        "case_specific_data": {},
        "converted_from_case": source,
        "created_by": user,
    }
    if legal_domain:
        new_case_data["case_specific_data"]["sourceLegalDomain"] = legal_domain
    if custom_domain:
        new_case_data["case_specific_data"]["customLegalDomain"] = custom_domain
    new_case_data["case_specific_data"]["sourceConsultationReference"] = source.reference

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
        attorney_ids = list(source.assigned_attorneys.values_list("id", flat=True))
        if source.assigned_to_id and source.assigned_to_id not in attorney_ids:
            attorney_ids.append(source.assigned_to_id)
        if attorney_ids:
            new_case.assigned_attorneys.set(attorney_ids)
        source.converted_to_case = new_case
        source.save(update_fields=["converted_to_case"])
        for attachment in CaseAttachment.objects.filter(Q(case=source) | Q(linked_cases=source)).distinct():
            attachment.linked_cases.add(new_case)

    log_consultation_activity(
        source,
        "consultation_converted",
        f"Consultation converted into case {new_case.reference}",
        actor=user,
        new_value={"caseId": new_case.id, "reference": new_case.reference, "caseType": target_type},
    )

    try:
        from notifications.services.notification_service import notify_case_converted

        notify_case_converted(source, new_case, target_type)
    except Exception:
        import logging

        logging.getLogger(__name__).exception("notify_case_converted failed")

    return new_case


def execute_follow_up_creation(parent: Case, payload: dict, cabinet, user) -> Case:
    """Create a child consultation linked to parent, inheriting client and legal context."""
    from .validators import validate_consultation_data

    parent_data = parent.case_specific_data or {}
    child_data = dict(payload.get("case_specific_data") or {})
    child_data.setdefault("legalDomain", parent_data.get("legalDomain"))
    if parent_data.get("customLegalDomain") and "customLegalDomain" not in child_data:
        child_data["customLegalDomain"] = parent_data.get("customLegalDomain")
    child_data.setdefault("legalQuestion", parent_data.get("legalQuestion") or parent.description)
    child_data.setdefault("factsContext", parent_data.get("factsContext") or "")
    child_data.setdefault("consultationType", parent_data.get("consultationType") or "REACTIVE")
    child_data.setdefault("outcome", "SCHEDULED")
    child_data = validate_consultation_data(child_data)

    reference, seq = allocate_follow_up_reference(parent)
    title = (payload.get("title") or parent.title or "").strip() or f"Follow-up — {parent.reference}"
    assigned_to_id = payload.get("assigned_to_id") or payload.get("assigned_to") or parent.assigned_to_id
    attorney_ids = payload.get("assigned_attorney_ids") or []

    with transaction.atomic():
        child = Case.objects.create(
            reference=reference,
            title=title,
            client=parent.client,
            assigned_to_id=assigned_to_id,
            description=child_data.get("legalQuestion") or parent.description,
            summary=child_data.get("adviceSummary") or "",
            status=Case.CaseStatus.OPEN,
            case_type=Case.CaseType.CONSULTATION,
            cabinet=cabinet,
            court=parent.court or "N/A",
            category=parent.category,
            case_specific_data=child_data,
            parent_consultation=parent if not parent.parent_consultation_id else parent.parent_consultation,
            follow_up_sequence=seq,
            created_by=user,
        )
        ids = [int(x) for x in attorney_ids if x]
        if assigned_to_id and int(assigned_to_id) not in ids:
            ids.append(int(assigned_to_id))
        if ids:
            child.assigned_attorneys.set(ids)

    parent_data["followUpRequired"] = True
    parent.case_specific_data = parent_data
    parent.save(update_fields=["case_specific_data"])
    log_consultation_activity(
        parent,
        "consultation_follow_up_created",
        f"Follow-up consultation created: {child.reference}",
        actor=user,
        new_value={"followUpId": child.id, "reference": child.reference},
    )
    log_consultation_activity(
        child,
        "consultation_created",
        f"Follow-up consultation {child.reference} created",
        actor=user,
        new_value={"parentId": parent.id, "parentReference": parent.reference},
    )
    return child

