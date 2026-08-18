"""
Shared brand context and helpers for Jure transactional emails.

Presentation-layer only: does not generate tokens, mutate auth, or change URLs.
"""

from __future__ import annotations

from urllib.parse import urlparse

from django.conf import settings

JURE_PURPLE = "#6D54B5"

PRIORITY_COLORS = {
    "URGENT": "#DC2626",
    "HIGH": "#D97706",
    "MEDIUM": "#6D54B5",
    "LOW": "#6B7280",
}


def frontend_origin() -> str:
    base = getattr(settings, "FRONTEND_BASE_URL_NORMALIZED", None) or getattr(
        settings, "FRONTEND_BASE_URL", "http://localhost:3000"
    )
    return str(base).rstrip("/")


def frontend_host() -> str:
    origin = frontend_origin()
    parsed = urlparse(origin)
    if parsed.netloc:
        return parsed.netloc
    return origin.split("//")[-1]


def company_name() -> str:
    return getattr(settings, "COMPANY_NAME", "Jure") or "Jure"


def email_brand_context(**extra):
    """Common template context for every transactional email."""
    origin = frontend_origin()
    host = frontend_host()
    company = company_name()
    ctx = {
        "company_name": company,
        "frontend_base_url": origin,
        "site_domain": host,
        "current_site": {"name": company, "domain": host},
        "email_dir": extra.pop("email_dir", "ltr"),
        "email_lang": extra.pop("email_lang", "en"),
        "brand_color": JURE_PURPLE,
    }
    ctx.update(extra)
    return ctx


def firm_name_for_user(user, fallback: str = "") -> str:
    if not user:
        return fallback
    cab = getattr(user, "cabinet", None)
    if cab and getattr(cab, "trade_name", None):
        return cab.trade_name
    owned = getattr(user, "owned_cabinet", None)
    if owned and getattr(owned, "trade_name", None):
        return owned.trade_name
    return fallback


def absolute_frontend_url(path: str) -> str:
    """Join FRONTEND_BASE_URL with a path. Does not alter query strings."""
    origin = frontend_origin()
    action = (path or "").strip()
    if not action:
        return origin
    if action.startswith("http://") or action.startswith("https://"):
        return action
    if action.startswith("/"):
        return f"{origin}{action}"
    return f"{origin}/{action}"


def notification_cta_kind(notification) -> str:
    if getattr(notification, "related_case_id", None):
        return "case"
    if getattr(notification, "related_task_id", None):
        return "task"
    if getattr(notification, "related_appointment_id", None):
        return "appointment"
    return "default"
