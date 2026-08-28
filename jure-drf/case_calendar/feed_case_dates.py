# case_calendar/feed_case_dates.py
"""Append case-derived calendar rows (consultation, administrative, litigation)."""
from __future__ import annotations

from datetime import timedelta
from typing import Any, Callable

from django.utils import timezone

from cases.consultation_fields import duration_minutes
from cases.models import Case
from cases.validators import _parse_datetime

from .constants import ST_CASE_DEADLINE, ST_CASE_DUE_DATE, ST_CONSULTATION_DATE
from .feed_helpers import (
    _assigned_to_payload,
    _in_range,
    _iso,
    _related_case_payload,
    _related_client_payload,
)


def append_consultation_dates(
    cabinet,
    events: list[dict[str, Any]],
    start,
    end,
    want: Callable[[str], bool],
) -> None:
    if not cabinet or not want(ST_CONSULTATION_DATE):
        return
    for c in Case.objects.filter(cabinet=cabinet, case_type=Case.CaseType.CONSULTATION).select_related(
        "assigned_to", "client", "parent_consultation"
    ):
        data = c.case_specific_data or {}
        raw = data.get("consultationDate")
        dt = _parse_datetime(raw)
        if not dt:
            continue
        if not timezone.is_aware(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        if start or end:
            if not _in_range(dt, start, end):
                continue
        minutes = duration_minutes(data)
        end_dt = dt + timedelta(minutes=minutes) if minutes else None
        origin = c.parent_consultation or c
        events.append(
            {
                "id": str(c.id),
                "sourceType": ST_CONSULTATION_DATE,
                "sourceId": str(origin.id),
                "title": c.title,
                "date": _iso(dt),
                "endDate": _iso(end_dt) if end_dt else None,
                "label": "Follow-up" if c.parent_consultation_id else "Consultation",
                "priority": None,
                "status": c.status,
                "assignedTo": _assigned_to_payload(c.assigned_to),
                "relatedCase": _related_case_payload(origin),
                "relatedClient": _related_client_payload(c.client) if c.client_id else None,
                "meta": {
                    "caseType": "CONSULTATION",
                    "caseRef": c.reference,
                    "originRef": origin.reference,
                    "format": data.get("format"),
                    "address": data.get("address"),
                    "videoLink": data.get("videoLink"),
                },
            }
        )


def append_administrative_due_dates(
    cabinet,
    events: list[dict[str, Any]],
    start,
    end,
    want: Callable[[str], bool],
) -> None:
    if not cabinet or not want(ST_CASE_DUE_DATE):
        return
    for c in Case.objects.filter(cabinet=cabinet, case_type=Case.CaseType.ADMINISTRATIVE).select_related(
        "assigned_to", "client"
    ):
        data = c.case_specific_data or {}
        raw = data.get("dueDate")
        dt = _parse_datetime(raw)
        if not dt:
            continue
        if not timezone.is_aware(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        if start or end:
            if not _in_range(dt, start, end):
                continue
        prio = data.get("priority")
        events.append(
            {
                "id": str(c.id),
                "sourceType": ST_CASE_DUE_DATE,
                "sourceId": str(c.id),
                "title": c.title,
                "date": _iso(dt),
                "endDate": None,
                "label": "Due Date",
                "priority": str(prio).upper() if prio else None,
                "status": c.status,
                "assignedTo": _assigned_to_payload(c.assigned_to),
                "relatedCase": _related_case_payload(c),
                "relatedClient": _related_client_payload(c.client) if c.client_id else None,
                "meta": {"caseType": "ADMINISTRATIVE", "caseRef": c.reference},
            }
        )


def append_litigation_deadlines(
    cabinet,
    events: list[dict[str, Any]],
    start,
    end,
    want: Callable[[str], bool],
) -> None:
    if not cabinet or not want(ST_CASE_DEADLINE):
        return
    field_labels = [
        ("nextHearingDate", "Next Hearing"),
        ("firstHearingDate", "First Hearing"),
        ("statuteOfLimitationsDate", "Statute of Limitations"),
    ]
    for c in Case.objects.filter(cabinet=cabinet, case_type=Case.CaseType.LITIGATION).select_related(
        "assigned_to", "client"
    ):
        data = c.case_specific_data or {}
        prio = data.get("priority")
        prio_out = str(prio).upper() if prio else None

        for field, default_label in field_labels:
            raw = data.get(field)
            dt = _parse_datetime(raw)
            if not dt:
                continue
            if not timezone.is_aware(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            if start or end:
                if not _in_range(dt, start, end):
                    continue
            eid = f"{c.id}-{field}"
            events.append(
                {
                    "id": eid,
                    "sourceType": ST_CASE_DEADLINE,
                    "sourceId": str(c.id),
                    "title": c.title,
                    "date": _iso(dt),
                    "endDate": None,
                    "label": default_label,
                    "priority": prio_out,
                    "status": c.status,
                    "assignedTo": _assigned_to_payload(c.assigned_to),
                    "relatedCase": _related_case_payload(c),
                    "relatedClient": _related_client_payload(c.client) if c.client_id else None,
                    "meta": {"caseType": "LITIGATION", "caseRef": c.reference},
                }
            )

        kds = data.get("keyDeadlines")
        if isinstance(kds, list):
            for idx, kd in enumerate(kds):
                if not isinstance(kd, dict):
                    continue
                lbl = kd.get("label")
                if not lbl or not str(lbl).strip():
                    continue
                raw_d = kd.get("date")
                dt = _parse_datetime(raw_d)
                if not dt:
                    continue
                if not timezone.is_aware(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                if start or end:
                    if not _in_range(dt, start, end):
                        continue
                eid = f"{c.id}-kd-{idx}"
                events.append(
                    {
                        "id": eid,
                        "sourceType": ST_CASE_DEADLINE,
                        "sourceId": str(c.id),
                        "title": c.title,
                        "date": _iso(dt),
                        "endDate": None,
                        "label": str(lbl).strip(),
                        "priority": prio_out,
                        "status": c.status,
                        "assignedTo": _assigned_to_payload(c.assigned_to),
                        "relatedCase": _related_case_payload(c),
                        "relatedClient": _related_client_payload(c.client) if c.client_id else None,
                        "meta": {"caseType": "LITIGATION", "caseRef": c.reference},
                    }
                )
