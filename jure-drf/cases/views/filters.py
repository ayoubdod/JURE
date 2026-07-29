# cases/views/filters.py
"""DRF filter backends for case list queries."""
from rest_framework import filters


class CaseFilter(filters.BaseFilterBackend):
    """
    Filter by caseType, status, assignedTo (assigned_to_id).

    Supports: ?caseType=LITIGATION&status=OPEN&assignedTo=42
    """

    def filter_queryset(self, request, queryset, view):
        case_type = request.query_params.get("caseType")
        status_val = request.query_params.get("status")
        assigned_to_id = request.query_params.get("assignedTo")

        if case_type:
            queryset = queryset.filter(case_type=case_type)
        if status_val:
            queryset = queryset.filter(status=status_val)
        if assigned_to_id:
            queryset = queryset.filter(assigned_to_id=assigned_to_id)
        return queryset
