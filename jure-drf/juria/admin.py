from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin
from juria.models import (
    JuriaActivity,
    JuriaArtifact,
    JuriaConversation,
    JuriaFile,
    JuriaMessage,
    JuriaProject,
    JuriaProjectMember,
    JuriaThread,
    JuriaUsage,
)


@admin.register(JuriaProject)
class JuriaProjectAdmin(JureModelAdmin):
    list_display = ("name", "owner", "cabinet", "status_badge", "is_simple", "jurisdiction_code", "updated_at")
    list_filter = ("status", "is_simple", "jurisdiction_code", "preferred_language")
    search_fields = ("name", "description", "owner__email")

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())


@admin.register(JuriaProjectMember)
class JuriaProjectMemberAdmin(JureModelAdmin):
    list_display = ("project", "user", "role", "created_at")
    list_filter = ("role",)


@admin.register(JuriaThread)
class JuriaThreadAdmin(JureModelAdmin):
    list_display = ("title", "project", "mode", "is_archived", "updated_at")
    list_filter = ("mode", "is_archived")


@admin.register(JuriaConversation)
class JuriaConversationAdmin(JureModelAdmin):
    list_display = ("id", "user", "mode", "linked_case", "is_archived", "updated_at")
    list_filter = ("mode", "is_archived")
    search_fields = ("title", "id", "user__email")


@admin.register(JuriaMessage)
class JuriaMessageAdmin(JureModelAdmin):
    list_display = ("id", "thread", "conversation", "role", "mode", "created_at")
    list_filter = ("role", "mode")


@admin.register(JuriaFile)
class JuriaFileAdmin(JureModelAdmin):
    list_display = ("original_name", "project", "ocr_status", "created_at")


@admin.register(JuriaArtifact)
class JuriaArtifactAdmin(JureModelAdmin):
    list_display = ("title", "project", "artifact_type", "current_version", "updated_at")


@admin.register(JuriaActivity)
class JuriaActivityAdmin(JureModelAdmin):
    list_display = ("action", "project", "actor", "created_at")
    list_filter = ("action",)


@admin.register(JuriaUsage)
class JuriaUsageAdmin(JureModelAdmin):
    list_display = ("id", "user", "year", "month", "total_tokens", "total_messages")
    list_filter = ("year", "month")
