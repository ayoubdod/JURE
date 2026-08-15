"""
InvitationMailer: sends a Jure team invitation with a one-time Set Password link.

Uses Django's email backend (SMTP / Resend when configured). Logs SMTP failures
without raising; raises on invalid email so the API can return a specific error.
Presentation lives in templates/emails/invitations/. Token and URL format are unchanged.
"""
import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.template.loader import render_to_string
from django.utils.translation import gettext as _

from core.email_context import absolute_frontend_url, email_brand_context

logger = logging.getLogger(__name__)

SETUP_PASSWORD_PATH = "/setup-password"


def _validate_email_address(email: str) -> None:
    """Raise ValidationError with a specific message if email is invalid."""
    if not email or not str(email).strip():
        raise ValidationError("Invalid email address.")
    try:
        validate_email(email.strip().lower())
    except ValidationError:
        raise ValidationError("Invalid email address.")


class InvitationMailer:
    """
    Sends team invitation email with a one-time Set Password link.
    Call send_invitation(...) after creating the user and PasswordSetupToken.
    """

    @staticmethod
    def send_invitation(
        recipient_email: str,
        token: str,
        first_name: str = "",
        firm_name: str = "",
        expiry_days: int | None = None,
    ) -> None:
        """
        Send the invitation email. Does not raise on SMTP failure (logs only).
        Raises ValidationError if recipient_email is invalid, so the API can return a specific error.
        """
        _validate_email_address(recipient_email)
        setup_url = absolute_frontend_url(f"{SETUP_PASSWORD_PATH}?token={token}")

        ctx = email_brand_context(
            login_email=recipient_email,
            setup_url=setup_url,
            first_name=first_name or "",
            firm_name=firm_name or "",
            expiry_days=expiry_days,
            preheader=_("Set up your Jure account to join your team."),
            email_title=_("You're invited to join Jure"),
        )
        html_content = render_to_string("emails/invitations/invitation.html", ctx)
        text_content = render_to_string("emails/invitations/invitation.txt", ctx)
        subject = _("You're invited to join Jure")

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost")
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[recipient_email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
        except Exception as e:
            logger.exception(
                "InvitationMailer: SMTP failure sending invitation to %s: %s",
                recipient_email,
                e,
            )
            try:
                from django.core.mail import get_connection

                console = get_connection("django.core.mail.backends.console.EmailBackend")
                msg_console = EmailMultiAlternatives(
                    subject=f"[CONSOLE FALLBACK] {subject}",
                    body=text_content,
                    from_email=from_email,
                    to=[recipient_email],
                )
                msg_console.attach_alternative(html_content, "text/html")
                msg_console.connection = console
                msg_console.send()
                logger.warning(
                    "InvitationMailer: SMTP failed; invitation printed to console. Setup link: %s",
                    setup_url,
                )
            except Exception as fallback_e:
                logger.exception("InvitationMailer: Console fallback also failed: %s", fallback_e)
                raise
