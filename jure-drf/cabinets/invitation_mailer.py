"""
InvitationMailer: sends 'Welcome to the Team at Jure' email with a one-time Set Password link.
Uses Django's email backend (SMTP when SMTP_PASS / EMAIL_HOST_PASSWORD is set).
Logs SMTP failures without raising; raises on invalid email so the API can return a specific error.
"""
import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

logger = logging.getLogger(__name__)

JURE_PURPLE = "#6D54B5"
SUBJECT = "Welcome to the Team at Jure"
SETUP_PASSWORD_PATH = "/setup-password"


def _validate_email_address(email: str) -> None:
    """Raise ValidationError with a specific message if email is invalid."""
    if not email or not str(email).strip():
        raise ValidationError("Invalid email address.")
    try:
        validate_email(email.strip().lower())
    except ValidationError:
        raise ValidationError("Invalid email address.")


def _html_body(login_email: str, setup_url: str, first_name: str = "") -> str:
    """Professional HTML email body with Jure branding."""
    greeting = f"Hello {first_name}," if first_name else "Hello,"
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Team at Jure</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 40px 32px 24px 32px;">
              <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #1a1a1a;">Welcome to the Team at Jure</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">{greeting}</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">You have been invited to join the team on Jure Legal Workspace. Use the credentials below to sign in and set your password.</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">Your login email:</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">{login_email}</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #333;">Click the button below to set your password and access your account.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: {JURE_PURPLE};">
                    <a href="{setup_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Setup My Account</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #666;">If the button does not work, copy and paste this link into your browser:</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; word-break: break-all; color: #6D54B5;">{setup_url}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 40px 32px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 13px; color: #888;">Jure Legal Workspace</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


class InvitationMailer:
    """
    Sends team invitation email with a one-time Set Password link.
    Call send_invitation(user, token) after creating the user and PasswordSetupToken.
    """

    @staticmethod
    def send_invitation(recipient_email: str, token: str, first_name: str = "") -> None:
        """
        Send the invitation email. Does not raise on SMTP failure (logs only).
        Raises ValidationError if recipient_email is invalid, so the API can return a specific error.
        """
        _validate_email_address(recipient_email)
        base_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
        setup_url = f"{base_url}{SETUP_PASSWORD_PATH}?token={token}"

        html_content = _html_body(login_email=recipient_email, setup_url=setup_url, first_name=first_name or "")
        text_content = (
            f"Welcome to the Team at Jure.\n\n"
            f"Your login email: {recipient_email}\n\n"
            f"Set your password and access your account: {setup_url}\n\n"
            f"Jure Legal Workspace"
        )

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost")
        try:
            msg = EmailMultiAlternatives(
                subject=SUBJECT,
                body=text_content,
                from_email=from_email,
                to=[recipient_email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
        except Exception as e:
            logger.exception("InvitationMailer: SMTP failure sending invitation to %s: %s", recipient_email, e)
            # Fallback: send via console backend so the setup link is printed in the terminal
            try:
                from django.core.mail import get_connection
                console = get_connection("django.core.mail.backends.console.EmailBackend")
                msg_console = EmailMultiAlternatives(
                    subject=f"[CONSOLE FALLBACK] {SUBJECT}",
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
