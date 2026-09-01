from django.contrib import admin, messages
from django.db.models import Count
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin

from .models import Jurisdiction


@admin.register(Jurisdiction)
class JurisdictionAdmin(JureModelAdmin):
    list_display = (
        "code",
        "name",
        "country_code",
        "status_badge",
        "cabinet_count",
        "document_count",
        "announcement_count",
        "default_language",
        "legal_system",
    )
    list_filter = ("status", "default_language")
    search_fields = ("code", "name", "country_code")
    ordering = ("code",)
    readonly_fields = ("created", "modified")
    actions = ("activate_jurisdictions", "deactivate_jurisdictions")
    fieldsets = (
        (None, {
            "fields": (
                "code",
                "name",
                "country_code",
                "legal_system",
                "default_language",
                "status",
            ),
        }),
        (_("Meta"), {
            "fields": ("created", "modified"),
            "classes": ("collapse",),
        }),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                _cabinet_count=Count("cabinets", distinct=True),
                _document_count=Count("documents", distinct=True),
                _announcement_count=Count("announcements", distinct=True),
            )
        )

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())

    @admin.display(description=_("Cabinets"), ordering="_cabinet_count")
    def cabinet_count(self, obj):
        return getattr(obj, "_cabinet_count", obj.cabinets.count())

    @admin.display(description=_("Library documents"), ordering="_document_count")
    def document_count(self, obj):
        return getattr(obj, "_document_count", obj.documents.count())

    @admin.display(description=_("Announcements"), ordering="_announcement_count")
    def announcement_count(self, obj):
        return getattr(obj, "_announcement_count", obj.announcements.count())

    def has_delete_permission(self, request, obj=None):
        if obj is not None and obj.has_dependent_data():
            return False
        return super().has_delete_permission(request, obj)

    def delete_model(self, request, obj):
        if obj.has_dependent_data():
            self.message_user(
                request,
                _("Cannot delete a jurisdiction that still has cabinets, library documents, or announcements."),
                messages.ERROR,
            )
            return
        super().delete_model(request, obj)

    @admin.action(description=_("Activate selected jurisdictions"))
    def activate_jurisdictions(self, request, queryset):
        updated = queryset.update(status=Jurisdiction.Status.ACTIVE)
        self.message_user(
            request,
            _("Activated %(count)s jurisdiction(s).") % {"count": updated},
            messages.SUCCESS,
        )

    @admin.action(description=_("Deactivate selected jurisdictions"))
    def deactivate_jurisdictions(self, request, queryset):
        updated = queryset.update(status=Jurisdiction.Status.INACTIVE)
        self.message_user(
            request,
            _("Deactivated %(count)s jurisdiction(s). They will no longer appear at signup.")
            % {"count": updated},
            messages.WARNING,
        )
