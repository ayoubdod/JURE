"""Single concurrent session helpers for JWT auth."""

from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F

logger = logging.getLogger(__name__)
User = get_user_model()


def rotate_user_session(user) -> int:
    """
    Invalidate every previous JWT session for this user and return the new
    session_version that must be embedded in the freshly issued tokens.
    """
    with transaction.atomic():
        User.objects.filter(pk=user.pk).update(session_version=F("session_version") + 1)
        user.refresh_from_db(fields=["session_version"])
        _blacklist_outstanding_refresh_tokens(user)
    _kick_user_websockets(user.id)
    return int(user.session_version)


def _blacklist_outstanding_refresh_tokens(user) -> None:
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )
    except Exception:
        logger.debug("token_blacklist unavailable; skipping refresh blacklist")
        return

    for outstanding in OutstandingToken.objects.filter(user_id=user.pk):
        BlacklistedToken.objects.get_or_create(token=outstanding)


def _kick_user_websockets(user_id: int) -> None:
    """Close open Channels sockets belonging to the previous session."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    payload = {
        "type": "session.replaced",
        "payload": {"code": "session_replaced"},
    }
    for group in (f"user_{user_id}", f"user-{user_id}"):
        try:
            async_to_sync(channel_layer.group_send)(group, payload)
        except Exception:
            logger.exception("Failed to notify group %s of session replacement", group)


def session_version_matches(user, validated_token) -> bool:
    token_sv = validated_token.get("sv")
    if token_sv is None:
        # Legacy tokens issued before session_version existed — reject so the
        # user must re-authenticate under the single-session policy.
        return False
    try:
        return int(token_sv) == int(getattr(user, "session_version", 0) or 0)
    except (TypeError, ValueError):
        return False
