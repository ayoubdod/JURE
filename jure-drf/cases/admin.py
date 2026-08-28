from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Case, CaseAttachment, CaseReferenceSequence


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
        "parent_consultation",
    ]
    list_filter = ["case_type", "status", "category"]
    search_fields = ["reference", "title", "description"]
    filter_horizontal = ["assigned_attorneys"]


@admin.register(CaseAttachment)
class CaseAttachmentAdmin(ModelAdmin):
    list_display = ["id", "case", "original_name", "uploaded_by", "created"]
    search_fields = ["original_name", "case__reference"]


@admin.register(CaseReferenceSequence)
class CaseReferenceSequenceAdmin(ModelAdmin):
    list_display = ["cabinet", "kind", "year", "last_number"]
    list_filter = ["kind", "year"]
