"""Client confirmation email for consultations. Failures must not roll back creation."""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from core.email_context import absolute_frontend_url, company_name, email_brand_context, firm_name_for_user

from .activity import log_consultation_activity
from .consultation_fields import attorney_display_name, collect_assigned_attorneys, duration_minutes

logger = logging.getLogger(__name__)


def consultation_frontend_path_safe(case) -> str:
    slug_source = (case.title or case.reference or f"case-{case.id}").strip()
    return f"/dashboard/cases/consultations/{case.id}"


def send_consultation_confirmation(case, *, actor=None) -> bool:
    """
    Send the client confirmation email. Updates email_confirmation_status on the case.
    Returns True on success. Never raises to the caller.
    """
    client = getattr(case, "client", None)
    to_email = getattr(client, "email", None) if client else None
    if not to_email:
        case.email_confirmation_status = "FAILED"
        case.email_confirmation_error = "Client has no email address."
        case.save(update_fields=["email_confirmation_status", "email_confirmation_error"])
        log_consultation_activity(
            case,
            "consultation_email_failed",
            f"Confirmation email failed for {case.reference}: no client email",
            actor=actor,
            new_value={"status": "FAILED", "reason": "no_email"},
        )
        return False

    data = case.case_specific_data or {}
    fmt = data.get("format") or ""
    attorneys = collect_assigned_attorneys(case)
    attorney_names = ", ".join(attorney_display_name(u) for u in attorneys if attorney_display_name(u))
    cta_url = absolute_frontend_url(consultation_frontend_path_safe(case))
    firm = firm_name_for_user(case.assigned_to or actor, fallback=company_name())
    minutes = duration_minutes(data)
    duration_label = f"{minutes} min" if minutes else ""
    is_follow_up = bool(getattr(case, "parent_consultation_id", None))

    location_label = ""
    location_value = ""
    if fmt == "IN_PERSON":
        location_label = "Address"
        parts = [data.get("address") or "", data.get("city") or ""]
        location_value = ", ".join(p for p in parts if p)
        extra = data.get("addressInstructions") or ""
        if extra:
            location_value = f"{location_value}\n{extra}".strip()
    elif fmt == "PHONE":
        location_label = "Phone"
        location_value = data.get("phoneNumber") or getattr(client, "phone", "") or ""
    elif fmt == "VIDEO":
        location_label = "Video conference"
        location_value = data.get("videoLink") or ""

    ctx = email_brand_context(
        email_lang="en",
        email_title=(
            f"Follow-up consultation confirmation — {case.reference}"
            if is_follow_up
            else f"Consultation confirmation — {case.reference}"
        ),
        preheader=(
            f"Your follow-up consultation {case.reference} is confirmed."
            if is_follow_up
            else f"Your consultation {case.reference} is confirmed."
        ),
        firm_name=firm,
        consultation=case,
        reference=case.reference,
        title=case.title,
        consultation_type=data.get("consultationType") or "",
        consultation_date=data.get("consultationDate") or "",
        duration_label=duration_label,
        format=fmt,
        attorneys=attorney_names,
        location_label=location_label,
        location_value=location_value,
        video_link=data.get("videoLink") or "",
        cta_url=cta_url,
        cta_label="View consultation",
        join_label="Join consultation",
        is_follow_up=is_follow_up,
        parent_reference=getattr(getattr(case, "parent_consultation", None), "reference", "") or "",
    )

    subject = (
        f"Follow-up Consultation Confirmation — {case.reference}"
        if is_follow_up
        else f"Consultation Confirmation — {case.reference}"
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost")
    try:
        html = render_to_string("emails/consultations/confirmation.html", ctx)
        text = render_to_string("emails/consultations/confirmation.txt", ctx)
        msg = EmailMultiAlternatives(subject=subject, body=text, from_email=from_email, to=[to_email])
        msg.attach_alternative(html, "text/html")
        msg.send()
        case.email_confirmation_status = "SENT"
        case.email_confirmation_error = ""
        case.save(update_fields=["email_confirmation_status", "email_confirmation_error"])
        log_consultation_activity(
            case,
            "consultation_email_sent",
            f"Confirmation email sent to {to_email}",
            actor=actor,
            new_value={"status": "SENT", "recipient": to_email, "subject": subject},
        )
        return True
    except Exception as exc:
        logger.exception("Consultation confirmation email failed for case %s", case.id)
        case.email_confirmation_status = "FAILED"
        case.email_confirmation_error = str(exc)[:500]
        case.save(update_fields=["email_confirmation_status", "email_confirmation_error"])
        log_consultation_activity(
            case,
            "consultation_email_failed",
            f"Confirmation email failed for {case.reference}",
            actor=actor,
            new_value={"status": "FAILED", "recipient": to_email, "subject": subject, "error": str(exc)[:300]},
        )
        return False
