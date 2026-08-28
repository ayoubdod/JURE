"""Helpers for consultation case_specific_data (duration, format, scheduling)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlparse

from django.utils import timezone

from .validators import _parse_datetime

DURATION_PRESET_MINUTES = {
    "15min": 15,
    "30min": 30,
    "1h": 60,
    "2h": 120,
}

CONSULTATION_TYPE_VALUES = {"PREVENTIVE", "REACTIVE"}
CONSULTATION_TYPE_LEGACY = {"INITIAL", "FOLLOW_UP", "URGENT"}
CONSULTATION_OUTCOMES = {"SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"}
CONSULTATION_OUTCOMES_LEGACY = {"CONVERTED_TO_CASE"}


def duration_minutes(data: dict | None) -> int:
    data = data or {}
    raw = data.get("durationMinutes")
    if isinstance(raw, int) and raw > 0:
        return raw
    if isinstance(raw, str) and raw.isdigit() and int(raw) > 0:
        return int(raw)
    preset = data.get("duration")
    if preset in DURATION_PRESET_MINUTES:
        return DURATION_PRESET_MINUTES[preset]
    return 60


def consultation_start(data: dict | None) -> datetime | None:
    data = data or {}
    dt = _parse_datetime(data.get("consultationDate"))
    if not dt:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def consultation_end(data: dict | None) -> datetime | None:
    start = consultation_start(data)
    if not start:
        return None
    return start + timedelta(minutes=duration_minutes(data))


def is_valid_http_url(value: str) -> bool:
    try:
        parsed = urlparse((value or "").strip())
    except ValueError:
        return False
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def attorney_display_name(user) -> str:
    if not user:
        return ""
    name = f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
    return name or getattr(user, "email", "") or ""


def collect_assigned_attorneys(case) -> list:
    seen: dict[int, Any] = {}
    primary = getattr(case, "assigned_to", None)
    if primary and getattr(primary, "id", None):
        seen[primary.id] = primary
    try:
        for user in case.assigned_attorneys.all():
            if user and user.id not in seen:
                seen[user.id] = user
    except Exception:
        pass
    return list(seen.values())
