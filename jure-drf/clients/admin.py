from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS
from core.unfold_admin import JureModelAdmin
from .models import Client


@admin.register(Client)
class ClientAdmin(JureModelAdmin):
    list_display = ("id", "user", "type_badge", "ice", "if_number")
    list_filter = ("client_type",)
    search_fields = ("user__email", "user__first_name", "user__last_name", "ice", "if_number")
    raw_id_fields = ("user",)
    list_select_related = ("user",)
    fieldsets = (
        (_("General information"), {
            "fields": ("user", "client_type", "ice", "if_number"),
        }),
    )

    @display(description=_("Type"), ordering="client_type", label=STATUS_LABELS)
    def type_badge(self, obj):
        return obj.client_type, obj.get_client_type_display()
