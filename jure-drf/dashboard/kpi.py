"""
Month-over-month KPI helpers for the cabinet dashboard.

All counts are expected to be pre-filtered to the authenticated user's cabinet.
"""
from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time
from typing import Any, Optional, TypedDict

from dateutil.relativedelta import relativedelta
from django.utils import timezone


class GrowthResult(TypedDict):
    current: int
    previous: int
    growth: Optional[float]
    change: Optional[str]
    change_state: str  # up | down | flat | no_previous_data


def month_bounds(reference: Optional[datetime] = None) -> tuple[datetime, datetime, datetime]:
    """
    Return timezone-aware (prev_month_start, current_month_start, next_month_start).
    """
    now = reference or timezone.now()
    if timezone.is_naive(now):
        now = timezone.make_aware(now, timezone.get_current_timezone())

    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month_start = current_month_start + relativedelta(months=1)
    prev_month_start = current_month_start - relativedelta(months=1)
    return prev_month_start, current_month_start, next_month_start


def month_date_bounds(reference: Optional[date] = None) -> tuple[date, date, date]:
    """Return (prev_month_start, current_month_start, next_month_start) as dates."""
    today = reference or timezone.localdate()
    current_month_start = today.replace(day=1)
    next_month_start = current_month_start + relativedelta(months=1)
    prev_month_start = current_month_start - relativedelta(months=1)
    return prev_month_start, current_month_start, next_month_start


def calculate_growth(current: int, previous: int) -> GrowthResult:
    """
    ((current - previous) / previous) * 100, rounded to nearest integer.

    When previous == 0, growth is None and change_state is no_previous_data
    (covers both empty history and first-period growth without inventing a %).
    """
    current = int(current)
    previous = int(previous)

    if previous == 0:
        return {
            "current": current,
            "previous": previous,
            "growth": None,
            "change": None,
            "change_state": "no_previous_data",
        }

    raw = ((current - previous) / previous) * 100
    growth = int(round(raw))

    if growth > 0:
        change = f"+{growth}%"
        state = "up"
    elif growth < 0:
        change = f"{growth}%"
        state = "down"
    else:
        change = "0%"
        state = "flat"

    return {
        "current": current,
        "previous": previous,
        "growth": float(growth),
        "change": change,
        "change_state": state,
    }


def build_stat(
    *,
    title: str,
    icon: str,
    color: str,
    current: int,
    previous: int,
) -> dict[str, Any]:
    growth = calculate_growth(current, previous)
    return {
        "title": title,
        "value": str(growth["current"]),
        "change": growth["change"],
        "change_state": growth["change_state"],
        "icon": icon,
        "color": color,
        "current": growth["current"],
        "previous": growth["previous"],
        "growth": growth["growth"],
    }


def last_day_of_month(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])


def as_month_start_datetime(d: date) -> datetime:
    dt = datetime.combine(d, time.min)
    return timezone.make_aware(dt, timezone.get_current_timezone())
