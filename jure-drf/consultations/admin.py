from django.contrib import admin

from core.unfold_admin import JureModelAdmin

from .models import (
    ConsultationAttachment,
    ConsultationComment,
    ConsultationEvent,
    ConsultationRequest,
)


class ConsultationCommentInline(admin.TabularInline):
    model = ConsultationComment
    extra = 0
    readonly_fields = ("created", "modified")


class ConsultationEventInline(admin.TabularInline):
    model = ConsultationEvent
    extra = 0
    readonly_fields = ("created", "modified")


class ConsultationAttachmentInline(admin.TabularInline):
    model = ConsultationAttachment
    extra = 0
    readonly_fields = ("created", "modified")


@admin.register(ConsultationRequest)
class ConsultationRequestAdmin(JureModelAdmin):
    list_display = (
        "reference",
        "subject",
        "status",
        "client",
        "assigned_lawyer",
        "cabinet",
        "created",
    )
    list_filter = ("status", "legal_area", "priority")
    search_fields = ("reference", "subject", "client__email", "client__first_name")
    inlines = [
        ConsultationCommentInline,
        ConsultationEventInline,
        ConsultationAttachmentInline,
    ]


@admin.register(ConsultationComment)
class ConsultationCommentAdmin(JureModelAdmin):
    list_display = ("consultation", "author", "visibility", "created")
    list_filter = ("visibility",)


@admin.register(ConsultationEvent)
class ConsultationEventAdmin(JureModelAdmin):
    list_display = ("consultation", "event_type", "actor", "client_visible", "created")
    list_filter = ("event_type", "client_visible")


@admin.register(ConsultationAttachment)
class ConsultationAttachmentAdmin(JureModelAdmin):
    list_display = ("consultation", "original_name", "uploaded_by", "created")
