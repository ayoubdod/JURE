"""
Case utilities: reference generation, conversion helpers.
"""
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Tuple

from django.db.models import Count, F

from .models import Case

CONVERTED_TO_CASE = "CONVERTED_TO_CASE"


def is_consultation_ready_to_convert(case: "Case") -> Tuple[bool, list[str]]:
    """
    Check if a CONSULTATION case is ready for conversion to LITIGATION/ADMINISTRATIVE.
    Accepts legacy storage: Case.status, case_specific_data.outcome, case_specific_data.status.

    Returns:
        (ready: bool, fields_checked: list[str])
        fields_checked lists which fields were examined (for debug error messages).
    """
    if case.case_type != Case.CaseType.CONSULTATION:
        return False, []

    fields_checked = []
    data = case.case_specific_data or {}

    fields_checked.append("status")
    fields_checked.append("case_specific_data.outcome")
    outcome_val = (data.get("outcome") or data.get("Outcome") or data.get("status") or data.get("Status") or "")
    if case.status == Case.CaseStatus.CANCELLED or str(outcome_val).upper() == "CANCELLED":
        return False, fields_checked

    # Conversion is a separate relationship from consultation status.
    return True, fields_checked


def generate_unique_reference(max_attempts: int = 5) -> str:
    """
    Generate a unique case reference using the same logic as CaseSerializer.
    Checks uniqueness; retries with more entropy if collision occurs.
    """
    for _ in range(max_attempts):
        ref = str(uuid.uuid4())[:8].upper()
        if not Case.objects.filter(reference=ref).exists():
            return ref
    # Fallback: append more entropy
    return str(uuid.uuid4())[:12].upper()


def batch_counts_tasks_appointments(case_ids: list[int]) -> dict[int, dict[str, int]]:
    """
    Per-case counts of tasks and appointments where Task.case / Appointment.case
    matches the case id. Used for GET case list; failures yield zeros.
    """
    out: dict[int, dict[str, int]] = {cid: {"tasks": 0, "appointments": 0} for cid in case_ids}
    if not case_ids:
        return out
    try:
        from tasks.models import Task

        for row in Task.objects.filter(case_id__in=case_ids).values("case_id").annotate(c=Count("id")):
            cid = row["case_id"]
            if cid is not None:
                out[cid]["tasks"] = row["c"]
    except Exception:
        pass
    try:
        from tasks.models import Appointment

        for row in Appointment.objects.filter(case_id__in=case_ids).values("case_id").annotate(c=Count("id")):
            cid = row["case_id"]
            if cid is not None:
                out[cid]["appointments"] = row["c"]
    except Exception:
        pass
    return out


def _user_display_name(user) -> str | None:
    if not user:
        return None
    fn = getattr(user, "first_name", "") or ""
    ln = getattr(user, "last_name", "") or ""
    name = f"{fn} {ln}".strip()
    return name or None


def _assigned_to_payload(user) -> dict[str, Any] | None:
    if not user:
        return None
    return {
        "_id": user.id,
        "firstName": getattr(user, "first_name", "") or "",
        "lastName": getattr(user, "last_name", "") or "",
    }


def _related_client_payload(user) -> dict[str, Any] | None:
    if not user:
        return None
    return {"_id": user.id, "name": _user_display_name(user)}


def related_task_dict(task) -> dict[str, Any]:
    return {
        "_id": task.id,
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "dueDate": task.due_date.isoformat() if task.due_date else None,
        "assignedTo": _assigned_to_payload(task.assigned_to),
        "estimatedHours": float(task.estimated_hours) if task.estimated_hours is not None else None,
        "relatedClient": _related_client_payload(task.client) if task.client_id else None,
        "createdAt": task.created.isoformat() if getattr(task, "created", None) else None,
    }


def related_appointment_dict(appt) -> dict[str, Any]:
    duration: int | None = None
    if appt.start_at and appt.end_at:
        try:
            duration = int((appt.end_at - appt.start_at).total_seconds() / 60)
        except Exception:
            duration = None
    return {
        "_id": appt.id,
        "title": appt.title,
        "status": appt.status,
        "date": appt.start_at.isoformat() if appt.start_at else None,
        "endDate": appt.end_at.isoformat() if appt.end_at else None,
        "duration": duration,
        "location": appt.location or "",
        "relatedClient": _related_client_payload(appt.client) if appt.client_id else None,
        "assignedTo": _assigned_to_payload(appt.created_by),
        "createdAt": appt.created.isoformat() if getattr(appt, "created", None) else None,
    }


def fetch_case_related_payload(case: Case) -> dict[str, list]:
    """
    Tasks and appointments for case detail: two ORM queries in parallel,
    sorted by due date / start time ascending.
    """
    from tasks.models import Appointment, Task

    case_id = case.id
    cabinet_id = case.cabinet_id

    def load_tasks() -> list:
        try:
            qs = (
                Task.objects.filter(case_id=case_id, cabinet_id=cabinet_id)
                .select_related("assigned_to", "client")
                .order_by(F("due_date").asc(nulls_last=True))
            )
            return [related_task_dict(t) for t in qs]
        except Exception:
            return []

    def load_appointments() -> list:
        try:
            qs = (
                Appointment.objects.filter(case_id=case_id, cabinet_id=cabinet_id)
                .select_related("created_by", "client")
                .order_by("start_at")
            )
            return [related_appointment_dict(a) for a in qs]
        except Exception:
            return []

    with ThreadPoolExecutor(max_workers=2) as ex:
        fut_tasks = ex.submit(load_tasks)
        fut_appts = ex.submit(load_appointments)
        tasks = fut_tasks.result()
        appointments = fut_appts.result()

    return {"tasks": tasks, "appointments": appointments}
