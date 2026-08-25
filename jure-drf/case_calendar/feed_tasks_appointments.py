# case_calendar/feed_tasks_appointments.py
"""Append task and appointment rows to the unified calendar event list."""
from __future__ import annotations

from datetime import datetime, time
from typing import Any, Callable

from django.utils import timezone

from tasks.models import Appointment, Task

from .constants import ST_APPOINTMENT, ST_TASK
from .feed_helpers import (
    _assigned_to_payload,
    _est_hours_to_float,
    _format_appt_duration,
    _in_range,
    _iso,
    _related_case_payload,
    _related_client_payload,
    _task_priority_api,
)


def append_task_events(
    cabinet,
    events: list[dict[str, Any]],
    start,
    end,
    want: Callable[[str], bool],
) -> None:
    if not want(ST_TASK) or not cabinet:
        return
    tq = (
        Task.objects.filter(cabinet=cabinet)
        .select_related("assigned_to", "case", "client")
        .prefetch_related("assignees")
    )
    tq = tq.filter(due_date__isnull=False)
    if start:
        tq = tq.filter(due_date__gte=start.date())
    if end:
        tq = tq.filter(due_date__lte=end.date())
    for t in tq:
        d = t.due_date
        task_dt = timezone.make_aware(datetime.combine(d, time.min), timezone.get_current_timezone())
        if start or end:
            if not _in_range(task_dt, start, end):
                continue
        assignees = list(t.assignees.all())
        primary = assignees[0] if assignees else t.assigned_to
        meta: dict[str, Any] = {
            "estimatedHours": _est_hours_to_float(t.estimated_hours),
            "assignees": [_assigned_to_payload(u) for u in assignees],
        }
        events.append(
            {
                "id": str(t.id),
                "sourceType": ST_TASK,
                "sourceId": str(t.id),
                "title": t.title,
                "date": _iso(task_dt),
                "endDate": None,
                "label": "Task",
                "priority": _task_priority_api(t.priority),
                "status": t.status,
                "assignedTo": _assigned_to_payload(primary),
                "relatedCase": _related_case_payload(t.case) if t.case_id else None,
                "relatedClient": _related_client_payload(t.client) if t.client_id else None,
                "meta": meta,
            }
        )


def append_appointment_events(
    cabinet,
    events: list[dict[str, Any]],
    start,
    end,
    want: Callable[[str], bool],
) -> None:
    if not want(ST_APPOINTMENT) or not cabinet:
        return
    aq = Appointment.objects.filter(cabinet=cabinet).select_related(
        "created_by", "case", "client", "conversation"
    )
    if start:
        aq = aq.filter(end_at__gte=start)
    if end:
        aq = aq.filter(start_at__lte=end)
    for a in aq:
        conv_title = None
        if a.conversation_id:
            conv_title = (a.conversation.title or "").strip() or f"Conversation #{a.conversation_id}"
        meta: dict[str, Any] = {
            "location": a.location or None,
            "duration": _format_appt_duration(a.start_at, a.end_at),
            "meetingType": a.meeting_type,
            "conversationId": a.conversation_id,
            "conversationTitle": conv_title,
        }
        events.append(
            {
                "id": str(a.id),
                "sourceType": ST_APPOINTMENT,
                "sourceId": str(a.id),
                "title": a.title,
                "date": _iso(a.start_at),
                "endDate": _iso(a.end_at),
                "label": "Appointment",
                "priority": None,
                "status": a.status,
                "assignedTo": _assigned_to_payload(a.created_by),
                "relatedCase": _related_case_payload(a.case) if a.case_id else None,
                "relatedClient": _related_client_payload(a.client) if a.client_id else None,
                "meta": meta,
            }
        )
