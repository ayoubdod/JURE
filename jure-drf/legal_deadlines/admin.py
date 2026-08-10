from django.contrib import admin

from .models import CalculatedDeadline, DeadlineReminder, DeadlineRule, LegalHoliday, LegalSource


@admin.register(LegalSource)
class LegalSourceAdmin(admin.ModelAdmin):
    list_display = ("law_number", "title", "status", "effective_from", "effective_until", "jurisdiction")
    list_filter = ("jurisdiction", "status")
    search_fields = ("law_number", "title", "official_reference")


@admin.register(DeadlineRule)
class DeadlineRuleAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "version",
        "procedure_type",
        "duration_value",
        "computation_method",
        "verification_status",
        "active",
        "effective_from",
        "effective_until",
    )
    list_filter = ("legal_domain", "verification_status", "active", "jurisdiction", "procedure_type")
    search_fields = ("code", "name", "article_reference", "version")
    readonly_fields = ("created", "modified")


@admin.register(LegalHoliday)
class LegalHolidayAdmin(admin.ModelAdmin):
    list_display = ("date", "name", "year", "holiday_type", "is_legally_relevant", "jurisdiction")
    list_filter = ("year", "holiday_type", "jurisdiction", "is_legally_relevant")
    search_fields = ("name",)


class DeadlineReminderInline(admin.TabularInline):
    model = DeadlineReminder
    extra = 0


@admin.register(CalculatedDeadline)
class CalculatedDeadlineAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "case",
        "final_deadline",
        "status",
        "is_manual_override",
        "cabinet",
        "created_by",
        "created",
    )
    list_filter = ("status", "is_manual_override", "cabinet")
    search_fields = ("case__title", "case__reference", "notes")
    readonly_fields = (
        "rule_snapshot",
        "calculation_explanation",
        "calculated_deadline",
        "created",
        "modified",
    )
    inlines = [DeadlineReminderInline]
