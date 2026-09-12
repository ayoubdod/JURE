"""
Chat WebSocket presence tracking.
Tracks which users are connected to ws/chat/ for green-dot indicators,
and records last_seen timestamps when they go offline.
Uses Redis when available, in-memory structures for dev without Redis.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone

# In-memory fallback for dev (single process)
_online_user_ids: set[int] = set()
_last_seen: dict[int, str] = {}


def _get_redis():
    """Return Redis client if available, else None."""
    try:
        import redis

        url = getattr(settings, "REDIS_URL", None) or os.environ.get(
            "REDIS_URL", "redis://127.0.0.1:6379/0"
        )
        r = redis.from_url(url)
        r.ping()  # verify connection
        return r
    except Exception:
        return None


def _iso_now() -> str:
    return timezone.now().astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")


def presence_add(user_id: int) -> list[int]:
    """Add user to online set. Returns current list of online user IDs."""
    r = _get_redis()
    if r:
        try:
            key = "chat:online_users"
            r.sadd(key, str(user_id))
            members = r.smembers(key)
            return [int(m) for m in members]
        except Exception:
            pass
    _online_user_ids.add(user_id)
    return list(_online_user_ids)


def presence_remove(user_id: int) -> list[int]:
    """Remove user from online set. Returns current list of online user IDs."""
    r = _get_redis()
    if r:
        try:
            key = "chat:online_users"
            r.srem(key, str(user_id))
            members = r.smembers(key)
            return [int(m) for m in members]
        except Exception:
            pass
    _online_user_ids.discard(user_id)
    return list(_online_user_ids)


def presence_list() -> list[int]:
    """Return list of currently online user IDs."""
    r = _get_redis()
    if r:
        try:
            key = "chat:online_users"
            members = r.smembers(key)
            return [int(m) for m in members]
        except Exception:
            pass
    return list(_online_user_ids)


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
            if user_ids:
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
    if user_ids:
        return {str(uid): _last_seen[uid] for uid in user_ids if uid in _last_seen}
    return {str(uid): iso for uid, iso in _last_seen.items()}


def presence_mark_offline(user_id: int) -> tuple[list[int], dict[str, str]]:
    """
    Mark user offline, persist last_seen_at, return (online_ids, last_seen_patch).
    """
    online_ids = presence_remove(user_id)
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
