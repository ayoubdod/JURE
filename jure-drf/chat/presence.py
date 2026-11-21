"""
Chat WebSocket presence tracking.
Tracks which users are connected to ws/chat/ for green-dot indicators,
and records last_seen timestamps when they go offline.
Online sets are cabinet-scoped so presence never leaks across firms.
Uses Redis when available, in-memory structures for dev without Redis.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone

# In-memory fallback for dev (single process): cabinet_id -> set of user ids
_online_user_ids: dict[int, set[int]] = {}
_last_seen: dict[int, str] = {}

# Cache Redis probe so a dead Redis URL cannot hang every presence call.
_redis_client = None
_redis_checked = False


def _cabinet_key(cabinet_id: int | None) -> int:
    return int(cabinet_id or 0)


def _online_redis_key(cabinet_id: int | None) -> str:
    return f"chat:online_users:{_cabinet_key(cabinet_id)}"


def _get_redis():
    """Return Redis client if available, else None. Fail fast on bad Redis."""
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    try:
        import redis

        url = getattr(settings, "REDIS_URL", None) or os.environ.get(
            "REDIS_URL", "redis://127.0.0.1:6379/0"
        )
        r = redis.from_url(
            url,
            socket_connect_timeout=0.4,
            socket_timeout=0.4,
            retry_on_timeout=False,
        )
        r.ping()
        _redis_client = r
    except Exception:
        _redis_client = None
    return _redis_client


def _iso_now() -> str:
    return timezone.now().astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")


def presence_add(user_id: int, cabinet_id: int | None) -> list[int]:
    """Add user to the cabinet online set. Returns current online user IDs."""
    cid = _cabinet_key(cabinet_id)
    r = _get_redis()
    if r:
        try:
            key = _online_redis_key(cid)
            r.sadd(key, str(user_id))
            members = r.smembers(key)
            return [int(m) for m in members]
        except Exception:
            pass
    bucket = _online_user_ids.setdefault(cid, set())
    bucket.add(user_id)
    return list(bucket)


def presence_remove(user_id: int, cabinet_id: int | None) -> list[int]:
    """Remove user from the cabinet online set. Returns current online user IDs."""
    cid = _cabinet_key(cabinet_id)
    r = _get_redis()
    if r:
        try:
            key = _online_redis_key(cid)
            r.srem(key, str(user_id))
            members = r.smembers(key)
            return [int(m) for m in members]
        except Exception:
            pass
    bucket = _online_user_ids.setdefault(cid, set())
    bucket.discard(user_id)
    return list(bucket)


def presence_list(cabinet_id: int | None) -> list[int]:
    """Return list of currently online user IDs for this cabinet."""
    cid = _cabinet_key(cabinet_id)
    r = _get_redis()
    if r:
        try:
            members = r.smembers(_online_redis_key(cid))
            return [int(m) for m in members]
        except Exception:
            pass
    return list(_online_user_ids.get(cid, set()))


def _store_last_seen(user_id: int, iso: str) -> None:
    r = _get_redis()
    if r:
        try:
            r.hset("chat:last_seen", str(user_id), iso)
            return
        except Exception:
            pass
    _last_seen[user_id] = iso


def presence_last_seen_map(user_ids: list[int] | None = None) -> dict[str, str]:
    """Return {user_id_str: iso} for known last-seen times."""
    r = _get_redis()
    if r:
        try:
            if user_ids is not None:
                if not user_ids:
                    return {}
                values = r.hmget("chat:last_seen", *[str(uid) for uid in user_ids])
                out: dict[str, str] = {}
                for uid, raw in zip(user_ids, values):
                    if raw:
                        out[str(uid)] = raw.decode() if isinstance(raw, bytes) else str(raw)
                return out
            raw_map = r.hgetall("chat:last_seen")
            out = {}
            for k, v in raw_map.items():
                key = k.decode() if isinstance(k, bytes) else str(k)
                val = v.decode() if isinstance(v, bytes) else str(v)
                out[key] = val
            return out
        except Exception:
            pass
    if user_ids is not None:
        return {str(uid): _last_seen[uid] for uid in user_ids if uid in _last_seen}
    return {str(uid): iso for uid, iso in _last_seen.items()}


def presence_mark_offline(
    user_id: int, cabinet_id: int | None
) -> tuple[list[int], dict[str, str]]:
    """
    Mark user offline, persist last_seen_at, return (online_ids, last_seen_patch).
    """
    online_ids = presence_remove(user_id, cabinet_id)
    iso = _iso_now()
    _store_last_seen(user_id, iso)

    try:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        User.objects.filter(pk=user_id).update(last_seen_at=timezone.now())
    except Exception:
        pass

    return online_ids, {str(user_id): iso}


def presence_seed_from_db(user_ids: list[int]) -> dict[str, str]:
    """Load last_seen_at from DB for the given users into Redis/memory and return map."""
    if not user_ids:
        return {}
    try:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        rows = User.objects.filter(pk__in=user_ids, last_seen_at__isnull=False).values_list(
            "id", "last_seen_at"
        )
        out: dict[str, str] = {}
        for uid, dt in rows:
            if not isinstance(dt, datetime):
                continue
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            iso = dt.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")
            _store_last_seen(uid, iso)
            out[str(uid)] = iso
        return out
    except Exception:
        return presence_last_seen_map(user_ids)
