# case_calendar/feed_helpers.py
"""Pure helpers for building unified calendar event payloads (dates, users, sorting)."""
from __future__ import annotations

from datetime import datetime, time
from typing import TYPE_CHECKING, Any

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

if TYPE_CHECKING:
    from cases.models import Case


def _safe_user_name(user) -> str | None:
    if user is None:
        return None
    try:
        fn = (getattr(user, "first_name", None) or "").strip()
        ln = (getattr(user, "last_name", None) or "").strip()
        full = f"{fn} {ln}".strip()
        if full:
            return full
        em = getattr(user, "email", None)
        if em:
            return str(em).strip()
        return str(getattr(user, "pk", user))
    except Exception:
        return None


def _assigned_to_payload(user) -> dict | None:
    if user is None:
        return None
    try:
        uid = getattr(user, "pk", None)
        if uid is None:
            return None
        name = _safe_user_name(user)
        return {"id": uid, "name": name}
    except Exception:
        return None


def _related_client_payload(user) -> dict | None:
    if user is None:
        return None
    try:
        uid = getattr(user, "pk", None)
        if uid is None:
            return None
        name = _safe_user_name(user)
        return {"id": uid, "name": name}
    except Exception:
        return None


def _related_case_payload(case: Case | None) -> dict | None:
    if case is None:
        return None
    try:
        return {
            "id": case.id,
            "reference": case.reference,
            "title": case.title,
            "caseType": case.case_type,
        }
    except Exception:
        return None


def _task_priority_api(priority: str | None) -> str | None:
    if not priority:
        return None
    try:
        return str(priority).upper()
    except Exception:
        return None


def _range_bounds(date_from_str: str | None, date_to_str: str | None) -> tuple[datetime | None, datetime | None]:
    tz = timezone.get_current_timezone()

    def _start(s: str) -> datetime | None:
        s = (s or "").strip()
        if not s:
            return None
        d = parse_date(s[:10]) if len(s) >= 10 else None
        if d:
            return timezone.make_aware(datetime.combine(d, time.min), tz)
        dt = parse_datetime(s)
        if not dt:
            return None
        return dt if timezone.is_aware(dt) else timezone.make_aware(dt, tz)

    def _end(s: str) -> datetime | None:
        s = (s or "").strip()
        if not s:
            return None
        d = parse_date(s[:10]) if len(s) >= 10 else None
        if d:
            return timezone.make_aware(datetime.combine(d, time.max), tz)
        dt = parse_datetime(s)
        if not dt:
            return None
        return dt if timezone.is_aware(dt) else timezone.make_aware(dt, tz)

    return _start(date_from_str) if date_from_str else None, _end(date_to_str) if date_to_str else None


def _in_range(dt: datetime | None, start: datetime | None, end: datetime | None) -> bool:
    if dt is None:
        return False
    if not timezone.is_aware(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    if start and dt < start:
        return False
    if end and dt > end:
        return False
    return True


def _format_appt_duration(start: datetime, end: datetime) -> str | None:
    try:
        delta = end - start
        if delta.total_seconds() < 0:
            return None
        total = int(delta.total_seconds())
        hours, rem = divmod(total, 3600)
        minutes, _ = divmod(rem, 60)
        parts: list[str] = []
        if hours:
            parts.append(f"{hours}h")
        if minutes:
            parts.append(f"{minutes}m")
        if not parts:
            parts.append(f"{total}s")
        return " ".join(parts)
    except Exception:
        return None


def _est_hours_to_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except Exception:
        return None


def _iso(dt: datetime) -> str:
    if not timezone.is_aware(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt.isoformat()


def _sort_key_from_iso(iso_str: str) -> datetime:
    s = (iso_str or "").replace("Z", "+00:00")
    dt = parse_datetime(s)
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.get_current_timezone())
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt
