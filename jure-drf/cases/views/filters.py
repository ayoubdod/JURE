# cases/views/filters.py
"""DRF filter backends for case list queries."""
from datetime import date, timedelta

from django.db.models import Case as DjCase
from django.db.models import IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework import filters

JSON_DATE_FIELDS = {
    "consultationDate",
    "nextHearingDate",
    "dueDate",
    "startDate",
    "filingDate",
    "followUpDate",
}

JURISDICTION_LEVELS = frozenset({"FIRST_INSTANCE", "APPEAL", "CASSATION"})

CONSULTATION_PAST_OUTCOMES = ("COMPLETED", "CANCELLED", "NO_SHOW")

ORDERING_MAP = {
    "consultationDate": "case_specific_data__consultationDate",
    "-consultationDate": "-case_specific_data__consultationDate",
    "reference": "reference",
    "-reference": "-reference",
    "client": "client__last_name",
    "-client": "-client__last_name",
    "status": "case_specific_data__outcome",
    "-status": "-case_specific_data__outcome",
    "attorney": "assigned_to__last_name",
    "-attorney": "-assigned_to__last_name",
    "created": "created",
    "-created": "-created",
}


class CaseSearchFilter(filters.SearchFilter):
    """Search reference, title, client, attorneys, and legal domain."""

    def filter_queryset(self, request, queryset, view):
        term = (request.query_params.get(self.search_param) or "").strip()
        if not term:
            return queryset
        q = (
            Q(title__icontains=term)
            | Q(reference__icontains=term)
            | Q(description__icontains=term)
            | Q(client__first_name__icontains=term)
            | Q(client__last_name__icontains=term)
            | Q(client__email__icontains=term)
            | Q(assigned_to__first_name__icontains=term)
            | Q(assigned_to__last_name__icontains=term)
            | Q(assigned_attorneys__first_name__icontains=term)
            | Q(assigned_attorneys__last_name__icontains=term)
            | Q(case_specific_data__legalDomain__icontains=term)
            | Q(case_specific_data__customLegalDomain__icontains=term)
            | Q(case_specific_data__legalQuestion__icontains=term)
            | Q(case_specific_data__opposingParty__icontains=term)
            | Q(case_specific_data__city__icontains=term)
            | Q(case_specific_data__courtName__icontains=term)
            | Q(case_specific_data__courtCaseNumber__icontains=term)
            | Q(case_specific_data__chamber__icontains=term)
        )
        return queryset.filter(q).distinct()


class CaseFilter(filters.BaseFilterBackend):
    """
    Filter by caseType, status, assignedTo, client, and type-specific JSON keys.

    Supports: ?caseType=LITIGATION&status=OPEN&assignedTo=42
    JSON: ?outcome=SCHEDULED&consultationType=PREVENTIVE&clientRole=PLAINTIFF
    KPI flags: ?today=1&upcoming=1&thisMonth=1&converted=1&dueThisWeek=1&overdue=1
    """

    JSON_EXACT = {
        "outcome": "outcome",
        "consultationType": "consultationType",
        "format": "format",
        "clientRole": "clientRole",
        "priority": "priority",
        "dutyType": "dutyType",
        "litigationType": "litigationType",
        "legalDomain": "legalDomain",
        "courtSpecialty": "courtSpecialty",
    }

    JSON_ICONTAINS = {
        "institution": "institution",
        "courtName": "courtName",
        "opposingParty": "opposingParty",
    }

    def filter_queryset(self, request, queryset, view):
        case_type = request.query_params.get("caseType") or request.query_params.get("case_type")
        if case_type == "ADMINISTRATIVE_DUTY":
            case_type = "ADMINISTRATIVE"
        status_val = request.query_params.get("status")
        assigned_to_id = request.query_params.get("assignedTo") or request.query_params.get("assigned_to")
        client_id = request.query_params.get("client")
        category = request.query_params.get("category")

        if case_type:
            queryset = queryset.filter(case_type=case_type)
        if not _flag(request, "includeFollowUps"):
            queryset = queryset.filter(parent_consultation__isnull=True)
        if status_val:
            statuses = [s.strip() for s in str(status_val).split(",") if s.strip()]
            if len(statuses) == 1:
                queryset = queryset.filter(status=statuses[0])
            elif statuses:
                queryset = queryset.filter(status__in=statuses)
        if assigned_to_id:
            queryset = queryset.filter(assigned_to_id=assigned_to_id)
        assigned_in = request.query_params.get("assignedToIn")
        if assigned_in:
            ids = [int(x) for x in str(assigned_in).split(",") if x.strip().isdigit()]
            if ids:
                queryset = queryset.filter(Q(assigned_to_id__in=ids) | Q(assigned_attorneys__in=ids)).distinct()
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if category:
            queryset = queryset.filter(category=category)

        for param, json_key in self.JSON_EXACT.items():
            val = request.query_params.get(param)
            if val is not None and val != "":
                queryset = queryset.filter(**{f"case_specific_data__{json_key}": val})

        for param, json_key in self.JSON_ICONTAINS.items():
            val = request.query_params.get(param)
            if val is not None and str(val).strip() != "":
                queryset = queryset.filter(**{f"case_specific_data__{json_key}__icontains": str(val).strip()})

        queryset = _apply_litigation_court_filters(request, queryset)

        priority_in = request.query_params.get("priorityIn")
        if priority_in:
            vals = [p.strip() for p in str(priority_in).split(",") if p.strip()]
            if vals:
                queryset = queryset.filter(case_specific_data__priority__in=vals)

        follow = request.query_params.get("followUpRequired")
        if follow is not None and follow != "":
            truthy = str(follow).lower() in ("1", "true", "yes")
            queryset = queryset.filter(
                Q(case_specific_data__followUpRequired=truthy)
                | Q(case_specific_data__follow_up_required=truthy)
            )

        follow_filter = (request.query_params.get("followUpFilter") or "").strip().lower()
        if follow_filter == "required":
            queryset = queryset.filter(
                Q(case_specific_data__followUpRequired=True) | Q(case_specific_data__follow_up_required=True)
            )
        elif follow_filter == "has":
            queryset = queryset.filter(follow_up_count__gt=0)
        elif follow_filter == "none":
            queryset = queryset.filter(follow_up_count=0).exclude(
                Q(case_specific_data__followUpRequired=True) | Q(case_specific_data__follow_up_required=True)
            )

        converted = request.query_params.get("converted")
        if converted is not None and str(converted).strip() != "":
            flag = str(converted).lower()
            if flag in ("1", "true", "yes"):
                queryset = queryset.filter(converted_to_case__isnull=False)
            elif flag in ("0", "false", "no"):
                queryset = queryset.filter(converted_to_case__isnull=True)

        today = date.today()
        today_iso = today.isoformat()
        tomorrow_iso = (today + timedelta(days=1)).isoformat()
        week_iso = (today + timedelta(days=7)).isoformat()

        if _flag(request, "overdue"):
            queryset = queryset.filter(case_specific_data__dueDate__lt=today_iso)
        if _flag(request, "today"):
            queryset = queryset.filter(
                (
                    Q(case_specific_data__consultationDate__gte=today_iso)
                    & Q(case_specific_data__consultationDate__lt=tomorrow_iso)
                )
                | (
                    Q(follow_ups__case_specific_data__consultationDate__gte=today_iso)
                    & Q(follow_ups__case_specific_data__consultationDate__lt=tomorrow_iso)
                )
            ).distinct()
        if _flag(request, "upcoming"):
            now_iso = timezone.now().isoformat()
            queryset = queryset.filter(case_specific_data__consultationDate__gte=now_iso).exclude(
                case_specific_data__outcome__in=CONSULTATION_PAST_OUTCOMES
            )
        if _flag(request, "thisMonth"):
            month_start = today.replace(day=1).isoformat()
            if today.month == 12:
                month_end = date(today.year + 1, 1, 1).isoformat()
            else:
                month_end = date(today.year, today.month + 1, 1).isoformat()
            queryset = queryset.filter(
                case_specific_data__consultationDate__gte=month_start,
                case_specific_data__consultationDate__lt=month_end,
            )
        if _flag(request, "dueThisWeek"):
            queryset = queryset.filter(
                case_specific_data__dueDate__gte=today_iso,
                case_specific_data__dueDate__lte=week_iso,
            )
        if _flag(request, "upcomingHearing"):
            queryset = queryset.filter(case_specific_data__nextHearingDate__gte=today_iso)

        date_field = request.query_params.get("dateField")
        date_from = request.query_params.get("dateFrom")
        date_to = request.query_params.get("dateTo")
        if date_field in JSON_DATE_FIELDS:
            if date_from:
                queryset = queryset.filter(**{f"case_specific_data__{date_field}__gte": date_from})
            if date_to:
                end = date_to if "T" in str(date_to) else f"{date_to}T23:59:59"
                queryset = queryset.filter(**{f"case_specific_data__{date_field}__lte": end})

        if (case_type or "").upper() == "CONSULTATION":
            queryset = _apply_consultation_ordering(request, queryset)

        return queryset


def _apply_litigation_court_filters(request, queryset):
    """Exact court hierarchy filters, plus city matching legacy jurisdiction text."""
    jurisdiction = (request.query_params.get("jurisdiction") or "").strip()
    if jurisdiction:
        if jurisdiction in JURISDICTION_LEVELS:
            queryset = queryset.filter(case_specific_data__jurisdiction=jurisdiction)
        else:
            queryset = queryset.filter(case_specific_data__jurisdiction__icontains=jurisdiction)

    chamber = (request.query_params.get("chamber") or "").strip()
    if chamber:
        queryset = queryset.filter(
            Q(case_specific_data__chamber=chamber)
            | Q(case_specific_data__chamberDivision=chamber)
            | Q(case_specific_data__chamber_division=chamber)
        )

    city = (request.query_params.get("city") or "").strip()
    if city:
        queryset = queryset.filter(
            Q(case_specific_data__city__icontains=city)
            | (
                ~Q(case_specific_data__jurisdiction__in=list(JURISDICTION_LEVELS))
                & Q(case_specific_data__jurisdiction__icontains=city)
            )
        )

    return queryset


def _apply_consultation_ordering(request, queryset):
    ordering = (request.query_params.get("ordering") or "upcoming").strip()
    if ordering == "upcoming":
        now_iso = timezone.now().isoformat()
        return queryset.annotate(
            _upcoming=DjCase(
                When(case_specific_data__consultationDate__gte=now_iso, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by("_upcoming", "case_specific_data__consultationDate", "-id")
    mapped = ORDERING_MAP.get(ordering)
    if mapped:
        return queryset.order_by(mapped, "-id")
    return queryset.order_by("-created")


def _flag(request, name: str) -> bool:
    val = request.query_params.get(name)
    return val is not None and str(val).lower() in ("1", "true", "yes")
