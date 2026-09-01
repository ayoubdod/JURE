"""Admin home dashboard data. Only real counts from existing models."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Sum
from django.urls import NoReverseMatch, reverse
from django.utils import timezone
from django.utils.timesince import timesince
from django.utils.translation import gettext as _


def _month_bounds(now):
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 1:
        prev_start = start.replace(year=start.year - 1, month=12)
    else:
        prev_start = start.replace(month=start.month - 1)
    return prev_start, start


def _pct_change(current, previous):
    try:
        current = float(current or 0)
        previous = float(previous or 0)
    except (TypeError, ValueError):
        return None
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


def _format_int(value) -> str:
    return f"{int(value or 0):,}".replace(",", " ")


def _format_money(value) -> str:
    amount = Decimal(value or 0)
    quantized = amount.quantize(Decimal("0.01"))
    formatted = f"{quantized:,.2f}".replace(",", " ")
    return f"{formatted} MAD"


def _safe_admin_url(name: str, args=None) -> str | None:
    try:
        return reverse(name, args=args or ())
    except NoReverseMatch:
        return None


def _greeting(now) -> str:
    hour = now.hour
    if hour < 12:
        return _("Good morning")
    if hour < 18:
        return _("Good afternoon")
    return _("Good evening")


def _display_name(user) -> str:
    full = (user.get_full_name() or "").strip()
    if full:
        return full
    return user.get_username() or user.email or _("Admin")


def _initials(user) -> str:
    if user is None:
        return "J"
    first = (getattr(user, "first_name", "") or "").strip()
    last = (getattr(user, "last_name", "") or "").strip()
    if first and last:
        return f"{first[0]}{last[0]}".upper()
    name = _display_name(user)
    return (name[:1] or "J").upper()


def _avatar_url(user) -> str | None:
    image = getattr(user, "image", None)
    if not image:
        return None
    try:
        url = image.url
    except (ValueError, OSError):
        return None
    return url or None


def _kpi(*, label, value, icon, url, current=None, previous=None, hint=None):
    change = _pct_change(current, previous) if current is not None else None
    item = {
        "label": label,
        "value": value,
        "icon": icon,
        "url": url,
        "hint": hint,
        "change": None,
        "change_positive": None,
    }
    if change is not None:
        sign = "+" if change > 0 else ""
        item["change"] = f"{sign}{change}%"
        item["change_positive"] = change >= 0
    return item


def _period_count(qs, field, start, end):
    return qs.filter(**{f"{field}__gte": start, f"{field}__lt": end}).count()


def _build_kpis(now, prev_start, this_start):
    from cabinets.models import Cabinet
    from cases.models import Case
    from finance.models import Payment
    from juria.models import JuriaUsage
    from library.models import Document
    from users.models import User

    users_total = User.objects.count()
    users_this = _period_count(User.objects.all(), "date_joined", this_start, now)
    users_prev = _period_count(User.objects.all(), "date_joined", prev_start, this_start)

    cabinets_total = Cabinet.objects.count()
    cabinets_this = _period_count(Cabinet.objects.all(), "created", this_start, now)
    cabinets_prev = _period_count(Cabinet.objects.all(), "created", prev_start, this_start)

    active_statuses = (
        Case.CaseStatus.OPEN,
        Case.CaseStatus.IN_PROGRESS,
        Case.CaseStatus.PENDING,
    )
    cases_active = Case.objects.filter(status__in=active_statuses).count()
    cases_this = _period_count(Case.objects.all(), "created", this_start, now)
    cases_prev = _period_count(Case.objects.all(), "created", prev_start, this_start)

    documents_total = Document.objects.count()
    documents_this = _period_count(Document.objects.all(), "created", this_start, now)
    documents_prev = _period_count(Document.objects.all(), "created", prev_start, this_start)

    paid = Payment.objects.filter(status=Payment.Status.CONFIRMED)
    revenue_this = paid.filter(payment_date__gte=this_start.date(), payment_date__lte=now.date()).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    revenue_prev = paid.filter(
        payment_date__gte=prev_start.date(),
        payment_date__lt=this_start.date(),
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    this_usage = JuriaUsage.objects.filter(year=now.year, month=now.month).aggregate(
        messages=Sum("total_messages"),
        tokens=Sum("total_tokens"),
    )
    prev_month = prev_start.month
    prev_year = prev_start.year
    prev_usage = JuriaUsage.objects.filter(year=prev_year, month=prev_month).aggregate(
        messages=Sum("total_messages"),
        tokens=Sum("total_tokens"),
    )
    messages_this = this_usage["messages"] or 0
    tokens_this = this_usage["tokens"] or 0
    messages_prev = prev_usage["messages"] or 0

    return [
        _kpi(
            label=_("Total Users"),
            value=_format_int(users_total),
            icon="group",
            url=_safe_admin_url("admin:users_user_changelist"),
            current=users_this,
            previous=users_prev,
        ),
        _kpi(
            label=_("Cabinets"),
            value=_format_int(cabinets_total),
            icon="apartment",
            url=_safe_admin_url("admin:cabinets_cabinet_changelist"),
            current=cabinets_this,
            previous=cabinets_prev,
        ),
        _kpi(
            label=_("Active Cases"),
            value=_format_int(cases_active),
            icon="folder_open",
            url=_safe_admin_url("admin:cases_case_changelist"),
            current=cases_this,
            previous=cases_prev,
        ),
        _kpi(
            label=_("Documents"),
            value=_format_int(documents_total),
            icon="menu_book",
            url=_safe_admin_url("admin:library_document_changelist"),
            current=documents_this,
            previous=documents_prev,
        ),
        _kpi(
            label=_("Revenue"),
            value=_format_money(revenue_this),
            icon="payments",
            url=_safe_admin_url("admin:finance_payment_changelist"),
            current=float(revenue_this),
            previous=float(revenue_prev),
            hint=_("Confirmed payments this month"),
        ),
        _kpi(
            label=_("AI Usage"),
            value=_format_int(messages_this),
            icon="auto_awesome",
            url=_safe_admin_url("admin:juria_juriausage_changelist"),
            current=messages_this,
            previous=messages_prev,
            hint=_("%(tokens)s tokens this month") % {"tokens": _format_int(tokens_this)},
        ),
    ]


def _activity_url(entity_type: str, entity_id: str) -> str | None:
    mapping = {
        "cabinet": "admin:cabinets_cabinet_change",
        "cabinets.cabinet": "admin:cabinets_cabinet_change",
        "user": "admin:users_user_change",
        "users.user": "admin:users_user_change",
        "case": "admin:cases_case_change",
        "cases.case": "admin:cases_case_change",
        "document": "admin:library_document_change",
        "library.document": "admin:library_document_change",
        "announcement": "admin:dashboard_announcement_change",
        "dashboard.announcement": "admin:dashboard_announcement_change",
        "invoice": "admin:finance_invoice_change",
        "finance.invoice": "admin:finance_invoice_change",
        "payment": "admin:finance_payment_change",
        "client": "admin:clients_client_change",
    }
    name = mapping.get((entity_type or "").strip().lower())
    if not name or not entity_id:
        return None
    return _safe_admin_url(name, args=[entity_id])


def _activity_item(*, message, when, actor=None, url=None, kind=""):
    return {
        "message": message,
        "when": when,
        "when_label": timesince(when),
        "actor_name": _display_name(actor) if actor else _("System"),
        "initials": _initials(actor),
        "avatar": _avatar_url(actor),
        "url": url,
        "kind": kind,
    }


def _build_activity(now, limit=12):
    from cabinets.models import Cabinet
    from cases.models import Case
    from dashboard.models import ActivityLog, Announcement
    from library.models import Document
    from users.models import User

    items = []

    logs = ActivityLog.objects.select_related("actor", "cabinet").order_by("-created")[:limit]
    for log in logs:
        items.append(
            _activity_item(
                message=log.message or log.kind or _("Activity"),
                when=log.created,
                actor=log.actor,
                url=_activity_url(log.entity_type, log.entity_id),
                kind=log.kind,
            )
        )

    for cabinet in Cabinet.objects.select_related("owner").order_by("-created")[:8]:
        items.append(
            _activity_item(
                message=_("Cabinet “%(name)s” was created") % {"name": cabinet.trade_name},
                when=cabinet.created,
                actor=cabinet.owner,
                url=_safe_admin_url("admin:cabinets_cabinet_change", args=[cabinet.pk]),
                kind="cabinet_created",
            )
        )

    for case in Case.objects.select_related("created_by").order_by("-created")[:8]:
        items.append(
            _activity_item(
                message=_("Case “%(title)s” was created") % {"title": case.title or case.reference},
                when=case.created,
                actor=case.created_by,
                url=_safe_admin_url("admin:cases_case_change", args=[case.pk]),
                kind="case_created",
            )
        )

    for doc in Document.objects.select_related("created_by").order_by("-created")[:8]:
        items.append(
            _activity_item(
                message=_("Library document “%(title)s” was uploaded") % {"title": doc.title},
                when=doc.created,
                actor=doc.created_by,
                url=_safe_admin_url("admin:library_document_change", args=[doc.pk]),
                kind="document_uploaded",
            )
        )

    for user in User.objects.order_by("-date_joined")[:8]:
        items.append(
            _activity_item(
                message=_("User %(name)s joined") % {"name": _display_name(user)},
                when=user.date_joined,
                actor=user,
                url=_safe_admin_url("admin:users_user_change", args=[user.pk]),
                kind="user_created",
            )
        )

    for announcement in Announcement.objects.select_related("created_by").order_by("-created")[:6]:
        items.append(
            _activity_item(
                message=_("Announcement “%(title)s” was saved") % {"title": announcement.title},
                when=announcement.created,
                actor=announcement.created_by,
                url=_safe_admin_url("admin:dashboard_announcement_change", args=[announcement.pk]),
                kind="announcement",
            )
        )

    items.sort(key=lambda item: item["when"] or now, reverse=True)
    seen = set()
    unique = []
    for item in items:
        key = (item["kind"], item["message"], item["when"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
        if len(unique) >= limit:
            break
    return unique


def dashboard_callback(request, context):
    now = timezone.localtime(timezone.now())
    prev_start, this_start = _month_bounds(now)
    from core.admin_branding import environment_callback

    environment_label, _variant = environment_callback(request)
    context.update(
        {
            "jure_greeting": _greeting(now),
            "jure_admin_name": _display_name(request.user),
            "jure_today": now,
            "jure_environment": environment_label,
            "jure_kpis": _build_kpis(now, prev_start, this_start),
            "jure_activity": _build_activity(now),
        }
    )
    return context
