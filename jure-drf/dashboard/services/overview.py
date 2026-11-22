"""
Role-aware cabinet dashboard overview (P1 backend).

Cabinet is always taken from the authenticated user via get_user_cabinet —
never from request parameters.

Finance (dashboard only): nested only for resolved roles OWNER and ADMIN.
Superuser status alone does not grant finance on this endpoint.

Active clients KPI: counts User rows with cabinet set and
is_cabinet_member=False (same definition as clients ViewSet / legacy
dashboard). clients.Client is the optional fiscal/invoicing profile used by
Finance — not the dashboard headcount.

Date windows (Django current timezone / timezone.localdate()):
- MTD: [month_start 00:00:00, next_month_start 00:00:00) half-open.
- Tasks due today / overdue: local calendar date equality / less-than.
- Upcoming deadlines 7d: inclusive local dates [today, today+7]
  (end-of-day on today+7 via calendar feed bounds).
- MoM %: when previous baseline is 0 → change/growth null,
  change_state=no_previous_data (never invent a %).

Schedule-conflict stubs and SaaS billing KPIs are intentionally omitted.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any, Literal

from django.db.models import Case as OrmCase
from django.db.models import IntegerField, Q, Value, When
from django.utils import timezone

from case_calendar.constants import (
    ST_CASE_DEADLINE,
    ST_CASE_DUE_DATE,
    ST_CONSULTATION_DATE,
)
from case_calendar.services import fetch_unified_calendar_events
from cases.models import Case
from dashboard.kpi import build_stat, calculate_growth, month_bounds, month_date_bounds
from finance.services.dashboard_service import build_dashboard_payload
from finance.services.receivables_service import build_receivables_payload
from library.models import Document
from tasks.models import Appointment, Task
from users.models import User

Scope = Literal["cabinet", "personal"]

TASKS_OPEN_STATUSES = (Task.TaskStatus.TODO, Task.TaskStatus.IN_PROGRESS)

ACTIVE_CASE_EXCLUDED_STATUSES = (
    Case.CaseStatus.CLOSED,
    Case.CaseStatus.ARCHIVED,
    Case.CaseStatus.CANCELLED,
)

CABINET_SCOPE_ROLES = frozenset(
    {
        User.Role.OWNER,
        User.Role.ADMIN,
        User.Role.MANAGER,
        User.Role.VIEWER,
    }
)
PERSONAL_SCOPE_ROLES = frozenset(
    {
        User.Role.LAWYER,
        User.Role.ASSISTANT,
    }
)

DEADLINE_CALENDAR_TYPES = "case_deadline,case_due,consultation_date"


# ---------------------------------------------------------------------------
# Role / scope resolution (server-side only)
# ---------------------------------------------------------------------------

def resolve_dashboard_role(user) -> str:
    """
    Mirror cabinets.permissions ownership fallback: cabinet owner without an
    explicit role is treated as OWNER. Otherwise use user.role, defaulting to
    VIEWER (safest read-only posture).
    """
    if getattr(user, "owned_cabinet", None) is not None:
        return user.role or User.Role.OWNER
    if user.role:
        return user.role
    return User.Role.VIEWER


def resolve_scope(role: str) -> Scope:
    if role in PERSONAL_SCOPE_ROLES:
        return "personal"
    return "cabinet"


def is_finance_authorized(user) -> bool:
    """
    Dashboard finance snapshot: OWNER / ADMIN only (resolved role).

    Does NOT grant access based on is_superuser. The Finance module's own
    IsFinanceAuthorized may still allow superusers on /api/v1/finance/*;
    this dashboard gate follows the approved product matrix exactly.
    """
    role = resolve_dashboard_role(user)
    return role in (User.Role.OWNER, User.Role.ADMIN)


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def _cabinet_clients_qs(cabinet):
    return User.objects.filter(cabinet=cabinet, is_cabinet_member=False)


def _active_cases_base_qs(cabinet):
    return Case.objects.filter(cabinet=cabinet).exclude(status__in=ACTIVE_CASE_EXCLUDED_STATUSES)


def _cases_for_user(cabinet, user, *, scope: Scope):
    qs = Case.objects.filter(cabinet=cabinet)
    if scope == "personal":
        qs = qs.filter(Q(assigned_to=user) | Q(assigned_attorneys=user)).distinct()
    return qs


def _active_cases_qs(cabinet, user, *, scope: Scope):
    qs = _active_cases_base_qs(cabinet)
    if scope == "personal":
        qs = qs.filter(Q(assigned_to=user) | Q(assigned_attorneys=user)).distinct()
    return qs


def _tasks_for_user(cabinet, user, *, scope: Scope):
    qs = Task.objects.filter(cabinet=cabinet)
    if scope == "personal":
        qs = qs.filter(Q(assigned_to=user) | Q(assignees=user)).distinct()
    return qs


def _open_tasks_qs(cabinet, user, *, scope: Scope):
    return _tasks_for_user(cabinet, user, scope=scope).filter(status__in=TASKS_OPEN_STATUSES)


def _tasks_due_today_qs(cabinet, user, *, scope: Scope, today: date):
    return _open_tasks_qs(cabinet, user, scope=scope).filter(due_date=today)


def _tasks_overdue_qs(cabinet, user, *, scope: Scope, today: date):
    return _open_tasks_qs(cabinet, user, scope=scope).filter(due_date__lt=today)


def _appointments_today_qs(cabinet, user, *, scope: Scope, today: date):
    tz = timezone.get_current_timezone()
    day_start = timezone.make_aware(datetime.combine(today, time.min), tz)
    day_end = timezone.make_aware(datetime.combine(today, time.max), tz)
    qs = Appointment.objects.filter(
        cabinet=cabinet,
        start_at__lte=day_end,
        end_at__gte=day_start,
    ).exclude(status=Appointment.Status.CANCELLED)
    if scope == "personal":
        qs = qs.filter(Q(created_by=user) | Q(attendees=user)).distinct()
    return qs.select_related("created_by", "case", "client")


def _priority_rank_annotation():
    return OrmCase(
        When(priority=Task.TaskPriority.HIGH, then=Value(0)),
        When(priority=Task.TaskPriority.MEDIUM, then=Value(1)),
        When(priority=Task.TaskPriority.LOW, then=Value(2)),
        default=Value(3),
        output_field=IntegerField(),
    )


def _iso_dt(dt):
    if not dt:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt.isoformat()


def _format_ago(dt):
    if not dt:
        return ""
    delta = timezone.now() - dt
    s = int(delta.total_seconds())
    if s < 60:
        return f"{s}s ago"
    m = s // 60
    if m < 60:
        return f"{m}m ago"
    h = m // 60
    if h < 24:
        return f"{h}h ago"
    d = h // 24
    return f"{d}d ago"


def _activity_item(*, icon, kind, message, title="", at=None):
    return {
        "icon": icon,
        "kind": kind,
        "title": title or "",
        "message": message,
        "ago": _format_ago(at),
        "at": _iso_dt(at),
    }


def _client_label(client) -> str:
    if not client:
        return "No Client"
    name = (getattr(client, "first_name", None) or "").strip()
    if name:
        return name
    return str(getattr(client, "id", client) or "No Client")


def _serialize_case(c: Case) -> dict[str, Any]:
    return {
        "id": c.id,
        "title": c.title,
        "client": _client_label(c.client),
        "status": c.status,
        "date": (c.created.date() if getattr(c, "created", None) else timezone.localdate()),
    }


def _serialize_task(t: Task) -> dict[str, Any]:
    return {
        "id": t.id,
        "title": t.title,
        "time": "",
        "priority": getattr(t, "priority", "medium"),
        "status": t.status,
        "due_date": t.due_date.isoformat() if t.due_date else None,
    }


def _serialize_appointment(a: Appointment) -> dict[str, Any]:
    return {
        "id": a.id,
        "title": a.title,
        "start_at": _iso_dt(a.start_at),
        "end_at": _iso_dt(a.end_at),
        "status": a.status,
        "meeting_type": a.meeting_type,
        "case_id": a.case_id,
    }


def _serialize_deadline_event(ev: dict[str, Any]) -> dict[str, Any]:
    related = ev.get("relatedCase") or {}
    return {
        "id": ev.get("id"),
        "source_type": ev.get("sourceType"),
        "source_id": ev.get("sourceId"),
        "title": ev.get("title") or "",
        "label": ev.get("label") or "",
        "date": ev.get("date"),
        "status": ev.get("status"),
        "case_id": related.get("id"),
        "case_reference": related.get("reference"),
    }


# ---------------------------------------------------------------------------
# Calendar aggregation (unified feed + personal filter + dedupe)
# ---------------------------------------------------------------------------

def _personal_case_ids(cabinet, user) -> set[int]:
    return set(
        Case.objects.filter(cabinet=cabinet)
        .filter(Q(assigned_to=user) | Q(assigned_attorneys=user))
        .values_list("id", flat=True)
        .distinct()
    )


def _deadline_event_for_user(ev: dict[str, Any], user, personal_case_ids: set[int]) -> bool:
    related = ev.get("relatedCase") or {}
    case_id = related.get("id")
    if case_id is not None and int(case_id) in personal_case_ids:
        return True
    assigned = ev.get("assignedTo") or {}
    return assigned.get("id") == user.id


def _dedupe_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, Any]] = []
    for ev in events:
        key = (str(ev.get("sourceType") or ""), str(ev.get("sourceId") or ev.get("id") or ""))
        if key in seen:
            continue
        seen.add(key)
        out.append(ev)
    return out


def _upcoming_deadline_events(
    user, *, cabinet, scope: Scope, today: date, days: int = 7
) -> list[dict[str, Any]]:
    end = today + timedelta(days=days)
    date_from = today.isoformat()
    date_to = end.isoformat()
    raw = fetch_unified_calendar_events(
        user,
        date_from,
        date_to,
        DEADLINE_CALENDAR_TYPES,
    )
    deadline_types = {ST_CASE_DEADLINE, ST_CASE_DUE_DATE, ST_CONSULTATION_DATE}
    filtered = [ev for ev in raw if ev.get("sourceType") in deadline_types]
    if scope == "personal":
        personal_ids = _personal_case_ids(cabinet, user)
        filtered = [
            ev for ev in filtered if _deadline_event_for_user(ev, user, personal_ids)
        ]
    return _dedupe_events(filtered)


# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------

def _kpi_entry(value: int, *, previous: int | None = None, with_growth: bool = False) -> dict[str, Any]:
    if with_growth and previous is not None:
        growth = calculate_growth(value, previous)
        return {
            "value": value,
            "change": growth["change"],
            "change_state": growth["change_state"],
            "previous": previous,
            "growth": growth["growth"],
        }
    return {
        "value": value,
        "change": None,
        "change_state": "no_previous_data",
        "previous": previous,
        "growth": None,
    }


def build_kpi_block(cabinet, user, *, scope: Scope) -> dict[str, Any]:
    _, current_month_start, _ = month_bounds()
    prev_month_start_d, current_month_start_d, next_month_start_d = month_date_bounds()
    today = timezone.localdate()

    clients_qs = _cabinet_clients_qs(cabinet)
    active_clients = clients_qs.count()
    clients_previous = clients_qs.filter(date_joined__lt=current_month_start).count()

    active_qs = _active_cases_qs(cabinet, user, scope=scope)
    active_cases = active_qs.count()
    active_cases_previous = active_qs.filter(created__lt=current_month_start).count()

    cases_scope_qs = _cases_for_user(cabinet, user, scope=scope)
    _, _, next_month_start_dt = month_bounds()
    cases_opened_mtd = cases_scope_qs.filter(
        created__gte=current_month_start,
        created__lt=next_month_start_dt,
    ).count()
    cases_closed_mtd = cases_scope_qs.filter(
        status=Case.CaseStatus.CLOSED,
        modified__gte=current_month_start,
        modified__lt=next_month_start_dt,
    ).count()

    tasks_due_today = _tasks_due_today_qs(cabinet, user, scope=scope, today=today).count()
    tasks_overdue = _tasks_overdue_qs(cabinet, user, scope=scope, today=today).count()

    open_tasks = _open_tasks_qs(cabinet, user, scope=scope)
    tasks_due_current_month = open_tasks.filter(
        due_date__gte=current_month_start_d,
        due_date__lt=next_month_start_d,
    ).count()
    tasks_due_previous_month = open_tasks.filter(
        due_date__gte=prev_month_start_d,
        due_date__lt=current_month_start_d,
    ).count()
    tasks_mom = calculate_growth(tasks_due_current_month, tasks_due_previous_month)

    upcoming = _upcoming_deadline_events(
        user, cabinet=cabinet, scope=scope, today=today, days=7
    )

    return {
        "active_cases": _kpi_entry(
            active_cases, previous=active_cases_previous, with_growth=True
        ),
        "cases_opened_mtd": _kpi_entry(cases_opened_mtd),
        "cases_closed_mtd": _kpi_entry(cases_closed_mtd),
        "tasks_due_today": {
            "value": tasks_due_today,
            "change": tasks_mom["change"],
            "change_state": tasks_mom["change_state"],
            "previous": tasks_due_previous_month,
            "growth": tasks_mom["growth"],
            "period_current": tasks_due_current_month,
            "period_previous": tasks_due_previous_month,
        },
        "tasks_overdue": _kpi_entry(tasks_overdue),
        "upcoming_deadlines_7d": _kpi_entry(len(upcoming)),
        "active_clients": _kpi_entry(
            active_clients, previous=clients_previous, with_growth=True
        ),
    }


def build_legacy_stats(kpis: dict[str, Any]) -> list[dict[str, Any]]:
    """Preserve P0 `stats[]` shape for current frontend compatibility."""
    clients = kpis["active_clients"]
    active = kpis["active_cases"]
    tasks = kpis["tasks_due_today"]
    return [
        build_stat(
            title="Total Clients",
            icon="Users",
            color="bg-blue-500",
            current=clients["value"],
            previous=clients.get("previous") or 0,
        ),
        build_stat(
            title="Active Cases",
            icon="Briefcase",
            color="bg-green-500",
            current=active["value"],
            previous=active.get("previous") or 0,
        ),
        {
            "title": "Tasks Due",
            "value": str(tasks["value"]),
            "change": tasks.get("change"),
            "change_state": tasks.get("change_state") or "no_previous_data",
            "icon": "CheckSquare",
            "color": "bg-orange-500",
            "current": tasks["value"],
            "previous": tasks.get("period_previous"),
            "growth": tasks.get("growth"),
            "period_current": tasks.get("period_current"),
            "period_previous": tasks.get("period_previous"),
        },
    ]


def build_dashboard_stats(cabinet):
    """Cabinet-wide legacy stats helper (OWNER-equivalent). Used by existing KPI tests."""
    _, current_month_start, _ = month_bounds()
    prev_month_start_d, current_month_start_d, next_month_start_d = month_date_bounds()
    today = timezone.localdate()

    clients_qs = _cabinet_clients_qs(cabinet)
    total_clients = clients_qs.count()
    clients_previous = clients_qs.filter(date_joined__lt=current_month_start).count()

    active_qs = _active_cases_base_qs(cabinet)
    active_cases = active_qs.count()
    active_cases_previous = active_qs.filter(created__lt=current_month_start).count()

    tasks_due_today = Task.objects.filter(
        cabinet=cabinet, due_date=today, status__in=TASKS_OPEN_STATUSES
    ).count()
    tasks_due_current_month = Task.objects.filter(
        cabinet=cabinet,
        status__in=TASKS_OPEN_STATUSES,
        due_date__gte=current_month_start_d,
        due_date__lt=next_month_start_d,
    ).count()
    tasks_due_previous_month = Task.objects.filter(
        cabinet=cabinet,
        status__in=TASKS_OPEN_STATUSES,
        due_date__gte=prev_month_start_d,
        due_date__lt=current_month_start_d,
    ).count()
    tasks_mom = calculate_growth(tasks_due_current_month, tasks_due_previous_month)
    return [
        build_stat(
            title="Total Clients",
            icon="Users",
            color="bg-blue-500",
            current=total_clients,
            previous=clients_previous,
        ),
        build_stat(
            title="Active Cases",
            icon="Briefcase",
            color="bg-green-500",
            current=active_cases,
            previous=active_cases_previous,
        ),
        {
            "title": "Tasks Due",
            "value": str(tasks_due_today),
            "change": tasks_mom["change"],
            "change_state": tasks_mom["change_state"],
            "icon": "CheckSquare",
            "color": "bg-orange-500",
            "current": tasks_due_today,
            "previous": tasks_due_previous_month,
            "growth": tasks_mom["growth"],
            "period_current": tasks_due_current_month,
            "period_previous": tasks_due_previous_month,
        },
    ]


# ---------------------------------------------------------------------------
# Attention / My Day / activity / finance
# ---------------------------------------------------------------------------

def build_attention(cabinet, user, *, scope: Scope) -> list[dict[str, Any]]:
    today = timezone.localdate()
    items: list[dict[str, Any]] = []

    for t in (
        _tasks_overdue_qs(cabinet, user, scope=scope, today=today)
        .annotate(_priority_rank=_priority_rank_annotation())
        .order_by("_priority_rank", "due_date", "id")[:8]
    ):
        items.append(
            {
                "id": f"task-overdue-{t.id}",
                "kind": "task_overdue",
                "title": t.title,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "entity": {"type": "task", "id": t.id},
                "href_hint": "/dashboard/tasks",
            }
        )

    for t in (
        _tasks_due_today_qs(cabinet, user, scope=scope, today=today)
        .annotate(_priority_rank=_priority_rank_annotation())
        .order_by("_priority_rank", "id")[:8]
    ):
        items.append(
            {
                "id": f"task-due-today-{t.id}",
                "kind": "task_due_today",
                "title": t.title,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "entity": {"type": "task", "id": t.id},
                "href_hint": "/dashboard/tasks",
            }
        )

    for a in _appointments_today_qs(cabinet, user, scope=scope, today=today).order_by("start_at")[:8]:
        items.append(
            {
                "id": f"appointment-today-{a.id}",
                "kind": "appointment_today",
                "title": a.title,
                "due_date": a.start_at.date().isoformat() if a.start_at else today.isoformat(),
                "entity": {"type": "appointment", "id": a.id},
                "href_hint": "/dashboard/appointments",
            }
        )

    for ev in _upcoming_deadline_events(
        user, cabinet=cabinet, scope=scope, today=today, days=3
    )[:8]:
        items.append(
            {
                "id": f"deadline-{ev.get('id')}",
                "kind": "deadline_upcoming",
                "title": ev.get("title") or ev.get("label") or "Deadline",
                "due_date": (ev.get("date") or "")[:10] or None,
                "entity": {
                    "type": "deadline",
                    "id": ev.get("sourceId"),
                    "source_type": ev.get("sourceType"),
                },
                "href_hint": "/dashboard/calendar",
            }
        )

    return items[:20]


def build_my_day(cabinet, user, *, scope: Scope) -> dict[str, Any]:
    today = timezone.localdate()
    appointments = [
        _serialize_appointment(a)
        for a in _appointments_today_qs(cabinet, user, scope=scope, today=today).order_by("start_at")[:10]
    ]
    tasks_due = [
        _serialize_task(t)
        for t in (
            _tasks_due_today_qs(cabinet, user, scope=scope, today=today)
            .annotate(_priority_rank=_priority_rank_annotation())
            .order_by("_priority_rank", "id")[:10]
        )
    ]
    tasks_overdue = [
        _serialize_task(t)
        for t in (
            _tasks_overdue_qs(cabinet, user, scope=scope, today=today)
            .annotate(_priority_rank=_priority_rank_annotation())
            .order_by("_priority_rank", "due_date", "id")[:10]
        )
    ]
    deadlines = [
        _serialize_deadline_event(ev)
        for ev in _upcoming_deadline_events(
            user, cabinet=cabinet, scope=scope, today=today, days=7
        )[:10]
    ]
    return {
        "appointments_today": appointments,
        "tasks_due_today": tasks_due,
        "tasks_overdue": tasks_overdue,
        "upcoming_deadlines": deadlines,
    }


def build_recent_cases(cabinet, user, *, scope: Scope, limit: int = 3) -> list[dict[str, Any]]:
    qs = _cases_for_user(cabinet, user, scope=scope).select_related("client").order_by(
        "-created", "-id"
    )[:limit]
    return [_serialize_case(c) for c in qs]


def build_recent_activity(
    cabinet,
    user=None,
    *,
    scope: Scope = "cabinet",
    limit: int = 10,
) -> list[dict[str, Any]]:
    """
    P2: prefer the authenticated user's notification feed (recipient-scoped).
    Falls back to legacy cabinet ActivityLog only for cabinet-scoped roles when
    the notification feed is empty. Personal scope never uses cabinet-wide logs.
    """
    if user is not None:
        from dashboard.services.overview_p2 import build_notification_activity

        notif = build_notification_activity(user, limit=limit)
        if notif:
            return notif
        if scope == "personal":
            return []

    from dashboard.models import ActivityLog

    stream: list[dict[str, Any]] = []
    for a in ActivityLog.objects.filter(cabinet=cabinet).order_by("-created")[:10]:
        stream.append(
            _activity_item(
                icon="CheckSquare",
                kind="log",
                message=a.message,
                at=a.created,
            )
        )
    if len(stream) < limit:
        for t in Task.objects.filter(cabinet=cabinet, status=Task.TaskStatus.DONE).order_by(
            "-modified"
        )[:5]:
            stream.append(
                _activity_item(
                    icon="CheckSquare",
                    kind="task_completed",
                    title=t.title,
                    message=f"Task completed: {t.title}",
                    at=getattr(t, "modified", None),
                )
            )
        for cl in User.objects.filter(cabinet=cabinet, is_cabinet_member=False).order_by("-id")[:5]:
            name = (getattr(cl, "first_name", None) or "").strip() or "Client"
            stream.append(
                _activity_item(
                    icon="Users",
                    kind="client_added",
                    title=name,
                    message=f"New client added: {name} ",
                    at=getattr(cl, "date_joined", None),
                )
            )
        for d in Document.objects.filter(cabinet=cabinet).order_by("-created")[:5]:
            stream.append(
                _activity_item(
                    icon="ClipboardList",
                    kind="document_uploaded",
                    title=d.title,
                    message=f"Document uploaded: {d.title}",
                    at=d.created,
                )
            )
    return stream[:limit]


def build_finance_snapshot(cabinet) -> dict[str, Any]:
    """Practice finance only — never SaaS subscription metrics."""
    year = timezone.localdate().year
    payload = build_dashboard_payload(cabinet, "month", year)
    receivables = build_receivables_payload(cabinet)
    kpis = payload.get("kpis") or {}
    return {
        "period": "month",
        "year": year,
        "invoiced": kpis.get("total_ca_ttc", kpis.get("ca_total", 0)),
        "collected": kpis.get("total_collected", kpis.get("total_received", 0)),
        "outstanding": receivables.get("total_outstanding", kpis.get("total_outstanding", 0)),
        "overdue": receivables.get("total_overdue", kpis.get("total_overdue", 0)),
        "currency": "MAD",
    }


def build_tools_hints(*, juria_enabled: bool = False) -> dict[str, Any]:
    enabled = bool(juria_enabled)
    return {
        "juria_enabled": enabled,
        "juria_path": "/dashboard/juria",
        "juria_briefing": enabled,
        "juria_ask": enabled,
        "deadline_calculator": True,
        "conflict_check": True,
        "research_notes_path": "/dashboard/notes",
    }


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

def build_overview_payload(
    *,
    user,
    cabinet,
    request=None,
    juria_enabled: bool = False,
    use_cache: bool = True,
) -> dict[str, Any]:
    role = resolve_dashboard_role(user)
    scope = resolve_scope(role)

    if use_cache:
        from dashboard.services.overview_cache import (
            get_cached_overview,
            make_overview_cache_key,
            set_cached_overview,
        )

        cache_key = make_overview_cache_key(
            cabinet_id=cabinet.id,
            user_id=user.id,
            scope=scope,
            juria_enabled=bool(juria_enabled),
        )
        # Allow clients to bypass: ?fresh=1 or Cache-Control: no-cache
        bypass = False
        if request is not None:
            fresh = str(getattr(request, "query_params", {}).get("fresh") or "").lower()
            bypass = fresh in ("1", "true", "yes")
            cc = (request.META.get("HTTP_CACHE_CONTROL") or "").lower()
            if "no-cache" in cc or "no-store" in cc:
                bypass = True
        if not bypass:
            hit = get_cached_overview(cache_key)
            if hit is not None:
                return hit

    today = timezone.localdate()
    _, current_month_start, next_month_start = month_bounds()

    kpis = build_kpi_block(cabinet, user, scope=scope)
    legacy_stats = build_legacy_stats(kpis)

    announcement = None
    if request is not None:
        from dashboard.announcements import (
            get_dismissed_announcement_ids,
            serialize_announcement,
        )
        from dashboard.models import Announcement

        dismissed_ids = get_dismissed_announcement_ids(request)
        scoped = Announcement.pick_for_cabinet(cabinet, exclude_ids=dismissed_ids)
        announcement = serialize_announcement(scoped, request=request) if scoped else None

    finance = None
    if is_finance_authorized(user):
        finance = build_finance_snapshot(cabinet)

    today_tasks = [
        _serialize_task(t)
        for t in (
            _tasks_due_today_qs(cabinet, user, scope=scope, today=today)
            .annotate(_priority_rank=_priority_rank_annotation())
            .order_by("_priority_rank", "id")[:6]
        )
    ]

    from dashboard.services.overview_p2 import (
        AGING_GT_60_DAYS,
        CLIENT_FOLLOW_UP_DAYS,
        STALE_MATTER_DAYS,
        build_conflict_review_queue,
        build_crm_heuristics,
        build_portfolio,
        build_team_overdue,
    )

    portfolio = build_portfolio(cabinet, user, scope=scope)
    crm = build_crm_heuristics(cabinet, user, scope=scope)
    team = build_team_overdue(cabinet, user, scope=scope, role=role)
    conflict_review_queue = build_conflict_review_queue(cabinet, user)

    payload = {
        "meta": {
            "role": role,
            "scope": scope,
            "cabinet_id": cabinet.id,
            "as_of": _iso_dt(timezone.now()),
            "period": {
                "month_start": current_month_start.date().isoformat()
                if hasattr(current_month_start, "date")
                else str(current_month_start)[:10],
                "month_end": (next_month_start - timedelta(seconds=1)).date().isoformat()
                if hasattr(next_month_start, "date")
                else str(next_month_start)[:10],
            },
        },
        # Legacy P0 fields (current frontend)
        "stats": legacy_stats,
        "announcement": announcement,
        "recent_cases": build_recent_cases(cabinet, user, scope=scope),
        "today_tasks": today_tasks,
        "recent_activity": build_recent_activity(
            cabinet, user, scope=scope
        ),
        # P1 structured KPIs + P2 aging count (real, not invented).
        "kpis": {
            **kpis,
            "wip_aging_gt_60": {
                "value": int(crm.get("aging_gt_60_count") or 0),
                "change": None,
                "change_state": "no_previous_data",
                "previous": None,
                "growth": None,
            },
            "open_high_risk_matters": None,
            "realization_rate": None,
        },
        "attention": build_attention(cabinet, user, scope=scope),
        "my_day": build_my_day(cabinet, user, scope=scope),
        "finance": finance,
        "tools": build_tools_hints(juria_enabled=juria_enabled),
        # P2
        "portfolio": portfolio,
        "crm": crm,
        "team": team,
        "conflict_review_queue": conflict_review_queue,
        "definitions": {
            "active_clients": (
                "User rows with this cabinet and is_cabinet_member=False "
                "(matter CRM identity). Not clients.Client fiscal profiles."
            ),
            "upcoming_deadlines_7d": (
                "Inclusive local dates today through today+7 "
                "(calendar feed end-of-day on the 7th day ahead)."
            ),
            "mtd": (
                "Half-open [month_start, next_month_start) in the active Django timezone."
            ),
            "active_cases_mom": (
                "current=stock of non-terminal cases now; "
                "previous=subset of those still-active cases created before month_start. "
                "Not a historical point-in-time snapshot."
            ),
            "stale_matters": (
                f"Active cases with modified older than {STALE_MATTER_DAYS} days "
                "(scope-aware)."
            ),
            "client_follow_ups": (
                f"Cabinet clients whose latest case activity (or date_joined) "
                f"is older than {CLIENT_FOLLOW_UP_DAYS} days."
            ),
            "wip_aging_gt_60": (
                f"Count of active cases with modified older than {AGING_GT_60_DAYS} days."
            ),
            "activity": (
                "Prefers recipient notification feed; cabinet ActivityLog fallback "
                "only when notifications are empty and scope is cabinet."
            ),
            "overview_cache": (
                "Short-lived cabinet/user overview cache (Redis when available) "
                "with write-triggered invalidation; bypass with ?fresh=1."
            ),
        },
    }
    if use_cache:
        from dashboard.services.overview_cache import (
            make_overview_cache_key,
            set_cached_overview,
        )

        set_cached_overview(
            make_overview_cache_key(
                cabinet_id=cabinet.id,
                user_id=user.id,
                scope=scope,
                juria_enabled=bool(juria_enabled),
            ),
            payload,
        )
    return payload
