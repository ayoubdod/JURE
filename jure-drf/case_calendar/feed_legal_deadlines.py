"""Append calculated legal deadlines to the unified calendar feed."""
from __future__ import annotations

from datetime import datetime, time
from typing import Any, Callable

from django.utils import timezone

from legal_deadlines.models import CalculatedDeadline

from .constants import ST_CASE_DEADLINE
from .feed_helpers import (
    _assigned_to_payload,
    _in_range,
    _iso,
    _related_case_payload,
    _related_client_payload,
)


def append_legal_deadlines(
    cabinet,
    events: list[dict[str, Any]],
    start,
    end,
    want: Callable[[str], bool],
) -> None:
    if not want(ST_CASE_DEADLINE) or cabinet is None:
        return

    qs = (
        CalculatedDeadline.objects.filter(cabinet=cabinet)
        .exclude(status=CalculatedDeadline.Status.CANCELLED)
        .select_related("case", "case__client", "case__assigned_to", "rule")
    )

    tz = timezone.get_current_timezone()
    for item in qs:
        dt = timezone.make_aware(datetime.combine(item.final_deadline, time.min), tz)
        if start or end:
            if not _in_range(dt, start, end):
                continue

        case = item.case
        label = item.rule.name if item.rule_id else "Legal deadline"
        if item.is_manual_override:
            label = f"{label} (manually verified)"

        events.append(
            {
                "id": f"legal-deadline-{item.id}",
                "sourceType": ST_CASE_DEADLINE,
                "sourceId": str(case.id) if case else str(item.id),
                "title": case.title if case else label,
                "date": _iso(dt),
                "endDate": None,
                "label": label,
                "priority": "HIGH",
                "status": item.status,
                "assignedTo": _assigned_to_payload(getattr(case, "assigned_to", None)),
                "relatedCase": _related_case_payload(case),
                "relatedClient": _related_client_payload(getattr(case, "client", None))
                if case and case.client_id
                else None,
                "meta": {
                    "legalDeadlineId": item.id,
                    "isManualOverride": item.is_manual_override,
                    "ruleVersion": (item.rule_snapshot or {}).get("version"),
                    "caseRef": getattr(case, "reference", None),
                },
            }
        )
