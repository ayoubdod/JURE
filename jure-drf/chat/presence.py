"""
Chat WebSocket presence tracking.
Tracks which users are connected to ws/chat/ for green-dot indicators.
Uses Redis when available, in-memory set for dev without Redis.
"""

import os
from django.conf import settings

# In-memory fallback for dev (single process)
_online_user_ids: set[int] = set()


def _get_redis():
    """Return Redis client if available, else None."""
    try:
        import redis
        url = getattr(settings, "REDIS_URL", None) or os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
        r = redis.from_url(url)
        r.ping()  # verify connection
        return r
    except Exception:
        return None


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
