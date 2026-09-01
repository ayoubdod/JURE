from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS
from core.unfold_admin import JureModelAdmin
from .models import Cabinet


@admin.register(Cabinet)
class CabinetAdmin(JureModelAdmin):
    list_display = (
        "cabinet_header",
        "jurisdiction",
        "practice_badge",
        "structure_type",
        "owner",
        "team_size",
        "created",
    )
    list_filter = ("jurisdiction", "practice_type", "created")
    search_fields = ("trade_name", "business_address", "owner__email")
    raw_id_fields = ("owner", "specialization")
    autocomplete_fields = ()
    list_select_related = ("jurisdiction", "owner")
    fieldsets = (
        (_("General information"), {
            "fields": (
                "trade_name",
                "practice_type",
                "structure_type",
                "description",
                "logo",
            ),
        }),
        (_("Location"), {
            "fields": ("jurisdiction", "business_address", "website", "founded_date"),
        }),
        (_("Team"), {
            "fields": ("owner", "specialization", "team_size"),
        }),
        (_("Meta"), {
            "classes": ("collapse",),
            "fields": ("created", "modified"),
        }),
    )
    readonly_fields = ("created", "modified")

    @display(description=_("Cabinet"), header=True)
    def cabinet_header(self, obj):
        subtitle = obj.business_address or (obj.jurisdiction and str(obj.jurisdiction)) or ""
        initials = (obj.trade_name or "C")[:1].upper()
        image = None
        if obj.logo:
            try:
                image = {"path": obj.logo.url}
            except (ValueError, OSError):
                image = None
        if image:
            return [obj.trade_name, subtitle, None, image]
        return [obj.trade_name, subtitle, initials]

    @display(
        description=_("Practice"),
        ordering="practice_type",
        label=STATUS_LABELS,
    )
    def practice_badge(self, obj):
        if not obj.practice_type:
            return "info", "—"
        return obj.practice_type, obj.get_practice_type_display()
