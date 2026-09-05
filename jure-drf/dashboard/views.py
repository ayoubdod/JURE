from datetime import date

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsCabinetMember
from core.utils import get_user_cabinet

# Import your existing models
from cases.models import Case
from users.models import User  # Client is actually User model
from tasks.models import Task
from library.models import Document  # EvidenceItem doesn't exist, using Document
# Optional:
from .announcements import (
    get_dismissed_announcement_ids,
    dismiss_announcement_in_session,
    serialize_announcement,
)
from .models import Announcement, ActivityLog
from .kpi import build_stat, calculate_growth, month_bounds, month_date_bounds

# ---- helpers ----
def format_ago(dt):
    if not dt: return ""
    delta = now() - dt
    s = int(delta.total_seconds())
    if s < 60: return f"{s}s ago"
    m = s//60
    if m < 60: return f"{m}m ago"
    h = m//60
    if h < 24: return f"{h}h ago"
    d = h//24
    return f"{d}d ago"

def derive_priority_for_case(case):
    # Take most urgent session priority if exists
    latest = case.casesession_set.order_by("-date").first()
    return getattr(latest, "type", "HEARING") if latest else "HEARING"


def _cabinet_clients_qs(cab):
    """Clients for a cabinet: User rows with is_cabinet_member=False (existing definition)."""
    return User.objects.filter(cabinet=cab, is_cabinet_member=False)


def _active_cases_qs(cab):
    """Active cases: existing dashboard definition — exclude CLOSED only."""
    return Case.objects.filter(cabinet=cab).exclude(status=Case.CaseStatus.CLOSED)


def _tasks_due_today_qs(cab, today: date):
    """Tasks due: existing dashboard definition — due today and status=todo."""
    return Task.objects.filter(cabinet=cab, due_date=today, status=Task.TaskStatus.TODO)


def build_dashboard_stats(cab):
    """
    Real month-over-month KPI stats for one cabinet (COUNT queries only).

    Clients / active cases: stock MoM using creation timestamps
      current  = total matching definition now
      previous = subset that existed before the current calendar month

    Tasks due: keep displayed value as due-today (todo); MoM % compares
      todo tasks with due_date in the current calendar month vs previous month.
    """
    _, current_month_start, _ = month_bounds()
    prev_month_start_d, current_month_start_d, next_month_start_d = month_date_bounds()
    today = timezone.localdate()

    clients_qs = _cabinet_clients_qs(cab)
    total_clients = clients_qs.count()
    clients_previous = clients_qs.filter(date_joined__lt=current_month_start).count()

    active_qs = _active_cases_qs(cab)
    active_cases = active_qs.count()
    active_cases_previous = active_qs.filter(created__lt=current_month_start).count()

    # Card value keeps existing "due today + todo" definition.
    tasks_due_today = _tasks_due_today_qs(cab, today).count()
    # MoM % uses todo tasks scheduled in each calendar month (due_date).
    tasks_due_current_month = Task.objects.filter(
        cabinet=cab,
        status=Task.TaskStatus.TODO,
        due_date__gte=current_month_start_d,
        due_date__lt=next_month_start_d,
    ).count()
    tasks_due_previous_month = Task.objects.filter(
        cabinet=cab,
        status=Task.TaskStatus.TODO,
        due_date__gte=prev_month_start_d,
        due_date__lt=current_month_start_d,
    ).count()
    tasks_mom = calculate_growth(tasks_due_current_month, tasks_due_previous_month)
    tasks_stat = {
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
    }

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
        tasks_stat,
    ]

# ---- API ----
class DashboardOverview(APIView):
    """
    Single call for the main dashboard boxes.
    It reads other apps, respects the user's cabinet (simple multitenancy),
    and returns JSON matching your frontend needs.
    """
    # Match clients/cases/tasks: cabinet membership is enough (no LawyerProfile required).
    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)

        # --- Stats (real MoM growth; cabinet-scoped COUNT queries) ---
        stats = build_dashboard_stats(cab)

        # --- Recent Cases (last 3 added / created) ---
        cases_qs = (
            Case.objects.filter(cabinet=cab)
            .order_by("-created", "-id")[:3]
        )
        recent_cases = []
        for c in cases_qs:
            recent_cases.append({
                "id": c.id,
                "title": c.title,
                "client": getattr(c.client, "first_name", str(c.client_id)) if c.client else "No Client",
                "status": c.status,
                "priority": derive_priority_for_case(c),
                "date": (c.created.date() if getattr(c, "created", None) else date.today()),
            })

        # --- Today's Tasks (top 6) ---
        today_tasks_qs = Task.objects.filter(cabinet=cab, due_date=date.today()).order_by("id")[:6]
        today_tasks = []
        for t in today_tasks_qs:
            today_tasks.append({
                "id": t.id,
                "title": t.title,
                "time": "",  # Task model doesn't have due_time field
                "priority": getattr(t, "priority", "medium"),
            })

        # --- Announcement (best active, cabinet-targeted; no fake fallback) ---
        dismissed_ids = get_dismissed_announcement_ids(request)
        scoped = Announcement.pick_for_cabinet(cab, exclude_ids=dismissed_ids)
        announcement = serialize_announcement(scoped, request=request) if scoped else None

        # --- Recent Activity stream (mix manual & inferred) ---
        stream = []
        # manual ActivityLog first
        for a in ActivityLog.objects.filter(cabinet=cab).order_by("-created")[:10]:
            stream.append({"icon": "CheckSquare", "message": a.message, "ago": format_ago(a.created)})

        # if stream not enough, infer from other tables
        if len(stream) < 10:
            # recent tasks completed
            done_tasks = Task.objects.filter(cabinet=cab, status="done").order_by("-modified")[:5]
            for t in done_tasks:
                stream.append({"icon": "CheckSquare",
                               "message": f"Task completed: {t.title}",
                               "ago": format_ago(getattr(t, "modified", None))})
            # recent clients
            new_clients = User.objects.filter(cabinet=cab, is_cabinet_member=False).order_by("-id")[:5]
            for cl in new_clients:
                stream.append({"icon": "Users",
                               "message": f"New client added: {getattr(cl, 'first_name', 'Client')} ",
                               "ago": "today"})
            # recent document uploads
            docs = Document.objects.filter(cabinet=cab).order_by("-created")[:5]
            for d in docs:
                stream.append({"icon": "ClipboardList",
                               "message": f"Document uploaded: {d.title}",
                               "ago": format_ago(d.created)})

        # --- KPIs snapshot (omit invented metrics until billing/WIP exists) ---
        open_high_risk = (
            Case.objects.filter(cabinet=cab, status__in=["OPEN","IN_PROGRESS"])
            .annotate(n_crit=Count("casesession", filter=Q(casesession__type="HEARING")))
            .filter(n_crit__gt=0).count()
        )
        kpis = {
            "wip_aging_gt_60": None,
            "open_high_risk_matters": open_high_risk,
            "realization_rate": None,
        }

        # --- Build response ---
        return Response({
            "stats": stats,
            "announcement": announcement,
            "recent_cases": recent_cases,
            "today_tasks": today_tasks,
            "recent_activity": stream[:10],
            "kpis": kpis,
        })


class AnnouncementListView(APIView):
    """GLOBAL + current cabinet jurisdiction announcements. Backend-enforced."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        dismissed_ids = get_dismissed_announcement_ids(request)
        qs = Announcement.active_for_cabinet(cab, exclude_ids=dismissed_ids)
        return Response([serialize_announcement(item, request=request) for item in qs])


class AnnouncementDetailView(APIView):
    """Object-level: a Morocco user cannot retrieve a Qatar announcement by ID."""

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def get(self, request, announcement_id: int):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)
        announcement = Announcement.active_for_cabinet(cab).filter(pk=announcement_id).first()
        if not announcement:
            return Response({"detail": "Announcement not found."}, status=404)
        return Response(serialize_announcement(announcement, request=request))


class AnnouncementDismissView(APIView):
    """
    Hide an announcement for the current connection/session only.

    Dismissal is stored on the Django session — it does NOT permanently
    hide the announcement for the user or cabinet. A new login/session
    will show the announcement again if it is still active.
    """

    permission_classes = [IsAuthenticated, IsCabinetMember]

    def post(self, request, announcement_id: int):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)

        announcement = Announcement.active_for_cabinet(cab).filter(pk=announcement_id).first()
        if announcement is None:
            # Do not leak existence of other cabinets' announcements.
            return Response({"detail": "Announcement not found."}, status=404)

        dismiss_announcement_in_session(request, announcement.id)
        return Response({"detail": "Announcement hidden for this session."}, status=200)
