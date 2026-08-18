"""
Shared brand context and helpers for Jure transactional emails.

Presentation-layer only: does not generate tokens, mutate auth, or change URLs.
"""

from __future__ import annotations

from urllib.parse import urlparse

from django.conf import settings

JURE_PURPLE = "#64499D"
JURE_PURPLE_HOVER = "#4D3680"
EMAIL_INK = "#17141F"
EMAIL_MUTED = "#667085"
EMAIL_BG = "#F7F7F9"
EMAIL_CARD = "#FFFFFF"
EMAIL_BORDER = "#E8E6ED"
EMAIL_FONT = "Inter, Arial, Helvetica, sans-serif"
LOGO_PATH = "/images/jure-logo.png"
PUBLIC_SITE_ORIGIN = "https://jure.ma"

PRIORITY_COLORS = {
    "URGENT": "#DC2626",
    "HIGH": "#D97706",
    "MEDIUM": JURE_PURPLE,
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


def _is_local_origin(origin: str) -> bool:
    host = urlparse(origin).hostname or origin
    return host in {"localhost", "127.0.0.1", "::1"}


def email_asset_origin() -> str:
    """Public origin for images in emails (Gmail cannot load localhost)."""
    configured = (getattr(settings, "EMAIL_LOGO_ORIGIN", "") or "").rstrip("/")
    if configured:
        return configured
    origin = frontend_origin()
    if _is_local_origin(origin):
        return PUBLIC_SITE_ORIGIN
    return origin


def email_logo_url() -> str:
    return f"{email_asset_origin()}{LOGO_PATH}"


def website_url() -> str:
    origin = frontend_origin()
    if _is_local_origin(origin):
        return PUBLIC_SITE_ORIGIN
    return origin


def website_label() -> str:
    host = urlparse(website_url()).hostname or frontend_host()
    if host.startswith("www."):
        host = host[4:]
    return host


def email_brand_context(**extra):
    """Common template context for every transactional email."""
    origin = frontend_origin()
    host = frontend_host()
    company = company_name()
    site = website_url()
    ctx = {
        "company_name": company,
        "frontend_base_url": origin,
        "site_domain": host,
        "website_url": site,
        "website_label": extra.pop("website_label", website_label()),
        "logo_url": extra.pop("logo_url", email_logo_url()),
        "current_site": {"name": company, "domain": host},
        "email_dir": extra.pop("email_dir", "ltr"),
        "email_lang": extra.pop("email_lang", "en"),
        "brand_color": extra.pop("brand_color", JURE_PURPLE),
        "email_ink": EMAIL_INK,
        "email_muted": EMAIL_MUTED,
        "email_bg": EMAIL_BG,
        "email_card": EMAIL_CARD,
        "email_border": EMAIL_BORDER,
        "email_font": EMAIL_FONT,
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
