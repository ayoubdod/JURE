from django_filters import rest_framework as filters

from .models import Document


class DocumentFilter(filters.FilterSet):
    date_added_after = filters.DateTimeFilter(field_name="created", lookup_expr="gte")
    date_added_before = filters.DateTimeFilter(field_name="created", lookup_expr="lte")
    date_added = filters.DateFilter(field_name="created", lookup_expr="date")
    tags = filters.CharFilter(field_name="tags__slug")
    source = filters.CharFilter(field_name="source", lookup_expr="icontains")
    language = filters.CharFilter(field_name="language", lookup_expr="iexact")
    country = filters.CharFilter(field_name="country", lookup_expr="iexact")
    resource_type = filters.CharFilter(field_name="resource_type")
    category = filters.CharFilter(field_name="category")
    jurisdiction = filters.NumberFilter(field_name="jurisdiction_id")
    status = filters.CharFilter(field_name="status")
    is_shared = filters.BooleanFilter(field_name="is_shared")
    recent = filters.BooleanFilter(method="filter_recent")

    class Meta:
        model = Document
        fields = [
            "category",
            "resource_type",
            "tags",
            "status",
            "is_shared",
            "language",
            "country",
            "source",
            "jurisdiction",
        ]

    def filter_recent(self, queryset, name, value):
        from .constants import last_added_cutoff

        if value:
            return queryset.filter(created__gte=last_added_cutoff())
        return queryset
