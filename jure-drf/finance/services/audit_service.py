"""Finance audit trail via existing dashboard.ActivityLog (+ optional metadata)."""

from __future__ import annotations

import json
from typing import Any


def _user_label(user) -> str:
    if user is None:
        return 'system'
    name = f'{getattr(user, "first_name", "")} {getattr(user, "last_name", "")}'.strip()
    return name or getattr(user, 'email', None) or f'user#{getattr(user, "pk", "?")}'


def _clip(text: str, n: int = 255) -> str:
    text = text or ''
    return text if len(text) <= n else text[: n - 1] + '…'


def _jsonable(value: Any) -> Any:
    if value is None:
        return None
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def log_finance_action(
    *,
    cabinet,
    kind: str,
    message: str,
    user=None,
    entity_type: str = '',
    entity_id: str | int | None = None,
    previous_value: Any = None,
    new_value: Any = None,
) -> None:
    """
    Persist an auditable finance event.

    Uses dashboard.ActivityLog (existing stream). Optional metadata fields are
    written when the model supports them (after migration).
    """
    if cabinet is None:
        return
    try:
        from dashboard.models import ActivityLog
    except Exception:
        return

    payload = {
        'cabinet': cabinet,
        'kind': kind[:50],
        'message': _clip(f'{_user_label(user)} — {message}'),
    }
    field_names = {f.name for f in ActivityLog._meta.get_fields()}
    if 'actor' in field_names and user is not None:
        payload['actor'] = user
    if 'entity_type' in field_names:
        payload['entity_type'] = (entity_type or '')[:64]
    if 'entity_id' in field_names and entity_id is not None:
        payload['entity_id'] = str(entity_id)[:64]
    if 'previous_value' in field_names:
        payload['previous_value'] = _jsonable(previous_value)
    if 'new_value' in field_names:
        payload['new_value'] = _jsonable(new_value)

    try:
        ActivityLog.objects.create(**payload)
    except Exception:
        # Never break financial mutations because of audit write failures.
        return
