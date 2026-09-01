from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin
from .models import Case, CaseAttachment, CaseReferenceSequence


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
    list_display = ["id", "case", "original_name", "uploaded_by", "created"]
    search_fields = ["original_name", "case__reference"]


@admin.register(CaseReferenceSequence)
class CaseReferenceSequenceAdmin(JureModelAdmin):
    list_display = ["cabinet", "kind", "year", "last_number"]
    list_filter = ["kind", "year"]
