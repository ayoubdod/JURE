from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Cabinet


@admin.register(Cabinet)
class CabinetAdmin(ModelAdmin):
    list_display = (
        "trade_name",
        "jurisdiction",
        "practice_type",
        "structure_type",
        "owner",
        "team_size",
        "created",
    )
    list_filter = ("jurisdiction", "practice_type", "created")
    search_fields = ("trade_name", "business_address", "owner__email")
    raw_id_fields = ("owner", "specialization")
    autocomplete_fields = ()
