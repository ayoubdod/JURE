from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from allauth.account.models import EmailAddress
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from cabinets.invitation_mailer import InvitationMailer
from users.models import PasswordSetupToken

logger = logging.getLogger(__name__)

PASSWORD_SETUP_TOKEN_EXPIRY_DAYS = 7


def ensure_client_email_verified(user) -> None:
    """Mark the client's email as verified so login works after password setup."""
    email_address, _created = EmailAddress.objects.get_or_create(
        user=user,
        email=user.email,
        defaults={"verified": True, "primary": True},
    )
    if not email_address.verified or not email_address.primary:
        email_address.verified = True
        email_address.primary = True
        email_address.save(update_fields=["verified", "primary"])


def issue_client_invitation(*, user, cabinet, send_email: bool = True) -> str:
    """
    Create a one-time password setup token and optionally email the client portal invite.
    Returns the raw token value.
    """
    ensure_client_email_verified(user)

    PasswordSetupToken.objects.filter(user=user).delete()
    token_value = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(days=PASSWORD_SETUP_TOKEN_EXPIRY_DAYS)
    PasswordSetupToken.objects.create(
        user=user,
        token=token_value,
        expires_at=expires_at,
    )

    if send_email:
        InvitationMailer.send_client_invitation(
            recipient_email=user.email,
            token=token_value,
            first_name=user.first_name or "",
            firm_name=getattr(cabinet, "trade_name", "") or "",
            expiry_days=PASSWORD_SETUP_TOKEN_EXPIRY_DAYS,
        )

    return token_value


def client_invitation_pending(user) -> bool:
    try:
        token = user.password_setup_token
    except (ObjectDoesNotExist, AttributeError):
        return False
    return bool(token and token.is_valid)
