from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ConflictCheck, PotentialMatch


class PotentialMatchInline(admin.TabularInline):
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
class ConflictCheckAdmin(ModelAdmin):
    list_display = (
        "id",
        "search_query",
        "cabinet",
        "result_count",
        "status",
        "initiated_by",
        "created",
    )
    list_filter = ("status", "cabinet")
    search_fields = ("search_query", "notes")
    readonly_fields = ("result_count", "created", "modified")
    inlines = [PotentialMatchInline]


@admin.register(PotentialMatch)
class PotentialMatchAdmin(ModelAdmin):
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
