from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS
from core.unfold_admin import JureModelAdmin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(JureModelAdmin):
    list_display = (
        "id",
        "notification_type",
        "recipient",
        "priority",
        "read_badge",
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

    @display(description=_("Read"), ordering="is_read", label=STATUS_LABELS)
    def read_badge(self, obj):
        if obj.is_read:
            return "read", _("Read")
        return "unread", _("Unread")
