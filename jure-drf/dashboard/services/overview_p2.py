"""
P2 dashboard extensions: portfolio, CRM heuristics, team overdue,
notification activity, conflict-review queue.

All queries are cabinet-scoped (and personal-scoped where applicable).
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Count
from django.utils import timezone

from cabinets.permissions import has_permission
from cases.models import Case
from conflict_checks.models import ConflictCheck
from notifications.models import Notification
from notifications.services.notification_service import in_app_queryset
from users.models import User

from .overview import (
    Scope,
    _active_cases_qs,
    _cases_for_user,
    _iso_dt,
    _tasks_overdue_qs,
)

# Documented heuristics (also exposed in payload definitions / crm.rules).
STALE_MATTER_DAYS = 30
CLIENT_FOLLOW_UP_DAYS = 45
AGING_GT_60_DAYS = 60


def _bucket_counts(qs, field: str, *, limit: int = 20) -> list[dict[str, Any]]:
    rows = (
        qs.values(field)
        .annotate(count=Count("id"))
        .order_by("-count", field)[:limit]
    )
    out = []
    for row in rows:
        key = row.get(field) or "UNKNOWN"
        out.append(
            {
                "key": str(key),
                "count": int(row["count"]),
                "href_hint": f"/dashboard/cases?{field}={key}",
            }
        )
    return out


def build_portfolio(cabinet, user, *, scope: Scope) -> dict[str, Any]:
    """Case aggregates by status, type, and lead lawyer — scope-aware."""
    qs = _cases_for_user(cabinet, user, scope=scope)
    active_qs = _active_cases_qs(cabinet, user, scope=scope)

    by_lawyer: list[dict[str, Any]] = []
    lawyer_rows = (
        active_qs.filter(assigned_to__isnull=False)
        .values("assigned_to_id", "assigned_to__first_name", "assigned_to__last_name", "assigned_to__email")
        .annotate(count=Count("id"))
        .order_by("-count", "assigned_to_id")[:15]
    )
    for row in lawyer_rows:
        first = (row.get("assigned_to__first_name") or "").strip()
        last = (row.get("assigned_to__last_name") or "").strip()
        name = f"{first} {last}".strip() or (row.get("assigned_to__email") or "Lawyer")
        uid = row["assigned_to_id"]
        by_lawyer.append(
            {
                "user_id": uid,
                "name": name,
                "count": int(row["count"]),
                "href_hint": f"/dashboard/cases?assigned_to={uid}",
            }
        )

    return {
        "by_status": _bucket_counts(qs, "status"),
        "by_type": _bucket_counts(qs, "case_type"),
        "by_lawyer": by_lawyer,
        "total": qs.count(),
        "active_total": active_qs.count(),
    }


def build_crm_heuristics(cabinet, user, *, scope: Scope) -> dict[str, Any]:
    """
    Stale matters: active cases with modified older than STALE_MATTER_DAYS.
    Client follow-ups: cabinet clients whose latest related case activity
    (or account join if no cases) is older than CLIENT_FOLLOW_UP_DAYS.
    """
    today = timezone.localdate()
    now = timezone.now()
    stale_before = now - timedelta(days=STALE_MATTER_DAYS)
    follow_before = now - timedelta(days=CLIENT_FOLLOW_UP_DAYS)
    aging_before = now - timedelta(days=AGING_GT_60_DAYS)

    active = _active_cases_qs(cabinet, user, scope=scope)
    stale_qs = active.filter(modified__lt=stale_before).select_related("client").order_by(
        "modified", "id"
    )
    aging_count = active.filter(modified__lt=aging_before).count()

    stale_matters = []
    for c in stale_qs[:10]:
        client_name = ""
        if c.client_id:
            client_name = (getattr(c.client, "first_name", None) or "").strip() or str(c.client_id)
        stale_matters.append(
            {
                "id": c.id,
                "title": c.title,
                "status": c.status,
                "case_type": c.case_type,
                "client": client_name or None,
                "modified": _iso_dt(c.modified),
                "days_idle": max(0, (today - c.modified.date()).days) if c.modified else None,
                "href_hint": f"/dashboard/cases/{c.id}",
            }
        )

    # Follow-ups are cabinet CRM (User clients), not personal-filtered.
    clients = User.objects.filter(cabinet=cabinet, is_cabinet_member=False)
    follow_ups: list[dict[str, Any]] = []
    for cl in clients.order_by("id")[:200]:
        latest = (
            Case.objects.filter(cabinet=cabinet, client=cl)
            .order_by("-modified")
            .values_list("modified", flat=True)
            .first()
        )
        anchor = latest or getattr(cl, "date_joined", None)
        if not anchor:
            continue
        if timezone.is_naive(anchor):
            anchor = timezone.make_aware(anchor, timezone.get_current_timezone())
        if anchor >= follow_before:
            continue
        name = (getattr(cl, "first_name", None) or "").strip() or cl.email or str(cl.id)
        follow_ups.append(
            {
                "id": cl.id,
                "name": name,
                "last_activity": _iso_dt(anchor),
                "days_idle": max(0, (today - anchor.date()).days),
                "href_hint": f"/dashboard/clients/{cl.id}",
            }
        )
    follow_ups.sort(key=lambda x: x.get("days_idle") or 0, reverse=True)
    follow_ups_count = len(follow_ups)
    follow_ups = follow_ups[:10]

    return {
        "rules": {
            "stale_matter_days": STALE_MATTER_DAYS,
            "client_follow_up_days": CLIENT_FOLLOW_UP_DAYS,
            "aging_gt_60_days": AGING_GT_60_DAYS,
        },
        "stale_matters": stale_matters,
        "stale_matters_count": stale_qs.count(),
        "client_follow_ups": follow_ups,
        "client_follow_ups_count": follow_ups_count,
        "aging_gt_60_count": aging_count,
    }


def build_team_overdue(cabinet, user, *, scope: Scope, role: str) -> dict[str, Any] | None:
    """
    Overdue open-task counts grouped by assignee.
    Requires team.view. Personal scope returns the caller's bucket only.
    """
    if not has_permission(user, "team.view"):
        return None

    today = timezone.localdate()
    qs = _tasks_overdue_qs(cabinet, user, scope=scope, today=today)

    rows = (
        qs.filter(assigned_to__isnull=False)
        .values(
            "assigned_to_id",
            "assigned_to__first_name",
            "assigned_to__last_name",
            "assigned_to__email",
        )
        .annotate(count=Count("id"))
        .order_by("-count", "assigned_to_id")[:20]
    )
    by_assignee = []
    for row in rows:
        first = (row.get("assigned_to__first_name") or "").strip()
        last = (row.get("assigned_to__last_name") or "").strip()
        name = f"{first} {last}".strip() or (row.get("assigned_to__email") or "Member")
        by_assignee.append(
            {
                "user_id": row["assigned_to_id"],
                "name": name,
                "count": int(row["count"]),
                "href_hint": f"/dashboard/tasks?assigned_to={row['assigned_to_id']}&overdue=1",
            }
        )

    unassigned = qs.filter(assigned_to__isnull=True).count()
    return {
        "by_assignee": by_assignee,
        "unassigned": unassigned,
        "total": qs.count(),
    }


def build_notification_activity(user, *, limit: int = 10) -> list[dict[str, Any]]:
    """Recipient-scoped notification feed — no cross-user leakage."""
    qs = in_app_queryset(
        Notification.objects.filter(recipient=user).select_related(
            "related_case", "related_task", "related_appointment"
        )
    ).order_by("-created_at")[:limit]

    items: list[dict[str, Any]] = []
    for n in qs:
        items.append(
            {
                "icon": "ClipboardList",
                "kind": "notification",
                "title": n.title,
                "message": n.message,
                "ago": "",
                "at": _iso_dt(n.created_at),
                "notification_type": n.notification_type,
                "is_read": n.is_read,
                "action_url": n.action_url or None,
                "entity": {
                    "case_id": n.related_case_id,
                    "task_id": n.related_task_id,
                    "appointment_id": n.related_appointment_id,
                },
            }
        )
    return items


def build_conflict_review_queue(cabinet, user, *, limit: int = 8) -> list[dict[str, Any]] | None:
    """PENDING_REVIEW conflict checks — only if user can run conflict checks."""
    if not (has_permission(user, "cases.view") and has_permission(user, "clients.view")):
        return None

    qs = (
        ConflictCheck.objects.filter(
            cabinet=cabinet,
            status=ConflictCheck.ReviewStatus.PENDING_REVIEW,
        )
        .select_related("matter", "initiated_by")
        .order_by("-created")[:limit]
    )
    out = []
    for c in qs:
        out.append(
            {
                "id": c.id,
                "search_query": c.search_query,
                "result_count": c.result_count,
                "status": c.status,
                "matter_id": c.matter_id,
                "matter_reference": getattr(c.matter, "reference", None) if c.matter_id else None,
                "initiated_by_id": c.initiated_by_id,
                "created": _iso_dt(c.created),
                "href_hint": f"/dashboard/cases?conflict_check={c.id}",
            }
        )
    return out
