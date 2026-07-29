# case_calendar/services.py
"""Build the unified calendar event list for a cabinet (tasks, appointments, case dates)."""
from __future__ import annotations

from typing import Any

from .constants import TYPE_MAP
from .feed_case_dates import (
    append_administrative_due_dates,
    append_consultation_dates,
    append_litigation_deadlines,
)
from .feed_helpers import _range_bounds, _sort_key_from_iso
from .feed_tasks_appointments import append_appointment_events, append_task_events


def fetch_unified_calendar_events(
    user,
    date_from: str | None,
    date_to: str | None,
    types_raw: str | None,
) -> list[dict[str, Any]]:
    """
    Aggregate tasks, appointments, and case-derived dates for the user's cabinet.

    Args:
        user: Authenticated user (cabinet from owned or member cabinet).
        date_from: Query param dateFrom.
        date_to: Query param dateTo.
        types_raw: Comma-separated types= filter tokens.

    Returns:
        Sorted list of event dicts (same shape as the GET /calendar/events/ response body).
    """
    cabinet = user.get_owned_cabinet_or_none() or user.cabinet

    start, end = _range_bounds(date_from, date_to)

    allowed_types: set[str] | None = None
    if types_raw:
        allowed_types = set()
        for token in types_raw.split(","):
            t = token.strip().lower()
            if t in TYPE_MAP:
                allowed_types.add(TYPE_MAP[t])
        if not allowed_types:
            allowed_types = None

    events: list[dict[str, Any]] = []

    def want(st: str) -> bool:
        if allowed_types is None:
            return True
        return st in allowed_types

    append_task_events(cabinet, events, start, end, want)
    append_appointment_events(cabinet, events, start, end, want)
    append_consultation_dates(cabinet, events, start, end, want)
    append_administrative_due_dates(cabinet, events, start, end, want)
    append_litigation_deadlines(cabinet, events, start, end, want)

    events.sort(key=lambda e: _sort_key_from_iso(e["date"]))
    return events
