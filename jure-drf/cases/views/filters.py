# cases/views/filters.py
"""DRF filter backends for case list queries."""
from datetime import date, timedelta

from django.db.models import Q
from rest_framework import filters

JSON_DATE_FIELDS = {
    "consultationDate",
    "nextHearingDate",
    "dueDate",
    "startDate",
    "filingDate",
    "followUpDate",
}


class CaseFilter(filters.BaseFilterBackend):
    """
    Filter by caseType, status, assignedTo, client, and type-specific JSON keys.

    Supports: ?caseType=LITIGATION&status=OPEN&assignedTo=42
    JSON: ?outcome=SCHEDULED&consultationType=INITIAL&clientRole=PLAINTIFF
    KPI flags: ?today=1&dueThisWeek=1&overdue=1&upcomingHearing=1
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
    }

    JSON_ICONTAINS = {
        "institution": "institution",
        "courtName": "courtName",
        "jurisdiction": "jurisdiction",
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
        if status_val:
            statuses = [s.strip() for s in str(status_val).split(",") if s.strip()]
            if len(statuses) == 1:
                queryset = queryset.filter(status=statuses[0])
            elif statuses:
                queryset = queryset.filter(status__in=statuses)
        if assigned_to_id:
            queryset = queryset.filter(assigned_to_id=assigned_to_id)
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

        today = date.today()
        today_iso = today.isoformat()
        tomorrow_iso = (today + timedelta(days=1)).isoformat()
        week_iso = (today + timedelta(days=7)).isoformat()

        if _flag(request, "overdue"):
            queryset = queryset.filter(case_specific_data__dueDate__lt=today_iso)
        if _flag(request, "today"):
            queryset = queryset.filter(
                Q(case_specific_data__consultationDate__gte=today_iso)
                & Q(case_specific_data__consultationDate__lt=tomorrow_iso)
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

        return queryset


def _flag(request, name: str) -> bool:
    val = request.query_params.get(name)
    return val is not None and str(val).lower() in ("1", "true", "yes")
