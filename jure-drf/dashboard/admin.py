from django import forms
from django.contrib import admin, messages
from django.db import models
from django.template.defaultfilters import linebreaksbr
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.widgets import UnfoldAdminFileFieldWidget

from .models import ActivityLog, Announcement


class AnnouncementAdminForm(forms.ModelForm):
    class Meta:
        model = Announcement
        fields = "__all__"
        widgets = {
            "link_label": forms.TextInput(
                attrs={"placeholder": "Learn more"}
            ),
            "link_url": forms.TextInput(
                attrs={
                    "placeholder": "/dashboard/juria or https://example.com/…",
                    "size": 80,
                }
            ),
        }


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
    form = AnnouncementAdminForm
    # Unfold hides/breaks default FileField widgets unless this override is set.
    formfield_overrides = {
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }
    list_display = (
        "title",
        "announcement_type",
        "status",
        "priority",
        "is_active",
        "has_learn_more",
        "has_media",
        "media_kind",
        "target_cabinets_display",
        "start_date",
        "end_date",
        "created_by",
        "created",
    )
    list_filter = (
        "status",
        "is_active",
        "announcement_type",
        "priority",
        "media_kind",
        TargetCabinetListFilter,
        ScheduleStatusFilter,
        "start_date",
        "end_date",
        "created",
    )
    search_fields = ("title", "message", "link_url", "link_label")
    filter_horizontal = ("target_cabinets",)
    readonly_fields = (
        "created",
        "modified",
        "created_by",
        "updated_by",
        "media_kind",
        "is_active",
        "dashboard_preview",
    )
    date_hierarchy = "created"
    actions = ("publish_announcements", "archive_announcements", "move_to_draft")
    fieldsets = (
        (None, {
            "description": (
                "Cabinets only see Published (or Scheduled) announcements that target them. "
                "Draft and Archived never appear on the dashboard. "
                "Add an optional Learn more URL so the dashboard can open an in-app page "
                "or an HTTPS link."
            ),
            "fields": (
                "title",
                "message",
                "link_label",
                "link_url",
                "media",
                "media_kind",
                "announcement_type",
                "status",
                "priority",
                "is_active",
            ),
        }),
        ("Schedule", {
            "fields": ("start_date", "end_date"),
            "description": (
                "Leave start empty to go live immediately when Published. "
                "A future start date is saved as Scheduled. Leave end empty to never expire."
            ),
        }),
        ("Targeting", {
            "fields": ("target_cabinets",),
            "description": (
                "Select one or more cabinets. Users only see announcements "
                "targeting their cabinet. Leaving this empty means nobody sees it."
            ),
        }),
        ("Preview", {
            "fields": ("dashboard_preview",),
        }),
        ("Meta", {
            "fields": ("created_by", "updated_by", "created", "modified"),
        }),
    )

    @admin.display(description="Link", boolean=True)
    def has_learn_more(self, obj):
        return bool(obj.link_url)

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

    @admin.display(description="Dashboard preview")
    def dashboard_preview(self, obj):
        if not obj or not obj.pk:
            return "Save this announcement to preview it."
        cta = ""
        if obj.link_url:
            cta = format_html(
                '<p style="margin:0.75rem 0 0;"><a href="{}" style="color:#fff;font-weight:600;" rel="noopener">{}</a></p>',
                obj.link_url,
                obj.link_label or "Learn more",
            )
        return format_html(
            '<div style="max-width:28rem;padding:1rem 1.1rem;border-radius:12px;'
            'background:#4D3680;color:#fff;line-height:1.45;">'
            '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;'
            'opacity:.8;margin-bottom:0.35rem;">{}</div>'
            "<strong>{}</strong>"
            '<div style="margin-top:0.4rem;opacity:.95;">{}</div>{}</div>',
            obj.get_announcement_type_display(),
            obj.title or "Untitled",
            linebreaksbr(obj.message or ""),
            cta,
        )

    def save_model(self, request, obj, form, change):
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description="Publish selected announcements")
    def publish_announcements(self, request, queryset):
        count = 0
        for obj in queryset:
            obj.status = Announcement.Status.PUBLISHED
            obj.updated_by = request.user
            obj.save()
            count += 1
        self.message_user(
            request,
            f"Published {count} announcement(s).",
            messages.SUCCESS,
        )

    @admin.action(description="Archive selected announcements")
    def archive_announcements(self, request, queryset):
        count = 0
        for obj in queryset:
            obj.status = Announcement.Status.ARCHIVED
            obj.updated_by = request.user
            obj.save()
            count += 1
        self.message_user(
            request,
            f"Archived {count} announcement(s). They no longer appear on dashboards.",
            messages.WARNING,
        )

    @admin.action(description="Move selected announcements to draft")
    def move_to_draft(self, request, queryset):
        count = 0
        for obj in queryset:
            obj.status = Announcement.Status.DRAFT
            obj.updated_by = request.user
            obj.save()
            count += 1
        self.message_user(
            request,
            f"Moved {count} announcement(s) to draft.",
            messages.INFO,
        )


@admin.register(ActivityLog)
class ActivityLogAdmin(ModelAdmin):
    list_display = ("kind", "cabinet", "message", "created")
    list_filter = ("kind", "cabinet")
