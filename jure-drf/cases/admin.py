from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Case


@admin.register(Case)
class CaseAdmin(ModelAdmin):
    list_display = [
        "reference",
        "title",
        "case_type",
        "status",
        "court",
        "assigned_to",
        "client",
    ]
    list_filter = ["case_type", "status", "category"]
    search_fields = ["reference", "title", "description"]
