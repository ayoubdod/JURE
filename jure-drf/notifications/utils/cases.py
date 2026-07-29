"""Helpers for case assignment (lead + co-counsel from case_specific_data)."""

from __future__ import annotations

from typing import Iterable

from django.contrib.auth import get_user_model

User = get_user_model()


def co_counsel_id_set(case_specific_data: dict | None) -> set[int]:
    raw = (case_specific_data or {}).get("coCounsel") or (case_specific_data or {}).get("co_counsel") or []
    ids: set[int] = set()
    if not isinstance(raw, list):
        return ids
    for item in raw:
        if isinstance(item, int):
            ids.add(item)
        elif isinstance(item, dict):
            uid = item.get("id") or item.get("userId") or item.get("user_id")
            if uid is not None:
                try:
                    ids.add(int(uid))
                except (TypeError, ValueError):
                    pass
    return ids


def co_counsel_user_ids(case) -> list[int]:
    return sorted(co_counsel_id_set(case.case_specific_data))


def case_assigned_user_ids(case) -> list[int]:
    ids: list[int] = []
    if case.assigned_to_id:
        ids.append(case.assigned_to_id)
    ids.extend(co_counsel_user_ids(case))
    seen = set()
    out: list[int] = []
    for i in ids:
        if i and i not in seen:
            seen.add(i)
            out.append(i)
    return out


def case_assigned_users_qs(case):
    ids = case_assigned_user_ids(case)
    if not ids:
        return User.objects.none()
    return User.objects.filter(pk__in=ids)


def key_deadline_dates(case) -> Iterable[tuple[object, date]]:
    """Yield (raw entry, parsed date) for litigation keyDeadlines."""
    from notifications.utils.dates import parse_iso_date

    data = case.case_specific_data or {}
    raw = data.get("keyDeadlines") or []
    if not isinstance(raw, list):
        return
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        dval = entry.get("date") or entry.get("Date")
        pd = parse_iso_date(dval)
        if pd:
            yield (entry, pd)
