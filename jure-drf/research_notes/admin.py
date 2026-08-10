from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ResearchNote


@admin.register(ResearchNote)
class ResearchNoteAdmin(ModelAdmin):
    list_display = (
        "id",
        "title",
        "cabinet",
        "matter",
        "author",
        "created",
        "modified",
    )
    list_filter = ("cabinet",)
    search_fields = ("title", "citation", "content")
    readonly_fields = ("created", "modified")
    raw_id_fields = ("cabinet", "author", "matter")
