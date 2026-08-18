import logging

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

CONTACT_INBOX_DEFAULT = "contact@jure.ma"


def contact_inbox() -> str:
    return getattr(settings, "CONTACT_INBOX", CONTACT_INBOX_DEFAULT) or CONTACT_INBOX_DEFAULT


def send_landing_inquiry_email(contact) -> None:
    """Forward a public landing-page inquiry to the JURE inbox."""
    inbox = contact_inbox()
    source = (contact.source or "contact").strip() or "contact"
    subject_line = (contact.subject or "").strip() or "New inquiry"
    subject = f"[JURE] {source}: {subject_line}"[:200]

    lines = [
        f"Source: {source}",
        f"Name: {contact.name}",
        f"Email: {contact.email}",
        f"Company: {contact.company or '—'}",
        f"Phone: {contact.phone or '—'}",
        f"Subject: {subject_line}",
        "",
        contact.message,
    ]

    mail = EmailMessage(
        subject=subject,
        body="\n".join(lines),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[inbox],
        reply_to=[contact.email] if contact.email else None,
    )
    mail.send(fail_silently=False)
    logger.info("Landing inquiry emailed to %s from %s", inbox, contact.email)
