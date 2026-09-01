from django import forms
from django.contrib import admin, messages
from django.db import models
from django.template.defaultfilters import linebreaksbr
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display
from unfold.widgets import UnfoldAdminFileFieldWidget

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin
from jurisdictions.constants import VisibilityScope
from jurisdictions.models import Jurisdiction

from .models import ActivityLog, Announcement


class AnnouncementAdminForm(forms.ModelForm):
    class Meta:
        model = Announcement
        fields = "__all__"
        widgets = {
            "visibility_scope": forms.RadioSelect,
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "visibility_scope" in self.fields:
            self.fields["visibility_scope"].choices = [
                (VisibilityScope.GLOBAL, "Global"),
                (VisibilityScope.JURISDICTION, "Jurisdiction"),
                (VisibilityScope.CABINET, "Cabinet"),
            ]
            if not self.instance.pk:
                self.fields["visibility_scope"].initial = VisibilityScope.GLOBAL
        if "jurisdiction" in self.fields:
            self.fields["jurisdiction"].queryset = Jurisdiction.objects.order_by("code")
            self.fields["jurisdiction"].required = False

    def clean(self):
        cleaned = super().clean()
        scope = cleaned.get("visibility_scope") or VisibilityScope.GLOBAL
        if scope == VisibilityScope.GLOBAL:
            cleaned["jurisdiction"] = None
        elif scope == VisibilityScope.JURISDICTION and not cleaned.get("jurisdiction"):
            self.add_error("jurisdiction", "Select a jurisdiction for jurisdiction-specific content.")
        return cleaned


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
class AnnouncementAdmin(JureModelAdmin):
    form = AnnouncementAdminForm
    # Unfold hides/breaks default FileField widgets unless this override is set.
    formfield_overrides = {
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }
    list_display = (
        "title",
        "scope_badge",
        "status_badge",
        "priority",
        "is_active",
        "has_learn_more",
        "has_media",
        "target_cabinets_display",
        "start_date",
        "created",
    )
    list_filter = (
        "status",
        "is_active",
        "visibility_scope",
        "jurisdiction",
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
    class Media:
        js = ("jurisdictions/js/scope_widget.js",)

    date_hierarchy = "created"
    actions = ("publish_announcements", "archive_announcements", "move_to_draft")
    fieldsets = (
        (_("General information"), {
            "description": (
                "Global announcements are visible to every jurisdiction. "
                "Jurisdiction announcements are visible only to cabinets in that market. "
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
        (_("Content scope"), {
            "fields": ("visibility_scope", "jurisdiction"),
            "description": (
                "Choose Global for one record visible everywhere. "
                "Choose Jurisdiction and pick Morocco or Qatar for market-specific updates."
            ),
        }),
        (_("Schedule"), {
            "fields": ("start_date", "end_date"),
            "description": (
                "Leave start empty to go live immediately when Published. "
                "A future start date is saved as Scheduled. Leave end empty to never expire."
            ),
        }),
        (_("Cabinet targeting"), {
            "fields": ("target_cabinets",),
            "classes": ("collapse",),
            "description": (
                "Only used for Cabinet-scoped announcements. "
                "Leave empty for Global and Jurisdiction content."
            ),
        }),
        (_("Preview"), {
            "fields": ("dashboard_preview",),
        }),
        (_("Meta"), {
            "fields": ("created_by", "updated_by", "created", "modified"),
        }),
    )

    @display(description=_("Scope"), ordering="visibility_scope", label=STATUS_LABELS)
    def scope_badge(self, obj):
        label = obj.get_visibility_scope_display()
        if obj.jurisdiction_id:
            label = f"{label} · {obj.jurisdiction}"
        return obj.visibility_scope, label

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())

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
                '<p style="margin:0.75rem 0 0;"><a href="{}" style="color:#64499D;font-weight:600;" rel="noopener">{}</a></p>',
                obj.link_url,
                obj.link_label or "Learn more",
            )
        return format_html(
            '<div style="max-width:28rem;padding:1rem 1.1rem;border-radius:12px;'
            'background:#fff;color:#1F2937;line-height:1.45;border:1px solid #E8EAF0;">'
            '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;'
            'color:#64499D;margin-bottom:0.35rem;">{}</div>'
            "<strong>{}</strong>"
            '<div style="margin-top:0.4rem;color:#6B7280;">{}</div>{}</div>',
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
class ActivityLogAdmin(JureModelAdmin):
    list_display = ("kind", "cabinet", "message", "created")
    list_filter = ("kind", "cabinet")
