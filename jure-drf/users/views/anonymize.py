"""Right-to-erasure / anonymization endpoints."""

from __future__ import annotations

import logging
import uuid

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cabinets.permissions import can_manage_roles
from core.utils import get_user_cabinet
from dashboard.models import ActivityLog
from users.models import PasswordSetupToken, User, UserAddress
from users.session import rotate_user_session
from users.views.helpers import _user_shares_cabinet

logger = logging.getLogger(__name__)

_FILE_FIELDS = ("image", "national_id", "bar_attestation", "professional_card")


def _tombstone_email(user_id: int) -> str:
    return f"anonymized-{user_id}-{uuid.uuid4().hex[:12]}@deleted.local"


def _tombstone_phone() -> str:
    # Syntactically valid Moroccan mobile (6xxxxxxxx); uuid digits avoid collisions.
    hex_digits = uuid.uuid4().hex
    digits = "6" + "".join(str(int(c, 16) % 10) for c in hex_digits[:8])
    return f"+212{digits}"


def _clear_file_field(user: User, field_name: str) -> None:
    field = getattr(user, field_name, None)
    if not field:
        return
    try:
        field.delete(save=False)
    except Exception:
        logger.exception("Failed deleting %s for user %s", field_name, user.pk)
    setattr(user, field_name, None)


def anonymize_user(*, target: User, actor: User, cabinet) -> User:
    """
    Irreversibly scrub PII while keeping the row (and PROTECT invoice FKs).
    Must be called inside a transaction; logs ActivityLog in the same transaction.
    """
    old_email = target.email
    for name in _FILE_FIELDS:
        _clear_file_field(target, name)

    PasswordSetupToken.objects.filter(user=target).delete()
    UserAddress.objects.filter(user=target).delete()

    profile = getattr(target, "firm_client_profile", None)
    if profile is not None:
        profile.ice = None
        profile.if_number = None
        profile.save(update_fields=["ice", "if_number"])

    target.first_name = "Anonymized"
    target.last_name = "User"
    target.email = _tombstone_email(target.pk)
    target.phone = _tombstone_phone()
    target.address = ""
    target.bio = ""
    target.professional_card_number = None
    target.bar_association = None
    target.bar_inscription_year = None
    target.is_active = False
    target.accept_terms = False
    target.accept_data_processing = False
    target.save()

    if cabinet is not None:
        ActivityLog.objects.create(
            cabinet=cabinet,
            kind="user_anonymized",
            message=_("Account anonymized (right to erasure)"),
            actor=actor if getattr(actor, "pk", None) else None,
            entity_type="user",
            entity_id=str(target.pk),
            previous_value={"email_domain": (old_email or "").split("@")[-1]},
            new_value={"anonymized": True},
        )

    rotate_user_session(target)
    return target


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def anonymize_me(request):
    """POST /api/v1/users/me/anonymize/ — erase the caller's personal data."""
    user = request.user
    cabinet = get_user_cabinet(user)
    with transaction.atomic():
        anonymize_user(target=user, actor=user, cabinet=cabinet)
    return Response(
        {"detail": _("Your account data has been anonymized.")},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def anonymize_user_by_id(request, pk):
    """
    POST /api/v1/users/<pk>/anonymize/
    Cabinet owner/admin may anonymize a client (non-member) in their cabinet.
    """
    actor = request.user
    target = get_object_or_404(User, pk=pk)
    actor_cabinet = get_user_cabinet(actor)
    if not actor_cabinet or not _user_shares_cabinet(actor, target):
        return Response({"detail": _("Not found.")}, status=status.HTTP_404_NOT_FOUND)
    if not can_manage_roles(actor) and not actor.is_cabinet_owner():
        return Response(
            {"detail": _("You do not have permission to anonymize this account.")},
            status=status.HTTP_403_FORBIDDEN,
        )
    # Prefer clients / non-members; block anonymizing another owner via this route.
    if target.is_cabinet_owner() and target.pk != actor.pk:
        return Response(
            {"detail": _("Cabinet owners cannot be anonymized via this endpoint.")},
            status=status.HTTP_400_BAD_REQUEST,
        )
    with transaction.atomic():
        anonymize_user(target=target, actor=actor, cabinet=actor_cabinet)
    return Response(
        {"detail": _("Account data has been anonymized.")},
        status=status.HTTP_200_OK,
    )
