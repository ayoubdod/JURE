from datetime import date, datetime
from django.utils.timezone import now
from django.db.models import Count, Q, Max
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAuthenticatedCabinetLawyer  # ⬅️ use your composite perm
from core.utils import get_user_cabinet

# Import your existing models
from cases.models import Case, CaseSession
from users.models import User  # Client is actually User model
from tasks.models import Task
from library.models import Document  # EvidenceItem doesn't exist, using Document
# Optional:
from .models import Announcement, ActivityLog

# ---- helpers ----
def user_cabinet(user):
    return getattr(user, "cabinet", None)

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

# ---- API ----
class DashboardOverview(APIView):
    """
    Single call for the main dashboard boxes.
    It reads other apps, respects the user's cabinet (simple multitenancy),
    and returns JSON matching your frontend needs.
    """
    permission_classes = [IsAuthenticatedCabinetLawyer]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"detail": "User is not attached to any cabinet."}, status=403)

        # --- Stats ---
        total_clients = User.objects.filter(cabinet=cab, is_cabinet_member=False).count()
        active_cases  = Case.objects.filter(cabinet=cab).exclude(status="CLOSED").count()
        tasks_due_today = Task.objects.filter(cabinet=cab, due_date=date.today(), status="todo").count()

        stats = [
            {
                "title": "Total Clients", "value": str(total_clients),
                "change": "+12%", "icon": "Users", "color": "bg-blue-500"
            },
            {
                "title": "Active Cases", "value": str(active_cases),
                "change": "+8%", "icon": "Briefcase", "color": "bg-green-500"
            },
            {
                "title": "Tasks Due", "value": str(tasks_due_today),
                "change": "-3%", "icon": "CheckSquare", "color": "bg-orange-500"
            },
        ]

        # --- Recent Cases (last 6 updated or created) ---
        cases_qs = (
            Case.objects.filter(cabinet=cab)
            .annotate(last_event=Max("casesession__date"))
            .order_by("-last_event", "-id")[:6]
        )
        recent_cases = []
        for c in cases_qs:
            recent_cases.append({
                "id": c.id,
                "title": c.title,
                "client": getattr(c.client, "first_name", str(c.client_id)) if c.client else "No Client",
                "status": c.status,
                "priority": derive_priority_for_case(c),
                "date": (c.last_event or c.created.date() if hasattr(c, "created") else date.today()),
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

        # --- Announcement (pick the latest active, scoped or global) ---
        ann_qs = Announcement.objects.filter(is_active=True).order_by("-created")
        scoped = ann_qs.filter(Q(cabinet=cab) | Q(cabinet__isnull=True)).first()
        announcement = {
            "title": scoped.title if scoped else "Jure Announcement",
            "body":  scoped.body if scoped else "Welcome to Jure! New features are available.",
        }

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

        # --- KPIs snapshot (simple placeholders, compute properly later) ---
        open_high_risk = (
            Case.objects.filter(cabinet=cab, status__in=["OPEN","IN_PROGRESS"])
            .annotate(n_crit=Count("casesession", filter=Q(casesession__type="HEARING")))
            .filter(n_crit__gt=0).count()
        )
        kpis = {
            "wip_aging_gt_60": 5,          # placeholder until billing/WIP exists
            "open_high_risk_matters": open_high_risk,
            "realization_rate": 82,        # %
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
