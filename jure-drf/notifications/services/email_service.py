import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_notification_email(notification_id: int) -> None:
    """
    Sends an email notification to the recipient.
    On failure: log error, do not raise.
    """
    from notifications.models import Notification

    try:
        n = Notification.objects.select_related("recipient", "related_case").get(pk=notification_id)
    except Notification.DoesNotExist:
        logger.warning("send_notification_email: notification %s missing", notification_id)
        return

    if n.email_sent:
        return

    recipient = n.recipient
    to_email = getattr(recipient, "email", None)
    if not to_email:
        logger.warning("send_notification_email: no email for user %s", recipient.pk)
        return

    firm_name = "votre cabinet"
    cab = getattr(recipient, "cabinet", None)
    if cab and getattr(cab, "trade_name", None):
        firm_name = cab.trade_name
    else:
        owned = getattr(recipient, "owned_cabinet", None)
        if owned and getattr(owned, "trade_name", None):
            firm_name = owned.trade_name

    base = getattr(settings, "FRONTEND_BASE_URL_NORMALIZED", None) or getattr(
        settings, "FRONTEND_BASE_URL", "http://localhost:3000"
    )
    base = str(base).rstrip("/")
    action = (n.action_url or "").strip()
    cta_url = f"{base}{action}" if action.startswith("/") else f"{base}/{action}" if action else base

    priority_colors = {
        "URGENT": "#dc2626",
        "HIGH": "#d97706",
        "MEDIUM": "#4f46e5",
        "LOW": "#6b7280",
    }
    bar_color = priority_colors.get(n.priority, priority_colors["MEDIUM"])

    company = getattr(settings, "COMPANY_NAME", "Jure")

    html = render_to_string(
        "notifications/email_notification.html",
        {
            "notification": n,
            "bar_color": bar_color,
            "cta_url": cta_url,
            "firm_name": firm_name,
            "company_name": company,
        },
    )

    subject = f"[{company}] {n.title}"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost")

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=n.message,
            from_email=from_email,
            to=[to_email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send()
        Notification.objects.filter(pk=n.pk).update(email_sent=True, email_sent_at=timezone.now())
    except Exception:
        logger.exception("send_notification_email failed for notification %s", notification_id)
