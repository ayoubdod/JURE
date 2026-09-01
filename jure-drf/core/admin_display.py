"""Reusable Unfold @display helpers for compact status badges."""

from __future__ import annotations

from django.utils.translation import gettext_lazy as _

SUCCESS = "success"
WARNING = "warning"
DANGER = "danger"
INFO = "info"

# Maps status codes (and boolean values) to Unfold label variants.
# Used as @display(label=STATUS_LABELS) with a (code, caption) return value.
STATUS_LABELS = {
    True: SUCCESS,
    False: DANGER,
    "active": SUCCESS,
    "ACTIVE": SUCCESS,
    "published": SUCCESS,
    "PUBLISHED": SUCCESS,
    "paid": SUCCESS,
    "PAID": SUCCESS,
    "confirmed": SUCCESS,
    "CONFIRMED": SUCCESS,
    "open": SUCCESS,
    "OPEN": SUCCESS,
    "in_progress": SUCCESS,
    "IN_PROGRESS": SUCCESS,
    "success": SUCCESS,
    "SUCCESS": SUCCESS,
    "read": SUCCESS,
    "staff": SUCCESS,
    "pending": WARNING,
    "PENDING": WARNING,
    "scheduled": WARNING,
    "SCHEDULED": WARNING,
    "draft": WARNING,
    "DRAFT": WARNING,
    "unread": WARNING,
    "sent": INFO,
    "SENT": INFO,
    "partially_paid": INFO,
    "PARTIALLY_PAID": INFO,
    "info": INFO,
    "INFO": INFO,
    "inactive": INFO,
    "INACTIVE": INFO,
    "archived": INFO,
    "ARCHIVED": INFO,
    "closed": INFO,
    "CLOSED": INFO,
    "member": INFO,
    "superuser": INFO,
    "cancelled": DANGER,
    "canceled": DANGER,
    "CANCELLED": DANGER,
    "overdue": DANGER,
    "OVERDUE": DANGER,
    "suspended": DANGER,
    "expired": DANGER,
    "warning": WARNING,
    "WARNING": WARNING,
    "important": DANGER,
    "IMPORTANT": DANGER,
    "maintenance": WARNING,
    "MAINTENANCE": WARNING,
    "unpaid": DANGER,
    "UNPAID": DANGER,
    "CONSULTATION": INFO,
    "LITIGATION": INFO,
    "ADMINISTRATIVE": INFO,
    "INDIVIDUAL": INFO,
    "COMPANY": INFO,
    "GLOBAL": INFO,
    "JURISDICTION": INFO,
    "CABINET": INFO,
    "LAW_OFFICE": INFO,
    "LAW_FIRM": INFO,
    "DELETED": DANGER,
    "deleted": DANGER,
    "PENDING_REVIEW": WARNING,
    "REVIEWED_NO_CONFLICT": SUCCESS,
    "CONFLICT_IDENTIFIED": DANGER,
    "WAIVER_REQUIRED": WARNING,
    "DISMISSED": INFO,
    "NO_CONFLICT": SUCCESS,
    "CONFLICT": DANGER,
    "WAIVER": WARNING,
}


def status_pair(value, display: str | None = None):
    """Return (code, caption) for Unfold @display(label=STATUS_LABELS)."""
    if display is not None:
        return value, display
    if value is True:
        return True, _("Active")
    if value is False:
        return False, _("Inactive")
    caption = str(value).replace("_", " ").title() if value else "—"
    return value, caption
