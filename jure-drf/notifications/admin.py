from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = (
        "id",
        "notification_type",
        "recipient",
        "priority",
        "is_read",
        "created_at",
    )
    list_filter = ("notification_type", "priority", "is_read")
    search_fields = ("title", "message", "recipient__email")
    raw_id_fields = (
        "recipient",
        "related_case",
        "related_task",
        "related_appointment",
        "related_user",
    )
    readonly_fields = ("created_at", "email_sent_at", "read_at")
