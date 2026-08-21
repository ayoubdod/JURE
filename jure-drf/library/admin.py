from django.contrib import admin
from django.db import models
from unfold.admin import ModelAdmin
from unfold.widgets import UnfoldAdminFileFieldWidget

from .models import Document


@admin.register(Document)
class DocumentAdmin(ModelAdmin):
    formfield_overrides = {
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }
    list_display = ["title", "category", "is_shared", "cabinet", "created", "modified"]
    list_filter = ["is_shared", "category", "tags", "created"]
    search_fields = ["title", "description"]
    filter_horizontal = ["tags"]
    readonly_fields = ["created", "modified"]
    raw_id_fields = ["cabinet", "created_by"]
    fieldsets = (
        (None, {
            "fields": ("title", "category", "description", "file", "tags"),
        }),
        ("JURE Shared Library", {
            "fields": ("is_shared",),
            "description": (
                "Tick “Shared with all cabinets” to publish this file once. "
                "Every firm will see it in Library → JURE Shared. "
                "Cabinets can copy it into their own library; they cannot edit or delete the original."
            ),
        }),
        ("Ownership", {
            "fields": ("cabinet", "created_by", "created", "modified"),
            "description": (
                "Leave cabinet empty for shared documents. "
                "Cabinet is cleared automatically when the document is shared."
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        if obj.is_shared:
            obj.cabinet = None
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
