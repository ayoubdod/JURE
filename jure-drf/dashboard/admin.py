from django.contrib import admin
from django.db import models
from django.utils import timezone
from unfold.admin import ModelAdmin
from unfold.widgets import UnfoldAdminFileFieldWidget

from .models import ActivityLog, Announcement


class TargetCabinetListFilter(admin.SimpleListFilter):
    title = "target cabinet"
    parameter_name = "target_cabinet"

    def lookups(self, request, model_admin):
        from cabinets.models import Cabinet

        return [
            (str(c.pk), c.trade_name or f"Cabinet #{c.pk}")
            for c in Cabinet.objects.order_by("trade_name")
        ]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(target_cabinets__pk=self.value()).distinct()
        return queryset


class ScheduleStatusFilter(admin.SimpleListFilter):
    title = "schedule"
    parameter_name = "schedule"

    def lookups(self, request, model_admin):
        return (
            ("live", "Currently live"),
            ("scheduled", "Scheduled (future start)"),
            ("expired", "Expired"),
            ("unbounded", "No end date"),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        value = self.value()
        if value == "live":
            return queryset.filter(Announcement.scheduled_q(now), is_active=True)
        if value == "scheduled":
            return queryset.filter(start_date__gt=now)
        if value == "expired":
            return queryset.filter(end_date__lt=now)
        if value == "unbounded":
            return queryset.filter(end_date__isnull=True)
        return queryset


@admin.register(Announcement)
class AnnouncementAdmin(ModelAdmin):
    # Unfold hides/breaks default FileField widgets unless this override is set.
    formfield_overrides = {
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }
    list_display = (
        "title",
        "announcement_type",
        "is_active",
        "has_media",
        "media_kind",
        "target_cabinets_display",
        "start_date",
        "end_date",
        "created_by",
        "created",
    )
    list_filter = (
        "is_active",
        "announcement_type",
        "media_kind",
        TargetCabinetListFilter,
        ScheduleStatusFilter,
        "start_date",
        "end_date",
        "created",
    )
    search_fields = ("title", "message")
    filter_horizontal = ("target_cabinets",)
    readonly_fields = ("created", "modified", "created_by", "media_kind")
    autocomplete_fields = ()
    date_hierarchy = "created"
    fieldsets = (
        (None, {
            "fields": (
                "title",
                "message",
                "media",
                "media_kind",
                "announcement_type",
                "is_active",
            ),
        }),
        ("Schedule", {
            "fields": ("start_date", "end_date"),
        }),
        ("Targeting", {
            "fields": ("target_cabinets",),
            "description": (
                "Select one or more cabinets. Users only see announcements "
                "targeting their cabinet. Leaving this empty means nobody sees it."
            ),
        }),
        ("Meta", {
            "fields": ("created_by", "created", "modified"),
        }),
    )

    @admin.display(description="Media", boolean=True)
    def has_media(self, obj):
        return bool(obj.media)

    @admin.display(description="Target cabinets")
    def target_cabinets_display(self, obj):
        names = list(
            obj.target_cabinets.values_list("trade_name", flat=True)[:8]
        )
        if not names:
            return "—"
        label = ", ".join(n or "—" for n in names)
        extra = obj.target_cabinets.count() - len(names)
        if extra > 0:
            label = f"{label} (+{extra})"
        return label

    def save_model(self, request, obj, form, change):
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ActivityLog)
class ActivityLogAdmin(ModelAdmin):
    list_display = ("kind", "cabinet", "message", "created")
    list_filter = ("kind", "cabinet")
