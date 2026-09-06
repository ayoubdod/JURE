from cases.models import Case
from core.utils import get_user_cabinet
from tasks.models import Appointment, Task

from ..models import Message


def _assigned_to_chat_preview(user):
    if user is None:
        return None
    fn = (getattr(user, "first_name", None) or "").strip()
    ln = (getattr(user, "last_name", None) or "").strip()
    name = f"{fn} {ln}".strip() or (getattr(user, "email", None) or str(user.pk))
    return {"id": user.pk, "name": name}


def _case_priority_from_specific(case: Case) -> str | None:
    data = case.case_specific_data or {}
    if case.case_type in (Case.CaseType.LITIGATION, Case.CaseType.ADMINISTRATIVE):
        p = data.get("priority")
        return str(p).upper() if p else None
    return None


def build_shared_item_payload(message: Message) -> tuple[dict | None, str]:
    """Returns (sharedItem dict or None, effective messageType for API)."""
    mt = message.message_type
    if mt == Message.MessageType.TEXT:
        return None, Message.MessageType.TEXT

    if mt == Message.MessageType.SHARED_CASE:
        c = message.shared_case
        if not c:
            return None, Message.MessageType.TEXT
        return {
            "type": "CASE",
            "id": str(c.id),
            "title": c.title,
            "status": c.status,
            "priority": _case_priority_from_specific(c),
            "reference": c.reference,
            "dueDate": None,
            "caseType": c.case_type,
            "assignedTo": _assigned_to_chat_preview(c.assigned_to),
        }, mt

    if mt == Message.MessageType.SHARED_TASK:
        t = message.shared_task
        if not t:
            return None, Message.MessageType.TEXT
        due = t.due_date.isoformat() if t.due_date else None
        primary = t.assigned_to
        if primary is None:
            primary = t.assignees.first()
        return {
            "type": "TASK",
            "id": str(t.id),
            "title": t.title,
            "status": t.status,
            "priority": str(t.priority).upper() if t.priority else None,
            "reference": None,
            "dueDate": due,
            "caseType": None,
            "assignedTo": _assigned_to_chat_preview(primary),
        }, mt

    if mt == Message.MessageType.SHARED_APPOINTMENT:
        a = message.shared_appointment
        if not a:
            return None, Message.MessageType.TEXT
        return {
            "type": "APPOINTMENT",
            "id": str(a.id),
            "title": a.title,
            "status": a.status,
            "priority": None,
            "reference": None,
            "dueDate": a.start_at.isoformat() if a.start_at else None,
            "caseType": None,
            "assignedTo": _assigned_to_chat_preview(a.created_by),
        }, mt

    if mt in Message.call_message_types():
        call = message.shared_call
        if not call:
            return None, Message.MessageType.TEXT
        kind = "video" if str(call.kind).lower() == "video" else "voice"
        if mt in (Message.MessageType.CALL_MISSED_VOICE, Message.MessageType.CALL_MISSED_VIDEO):
            outcome = "missed"
        else:
            outcome = "completed"
        duration_seconds = None
        if call.started_at and call.ended_at:
            duration_seconds = max(0, int((call.ended_at - call.started_at).total_seconds()))
        return {
            "type": "CALL",
            "id": str(call.id),
            "title": message.body or "",
            "status": outcome,
            "priority": None,
            "reference": None,
            "dueDate": None,
            "caseType": None,
            "assignedTo": None,
            "kind": kind,
            "outcome": outcome,
            "durationSeconds": duration_seconds,
            "startedAt": call.started_at.isoformat() if call.started_at else None,
            "endedAt": call.ended_at.isoformat() if call.ended_at else None,
        }, mt

    return None, Message.MessageType.TEXT


def user_can_access_shared_case(user, case: Case) -> bool:
    cab = get_user_cabinet(user)
    return bool(cab and case.cabinet_id == cab.id)


def user_can_access_shared_task(user, task: Task) -> bool:
    cab = get_user_cabinet(user)
    return bool(cab and task.cabinet_id == cab.id)


def user_can_access_shared_appointment(user, appt: Appointment) -> bool:
    cab = get_user_cabinet(user)
    return bool(cab and appt.cabinet_id == cab.id)
