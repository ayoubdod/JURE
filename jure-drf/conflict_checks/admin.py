from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin, JureTabularInline
from .models import ConflictCheck, PotentialMatch


class PotentialMatchInline(JureTabularInline):
    model = PotentialMatch
    extra = 0
    readonly_fields = (
        "entity_type",
        "entity_id",
        "entity_name",
        "matter",
        "role",
        "match_type",
        "confidence",
        "match_reason",
        "review_status",
        "reviewed_by",
        "reviewed_at",
    )
    can_delete = False


@admin.register(ConflictCheck)
class ConflictCheckAdmin(JureModelAdmin):
    list_display = (
        "id",
        "search_query",
        "cabinet",
        "result_count",
        "status_badge",
        "initiated_by",
        "created",
    )
    list_filter = ("status", "cabinet")
    search_fields = ("search_query", "notes")
    readonly_fields = ("result_count", "created", "modified")
    inlines = [PotentialMatchInline]

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())


@admin.register(PotentialMatch)
class PotentialMatchAdmin(JureModelAdmin):
    list_display = (
        "id",
        "entity_name",
        "role",
        "match_type",
        "confidence",
        "matter",
        "review_status",
        "conflict_check",
    )
    list_filter = ("match_type", "role", "review_status")
    search_fields = ("entity_name", "match_reason")
