from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Document


@admin.register(Document)
class DocumentAdmin(ModelAdmin):
    list_display = ["title", "category", "created", "modified"]
    list_filter = ["category", "tags", "created"]
    search_fields = ["title", "description"]
    filter_horizontal = ["tags"]
    readonly_fields = ["created", "modified"]
