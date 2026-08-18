import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from core.email_context import absolute_frontend_url, email_brand_context

logger = logging.getLogger(__name__)

CONTACT_INBOX_DEFAULT = "contact@jure.ma"

SOURCE_LABELS = {
    "contact": {
        "en": "Website contact form",
        "fr": "Formulaire de contact du site",
        "ar": "نموذج التواصل في الموقع",
    },
    "status-subscribe": {
        "en": "Status alerts request",
        "fr": "Demande d’alertes de statut",
        "ar": "طلب تنبيهات الحالة",
    },
}

ACK_COPY = {
    "contact": {
        "en": {
            "subject": "We received your request — JURE",
            "preheader": "Thank you. The JURE team will get back to you shortly.",
            "title": "Thank you for contacting JURE",
            "hello": "Hello {name},",
            "body": (
                "Thank you for writing to us. We have received your request and our team "
                "will contact you within a reasonable time, usually within one business day."
            ),
            "ref": "Your message",
            "footer": "You received this email because you submitted a request on jure.ma.",
        },
        "fr": {
            "subject": "Nous avons bien reçu votre demande — JURE",
            "preheader": "Merci. L’équipe JURE vous recontactera rapidement.",
            "title": "Merci d’avoir contacté JURE",
            "hello": "Bonjour {name},",
            "body": (
                "Merci de nous avoir écrit. Nous avons bien reçu votre demande et notre équipe "
                "vous recontactera dans un délai raisonnable, généralement sous un jour ouvré."
            ),
            "ref": "Votre message",
            "footer": "Vous recevez cet e-mail car vous avez envoyé une demande sur jure.ma.",
        },
        "ar": {
            "subject": "استلمنا طلبك — JURE",
            "preheader": "شكرًا لك. سيتواصل معك فريق JURE قريبًا.",
            "title": "شكرًا لتواصلك مع JURE",
            "hello": "مرحبًا {name}،",
            "body": (
                "شكرًا لرسالتك. استلمنا طلبك وسيتواصل معك فريقنا خلال فترة معقولة، "
                "عادةً خلال يوم عمل واحد."
            ),
            "ref": "رسالتك",
            "footer": "وصلك هذا البريد لأنك أرسلت طلبًا عبر jure.ma.",
        },
    },
    "status-subscribe": {
        "en": {
            "subject": "Status alerts request received — JURE",
            "preheader": "We received your request for JURE status alerts.",
            "title": "We received your status alerts request",
            "hello": "Hello,",
            "body": (
                "Thank you. We have received your request to receive JURE status alerts "
                "and will confirm shortly."
            ),
            "ref": "Your request",
            "footer": "You received this email because you requested status alerts on jure.ma.",
        },
        "fr": {
            "subject": "Demande d’alertes de statut reçue — JURE",
            "preheader": "Nous avons bien reçu votre demande d’alertes JURE.",
            "title": "Demande d’alertes bien reçue",
            "hello": "Bonjour,",
            "body": (
                "Merci. Nous avons bien reçu votre demande d’alertes de statut JURE "
                "et nous la confirmerons rapidement."
            ),
            "ref": "Votre demande",
            "footer": "Vous recevez cet e-mail car vous avez demandé des alertes sur jure.ma.",
        },
        "ar": {
            "subject": "استلمنا طلب تنبيهات الحالة — JURE",
            "preheader": "استلمنا طلبك لتنبيهات حالة JURE.",
            "title": "استلمنا طلب تنبيهات الحالة",
            "hello": "مرحبًا،",
            "body": "شكرًا لك. استلمنا طلبك لتنبيهات حالة JURE وسنؤكده قريبًا.",
            "ref": "طلبك",
            "footer": "وصلك هذا البريد لأنك طلبت تنبيهات الحالة عبر jure.ma.",
        },
    },
}


def contact_inbox() -> str:
    return getattr(settings, "CONTACT_INBOX", CONTACT_INBOX_DEFAULT) or CONTACT_INBOX_DEFAULT


def contact_from_email() -> str:
    configured = getattr(settings, "DEFAULT_FROM_EMAIL", "") or ""
    if not configured or "webmaster@localhost" in configured:
        return f"JURE <{contact_inbox()}>"
    return configured


def normalize_locale(value: str | None) -> str:
    lang = (value or "en").strip().lower()
    if lang.startswith("fr"):
        return "fr"
    if lang.startswith("ar"):
        return "ar"
    return "en"


def _source_key(contact) -> str:
    key = (getattr(contact, "source", None) or "contact").strip()
    return key if key in SOURCE_LABELS else "contact"


def _first_name(contact) -> str:
    name = (contact.name or "").strip()
    if not name or name.lower() in {"status subscriber"}:
        return ""
    return name.split()[0]


def _team_subject(contact) -> str:
    source = _source_key(contact)
    name = (contact.name or "").strip() or contact.email
    if source == "status-subscribe":
        return f"[JURE website] Status alerts request — {contact.email}"
    topic = (contact.subject or "").strip()
    if topic:
        return f"[JURE website] Contact request from {name} — {topic}"[:200]
    return f"[JURE website] Contact request from {name}"[:200]


def send_landing_inquiry_emails(contact, locale: str | None = None) -> None:
    """Notify contact@jure.ma and send a thank-you email to the visitor."""
    lang = normalize_locale(locale)
    _send_team_notification(contact, lang)
    try:
        _send_visitor_acknowledgement(contact, lang)
    except Exception:
        logger.exception("Failed to send landing acknowledgement to %s", contact.email)


def _send_team_notification(contact, lang: str) -> None:
    inbox = contact_inbox()
    source = _source_key(contact)
    source_label = SOURCE_LABELS[source][lang]
    subject = _team_subject(contact)
    visitor_subject = (contact.subject or "").strip() or "—"
    ctx = email_brand_context(
        email_lang=lang,
        email_dir="rtl" if lang == "ar" else "ltr",
        preheader=f"New website inquiry from {contact.name} ({contact.email})",
        email_title="New website inquiry",
        contact=contact,
        source_label=source_label,
        visitor_subject=visitor_subject,
        visitor_message=contact.message,
        inbox=inbox,
        site_url=absolute_frontend_url("/contact"),
        footer_note="This message was submitted from the JURE public website, not from a workspace account.",
    )
    html = render_to_string("emails/contact/team_inquiry.html", ctx)
    text = render_to_string("emails/contact/team_inquiry.txt", ctx)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=contact_from_email(),
        to=[inbox],
        reply_to=[contact.email] if contact.email else None,
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)
    logger.info("Landing inquiry emailed to %s from %s", inbox, contact.email)


def _send_visitor_acknowledgement(contact, lang: str) -> None:
    source = _source_key(contact)
    copy = ACK_COPY[source][lang]
    first = _first_name(contact)
    hello_name = first or (contact.name or "").strip()
    hello = copy["hello"].format(name=hello_name) if "{name}" in copy["hello"] else copy["hello"]
    ctx = email_brand_context(
        email_lang=lang,
        email_dir="rtl" if lang == "ar" else "ltr",
        preheader=copy["preheader"],
        email_title=copy["title"],
        hello=hello,
        title=copy["title"],
        body=copy["body"],
        ref_label=copy["ref"],
        visitor_subject=(contact.subject or "").strip(),
        visitor_message=contact.message,
        footer_note=copy["footer"],
        inbox=contact_inbox(),
        contact_url=absolute_frontend_url("/contact"),
    )
    html = render_to_string("emails/contact/acknowledgement.html", ctx)
    text = render_to_string("emails/contact/acknowledgement.txt", ctx)
    msg = EmailMultiAlternatives(
        subject=copy["subject"],
        body=text,
        from_email=contact_from_email(),
        to=[contact.email],
        reply_to=[contact_inbox()],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)
    logger.info("Landing acknowledgement emailed to %s", contact.email)
