import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from core.email_context import (
    PRIORITY_COLORS,
    absolute_frontend_url,
    company_name,
    email_brand_context,
    firm_name_for_user,
    notification_cta_kind,
)

logger = logging.getLogger(__name__)


def send_notification_email(notification_id: int) -> None:
    """
    Sends an email notification to the recipient.
    On failure: log error, do not raise.
    """
    from notifications.models import Notification

    try:
        n = Notification.objects.select_related(
            "recipient",
            "recipient__cabinet",
            "recipient__owned_cabinet",
            "related_case",
            "related_task",
            "related_appointment",
        ).get(pk=notification_id)
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

    firm = firm_name_for_user(recipient, fallback="votre cabinet")
    cta_url = absolute_frontend_url(n.action_url or "")
    bar_color = PRIORITY_COLORS.get(n.priority, PRIORITY_COLORS["MEDIUM"])
    company = company_name()

    ctx = email_brand_context(
        email_lang="fr",
        notification=n,
        bar_color=bar_color,
        cta_url=cta_url,
        cta_kind=notification_cta_kind(n),
        firm_name=firm,
        preheader=n.title,
        email_title=n.title,
        show_priority_label=n.priority in ("URGENT", "HIGH"),
        priority_label=n.priority,
    )

    html = render_to_string("emails/notifications/notification.html", ctx)
    text = render_to_string("emails/notifications/notification.txt", ctx)

    subject = f"[{company}] {n.title}"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost")

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text,
            from_email=from_email,
            to=[to_email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send()
        Notification.objects.filter(pk=n.pk).update(email_sent=True, email_sent_at=timezone.now())
    except Exception:
        logger.exception("send_notification_email failed for notification %s", notification_id)
