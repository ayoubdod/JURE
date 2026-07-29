from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

MOROCCO_TZ = ZoneInfo("Africa/Casablanca")


def today_in_morocco() -> date:
    from django.utils import timezone

    return timezone.now().astimezone(MOROCCO_TZ).date()


def parse_iso_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        s = value.strip().replace("Z", "").split("T")[0][:10]
        try:
            return date.fromisoformat(s)
        except ValueError:
            return None
    return None
