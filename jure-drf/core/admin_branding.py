"""JURE branding helpers for django-unfold admin."""

from __future__ import annotations

import os

from django.templatetags.static import static
from django.urls import reverse, reverse_lazy
from django.utils.translation import gettext_lazy as _


def environment_callback(request):
    """Show LOCAL / STAGING / PRODUCTION badge in the admin header."""
    module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
    if "production" in module:
        return ["PRODUCTION", "success"]
    if "staging" in module:
        return ["STAGING", "warning"]
    return ["LOCAL", ""]


def environment_title_prefix_callback(request):
    label, _ = environment_callback(request)
    return f"[{label}] "


def account_profile_link(request):
    return reverse("admin:users_user_change", args=[request.user.pk])


def get_unfold_settings(*, frontend_url: str = "/") -> dict:
    """Build UNFOLD config with JURE purple branding and a light-first shell."""
    app_url = frontend_url or "/"

    return {
        "SITE_TITLE": _("JURE Admin"),
        "SITE_HEADER": _("JURE"),
        "SITE_SUBHEADER": _("Administration"),
        "SITE_URL": app_url,
        "SITE_SYMBOL": "balance",
        "SITE_ICON": {
            "light": lambda request: static("branding/jure-mark.svg"),
            "dark": lambda request: static("branding/jure-mark.svg"),
        },
        "SITE_FAVICONS": [
            {
                "rel": "icon",
                "sizes": "32x32",
                "type": "image/svg+xml",
                "href": lambda request: static("branding/jure-mark.svg"),
            },
        ],
        "SITE_DROPDOWN": [
            {
                "icon": "open_in_new",
                "title": _("Open JURE"),
                "link": app_url,
            },
            {
                "icon": "dashboard",
                "title": _("Admin home"),
                "link": reverse_lazy("admin:index"),
            },
        ],
        "ACCOUNT": {
            "navigation": [
                {
                    "icon": "person",
                    "title": _("Profile"),
                    "link": account_profile_link,
                },
                {
                    "icon": "settings",
                    "title": _("Account settings"),
                    "link": reverse_lazy("admin:password_change"),
                },
                {
                    "icon": "open_in_new",
                    "title": _("Open JURE"),
                    "link": app_url,
                },
                {
                    "icon": "home",
                    "title": _("Admin home"),
                    "link": reverse_lazy("admin:index"),
                },
            ],
        },
        "SHOW_HISTORY": True,
        "SHOW_VIEW_ON_SITE": True,
        "SHOW_BACK_BUTTON": True,
        "SHOW_LANGUAGES": True,
        "LANGUAGE_FLAGS": {
            "en": "🇬🇧",
            "fr": "🇫🇷",
            "ar": "🇲🇦",
        },
        "ENVIRONMENT": "core.admin_branding.environment_callback",
        "ENVIRONMENT_TITLE_PREFIX": "core.admin_branding.environment_title_prefix_callback",
        "DASHBOARD_CALLBACK": "core.admin_dashboard.dashboard_callback",
        "COMMAND": {
            "search_models": [
                "users.user",
                "cabinets.cabinet",
                "jurisdictions.jurisdiction",
                "clients.client",
                "lawyers.lawyerprofile",
                "cases.case",
                "library.document",
                "dashboard.announcement",
                "finance.invoice",
                "finance.payment",
                "finance.fee",
                "notifications.notification",
            ],
            "show_history": True,
        },
        "STYLES": [
            lambda request: static("admin/jure-admin.css"),
        ],
        "SCRIPTS": [
            lambda request: static("admin/jure-admin.js"),
        ],
        "BORDER_RADIUS": "10px",
        "COLORS": {
            # Neutral surfaces tuned to #F7F8FA / #E8EAF0 / #1F2937
            "base": {
                "50": "oklch(97.6% 0.003 264)",
                "100": "oklch(96.2% 0.004 264)",
                "200": "oklch(93.5% 0.007 264)",
                "300": "oklch(88.4% 0.01 264)",
                "400": "oklch(71.2% 0.015 264)",
                "500": "oklch(55.4% 0.018 264)",
                "600": "oklch(44.8% 0.022 264)",
                "700": "oklch(37.2% 0.024 264)",
                "800": "oklch(29.4% 0.024 264)",
                "900": "oklch(27.4% 0.025 260)",
                "950": "oklch(18.2% 0.02 260)",
            },
            # JURE primary #64499D
            "primary": {
                "50": "oklch(97.4% 0.015 295)",
                "100": "oklch(94.2% 0.03 295)",
                "200": "oklch(88.6% 0.055 295)",
                "300": "oklch(78.4% 0.08 295)",
                "400": "oklch(64.2% 0.11 295)",
                "500": "oklch(48.6% 0.118 295)",
                "600": "oklch(42.2% 0.115 295)",
                "700": "oklch(36.4% 0.105 295)",
                "800": "oklch(30.2% 0.09 295)",
                "900": "oklch(24.6% 0.07 295)",
                "950": "oklch(18.4% 0.05 295)",
            },
            "font": {
                "subtle-light": "oklch(55.1% 0.015 260)",
                "subtle-dark": "oklch(72% 0.015 260)",
                "default-light": "oklch(37% 0.02 260)",
                "default-dark": "oklch(86% 0.01 260)",
                "important-light": "oklch(27.4% 0.025 260)",
                "important-dark": "oklch(96% 0.005 260)",
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
                    "collapsible": True,
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
                            "title": _("Bulk Library Upload"),
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
        "TABS": [
            {
                "models": ["library.document"],
                "items": [
                    {
                        "title": _("Documents"),
                        "link": reverse_lazy("admin:library_document_changelist"),
                    },
                    {
                        "title": _("Bulk upload"),
                        "link": reverse_lazy("admin:library_document_bulk_upload"),
                    },
                ],
            },
        ],
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
