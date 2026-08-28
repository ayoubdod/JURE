"""Detect overlapping consultations/appointments for assigned attorneys."""
from __future__ import annotations

from django.db.models import Q

from cases.consultation_fields import attorney_display_name, consultation_end, consultation_start
from cases.models import Case


def find_schedule_conflicts(case: Case, attorney_ids: list[int] | None = None) -> list[dict]:
    """Return non-blocking conflict warnings for the given consultation window."""
    data = case.case_specific_data or {}
    start = consultation_start(data)
    end = consultation_end(data)
    if not start or not end:
        return []

    ids = set(attorney_ids or [])
    if case.assigned_to_id:
        ids.add(case.assigned_to_id)
    try:
        ids.update(case.assigned_attorneys.values_list("id", flat=True))
    except Exception:
        pass
    ids.discard(None)
    if not ids:
        return []

    conflicts: list[dict] = []
    qs = (
        Case.objects.filter(cabinet_id=case.cabinet_id, case_type=Case.CaseType.CONSULTATION)
        .exclude(pk=case.pk)
        .filter(Q(assigned_to_id__in=ids) | Q(assigned_attorneys__id__in=ids))
        .select_related("assigned_to")
        .distinct()
    )
    for other in qs:
        other_data = other.case_specific_data or {}
        other_start = consultation_start(other_data)
        other_end = consultation_end(other_data)
        if not other_start or not other_end:
            continue
        if start < other_end and other_start < end:
            attorney = other.assigned_to
            conflicts.append(
                {
                    "attorneyId": attorney.id if attorney else None,
                    "attorneyName": attorney_display_name(attorney),
                    "reference": other.reference,
                    "title": other.title,
                    "start": other_start.isoformat(),
                    "end": other_end.isoformat(),
                    "source": "consultation",
                }
            )

    try:
        from tasks.models import Appointment

        appts = (
            Appointment.objects.filter(
                cabinet_id=case.cabinet_id,
                start_at__lt=end,
                end_at__gt=start,
            )
            .filter(Q(created_by_id__in=ids) | Q(attendees__id__in=ids))
            .select_related("created_by")
            .distinct()
        )
        for appt in appts:
            conflicts.append(
                {
                    "attorneyId": appt.created_by_id,
                    "attorneyName": attorney_display_name(appt.created_by),
                    "reference": "",
                    "title": appt.title,
                    "start": appt.start_at.isoformat() if appt.start_at else None,
                    "end": appt.end_at.isoformat() if appt.end_at else None,
                    "source": "appointment",
                }
            )
    except Exception:
        pass
    return conflicts
