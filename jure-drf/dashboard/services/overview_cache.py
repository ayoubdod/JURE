"""
P3.5 — short-lived dashboard overview cache.

Uses Redis when available (same REDIS_URL as Channels/presence); otherwise an
in-process dict. Failures never break the overview — they skip cache.

Invalidation is cabinet-scoped (delete pattern) plus a short TTL safety net.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

_redis_client = None
_redis_checked = False
_memory: dict[str, tuple[float, str]] = {}
_memory_lock = threading.Lock()

CACHE_VERSION = "v1"


def overview_cache_ttl() -> int:
    """Seconds; 0 disables caching."""
    try:
        return max(0, int(getattr(settings, "DASHBOARD_OVERVIEW_CACHE_TTL", 30)))
    except (TypeError, ValueError):
        return 30


def _get_redis():
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


def make_overview_cache_key(*, cabinet_id: int, user_id: int, scope: str, juria_enabled: bool) -> str:
    day = timezone.localdate().isoformat()
    juria = "1" if juria_enabled else "0"
    return f"dashboard:overview:{CACHE_VERSION}:{cabinet_id}:{user_id}:{scope}:{juria}:{day}"


def _cabinet_pattern(cabinet_id: int) -> str:
    return f"dashboard:overview:{CACHE_VERSION}:{cabinet_id}:*"


def get_cached_overview(key: str) -> dict[str, Any] | None:
    ttl = overview_cache_ttl()
    if ttl <= 0:
        return None
    r = _get_redis()
    try:
        if r:
            raw = r.get(key)
            if not raw:
                return None
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            data = json.loads(raw)
            if isinstance(data, dict):
                data.setdefault("meta", {})
                if isinstance(data["meta"], dict):
                    data["meta"]["cache"] = "hit"
                return data
            return None
        now = time.monotonic()
        with _memory_lock:
            row = _memory.get(key)
            if not row:
                return None
            expires, raw = row
            if expires < now:
                _memory.pop(key, None)
                return None
            data = json.loads(raw)
            if isinstance(data, dict):
                data.setdefault("meta", {})
                if isinstance(data["meta"], dict):
                    data["meta"]["cache"] = "hit"
                return data
    except Exception as exc:
        logger.debug("overview cache get failed: %s", exc)
    return None


def set_cached_overview(key: str, payload: dict[str, Any]) -> None:
    ttl = overview_cache_ttl()
    if ttl <= 0:
        return
    try:
        # Do not persist per-response cache marker
        to_store = dict(payload)
        meta = dict(to_store.get("meta") or {})
        meta.pop("cache", None)
        to_store["meta"] = meta
        raw = json.dumps(to_store, default=str)
        r = _get_redis()
        if r:
            r.setex(key, ttl, raw)
            return
        with _memory_lock:
            _memory[key] = (time.monotonic() + ttl, raw)
            # Bound memory map size
            if len(_memory) > 500:
                cutoff = time.monotonic()
                dead = [k for k, (exp, _) in _memory.items() if exp < cutoff]
                for k in dead[:100]:
                    _memory.pop(k, None)
    except Exception as exc:
        logger.debug("overview cache set failed: %s", exc)


def invalidate_cabinet_overview(cabinet_id: int | None) -> None:
    if cabinet_id is None:
        return
    pattern = _cabinet_pattern(int(cabinet_id))
    try:
        r = _get_redis()
        if r:
            # SCAN+DELETE — safe for small key counts; TTL is the safety net.
            cursor = 0
            while True:
                cursor, keys = r.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    r.delete(*keys)
                if cursor == 0:
                    break
            return
        prefix = f"dashboard:overview:{CACHE_VERSION}:{int(cabinet_id)}:"
        with _memory_lock:
            for k in list(_memory.keys()):
                if k.startswith(prefix):
                    _memory.pop(k, None)
    except Exception as exc:
        logger.debug("overview cache invalidate failed: %s", exc)


def reset_overview_cache_client_for_tests() -> None:
    """Test helper: drop redis probe + memory map."""
    global _redis_client, _redis_checked
    _redis_client = None
    _redis_checked = False
    with _memory_lock:
        _memory.clear()
