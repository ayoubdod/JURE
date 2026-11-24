from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin
from .models import (
    Case,
    CaseAttachment,
    CaseAttachmentIntelligence,
    CaseAttachmentPage,
    CaseClientUpdate,
    CaseReferenceSequence,
)


@admin.register(Case)
class CaseAdmin(JureModelAdmin):
    list_display = [
        "reference",
        "title",
        "type_badge",
        "status_badge",
        "court",
        "assigned_to",
        "client",
        "parent_consultation",
    ]
    list_filter = ["case_type", "status", "category"]
    search_fields = ["reference", "title", "description"]
    filter_horizontal = ["assigned_attorneys"]
    list_select_related = ("assigned_to", "client", "cabinet")

    @display(description=_("Type"), ordering="case_type", label=STATUS_LABELS)
    def type_badge(self, obj):
        return obj.case_type, obj.get_case_type_display()

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())


@admin.register(CaseAttachment)
class CaseAttachmentAdmin(JureModelAdmin):
    list_display = ["id", "case", "original_name", "uploaded_by", "client_visible", "created"]
    list_filter = ["client_visible"]
    search_fields = ["original_name", "case__reference"]


class CaseAttachmentPageInline(admin.TabularInline):
    model = CaseAttachmentPage
    extra = 0
    readonly_fields = [
        "page_number",
        "extraction_method",
        "character_count",
        "confidence_score",
        "created_at",
    ]
    fields = readonly_fields
    can_delete = False
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(CaseAttachmentIntelligence)
class CaseAttachmentIntelligenceAdmin(JureModelAdmin):
    list_display = [
        "id",
        "attachment",
        "extraction_status",
        "ocr_status",
        "is_scanned",
        "page_count",
        "total_extracted_chars",
        "processed_at",
    ]
    list_filter = ["ocr_status", "extraction_status", "is_scanned"]
    search_fields = ["attachment__original_name", "content_hash", "processing_error_code"]
    inlines = [CaseAttachmentPageInline]
    readonly_fields = [
        "attachment",
        "extraction_status",
        "ocr_status",
        "is_scanned",
        "page_count",
        "scanned_page_count",
        "detected_languages",
        "processing_error_code",
        "ocr_engine",
        "content_hash",
        "processed_at",
        "derived_ocr_file",
        "processing_lock",
        "total_extracted_chars",
        "extraction_version",
        "extracted_at",
        "extraction_completed_at",
        "created",
        "modified",
    ]


@admin.register(CaseAttachmentPage)
class CaseAttachmentPageAdmin(JureModelAdmin):
    list_display = [
        "id",
        "intelligence",
        "page_number",
        "extraction_method",
        "character_count",
        "created_at",
    ]
    list_filter = ["extraction_method"]
    search_fields = ["intelligence__attachment__original_name"]
    readonly_fields = [
        "intelligence",
        "page_number",
        "extracted_text",
        "extraction_method",
        "character_count",
        "confidence_score",
        "created_at",
    ]


@admin.register(CaseClientUpdate)
class CaseClientUpdateAdmin(JureModelAdmin):
    list_display = ["id", "case", "author", "created"]
    search_fields = ["content", "case__reference"]


@admin.register(CaseReferenceSequence)
class CaseReferenceSequenceAdmin(JureModelAdmin):
    list_display = ["cabinet", "kind", "year", "last_number"]
    list_filter = ["kind", "year"]
