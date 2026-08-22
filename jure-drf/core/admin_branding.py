"""JURE branding helpers for django-unfold admin."""

from __future__ import annotations

import os

from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _


def environment_callback(request):
    """Show Local / Staging / Production badge in the admin header."""
    module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
    if "production" in module:
        return ["Production", "danger"]
    if "staging" in module:
        return ["Staging", "warning"]
    return ["Local", "info"]


def environment_title_prefix_callback(request):
    label, _ = environment_callback(request)
    return f"[{label}] "


def get_unfold_settings(*, frontend_url: str = "/") -> dict:
    """Build UNFOLD config with JURE purple branding."""
    app_url = frontend_url or "/"

    return {
        "SITE_TITLE": _("JURE Admin"),
        "SITE_HEADER": _("JURE"),
        "SITE_SUBHEADER": _("Administration"),
        "SITE_URL": app_url,
        "SITE_SYMBOL": "balance",
        "SITE_ICON": {
            "light": lambda request: static("branding/jure-logo.png"),
            "dark": lambda request: static("branding/jure-logo.png"),
        },
        "SITE_FAVICONS": [
            {
                "rel": "icon",
                "sizes": "32x32",
                "type": "image/png",
                "href": lambda request: static("branding/jure-logo.png"),
            },
        ],
        "SITE_DROPDOWN": [
            {
                "icon": "language",
                "title": _("Open app"),
                "link": app_url,
            },
            {
                "icon": "dashboard",
                "title": _("Admin home"),
                "link": reverse_lazy("admin:index"),
            },
        ],
        "SHOW_HISTORY": True,
        "SHOW_VIEW_ON_SITE": True,
        "SHOW_BACK_BUTTON": True,
        "ENVIRONMENT": "core.admin_branding.environment_callback",
        "ENVIRONMENT_TITLE_PREFIX": "core.admin_branding.environment_title_prefix_callback",
        "BORDER_RADIUS": "10px",
        "COLORS": {
            # Tuned to JURE primary #64499D / #4D3680 / #8B6FD1
            "primary": {
                "50": "oklch(97.5% 0.02 295)",
                "100": "oklch(94% 0.04 295)",
                "200": "oklch(88% 0.07 295)",
                "300": "oklch(78% 0.10 295)",
                "400": "oklch(65% 0.13 295)",
                "500": "oklch(48% 0.14 295)",
                "600": "oklch(40% 0.12 295)",
                "700": "oklch(34% 0.10 295)",
                "800": "oklch(28% 0.09 295)",
                "900": "oklch(22% 0.07 295)",
                "950": "oklch(16% 0.05 295)",
            },
        },
        "SIDEBAR": {
            "show_search": True,
            "show_all_applications": True,
            "navigation": [
                {
                    "title": _("Overview"),
                    "separator": True,
                    "items": [
                        {
                            "title": _("Dashboard"),
                            "icon": "dashboard",
                            "link": reverse_lazy("admin:index"),
                        },
                    ],
                },
                {
                    "title": _("People"),
                    "separator": True,
                    "collapsible": True,
                    "items": [
                        {
                            "title": _("Users"),
                            "icon": "group",
                            "link": reverse_lazy("admin:users_user_changelist"),
                        },
                        {
                            "title": _("Cabinets"),
                            "icon": "apartment",
                            "link": reverse_lazy("admin:cabinets_cabinet_changelist"),
                        },
                        {
                            "title": _("Jurisdictions"),
                            "icon": "public",
                            "link": reverse_lazy(
                                "admin:jurisdictions_jurisdiction_changelist"
                            ),
                        },
                        {
                            "title": _("Clients"),
                            "icon": "contacts",
                            "link": reverse_lazy("admin:clients_client_changelist"),
                        },
                        {
                            "title": _("Lawyers"),
                            "icon": "badge",
                            "link": reverse_lazy(
                                "admin:lawyers_lawyerprofile_changelist"
                            ),
                        },
                    ],
                },
                {
                    "title": _("Content"),
                    "separator": True,
                    "collapsible": False,
                    "items": [
                        {
                            "title": _("Announcements"),
                            "icon": "campaign",
                            "link": reverse_lazy(
                                "admin:dashboard_announcement_changelist"
                            ),
                        },
                        {
                            "title": _("Library"),
                            "icon": "menu_book",
                            "link": reverse_lazy("admin:library_document_changelist"),
                        },
                        {
                            "title": _("Upload library files"),
                            "icon": "upload_file",
                            "link": reverse_lazy("admin:library_document_bulk_upload"),
                        },
                    ],
                },
                {
                    "title": _("Work"),
                    "separator": True,
                    "collapsible": True,
                    "items": [
                        {
                            "title": _("Cases"),
                            "icon": "folder_open",
                            "link": reverse_lazy("admin:cases_case_changelist"),
                        },
                        {
                            "title": _("Notifications"),
                            "icon": "notifications",
                            "link": reverse_lazy(
                                "admin:notifications_notification_changelist"
                            ),
                        },
                    ],
                },
                {
                    "title": _("Finance"),
                    "separator": True,
                    "collapsible": True,
                    "items": [
                        {
                            "title": _("Invoices"),
                            "icon": "receipt_long",
                            "link": reverse_lazy("admin:finance_invoice_changelist"),
                        },
                        {
                            "title": _("Payments"),
                            "icon": "payments",
                            "link": reverse_lazy("admin:finance_payment_changelist"),
                        },
                        {
                            "title": _("Fees"),
                            "icon": "request_quote",
                            "link": reverse_lazy("admin:finance_fee_changelist"),
                        },
                    ],
                },
            ],
        },
        "EXTENSIONS": {
            "modeltranslation": {
                "flags": {
                    "en": "🇬🇧",
                    "fr": "🇫🇷",
                    "ar": "🇲🇦",
                },
            },
        },
    }
