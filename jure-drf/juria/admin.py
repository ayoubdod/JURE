from django.contrib import admin
from unfold.admin import ModelAdmin

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
class JuriaProjectAdmin(ModelAdmin):
    list_display = ("name", "owner", "cabinet", "status", "is_simple", "jurisdiction_code", "updated_at")
    list_filter = ("status", "is_simple", "jurisdiction_code", "preferred_language")
    search_fields = ("name", "description", "owner__email")


@admin.register(JuriaProjectMember)
class JuriaProjectMemberAdmin(ModelAdmin):
    list_display = ("project", "user", "role", "created_at")
    list_filter = ("role",)


@admin.register(JuriaThread)
class JuriaThreadAdmin(ModelAdmin):
    list_display = ("title", "project", "mode", "is_archived", "updated_at")
    list_filter = ("mode", "is_archived")


@admin.register(JuriaConversation)
class JuriaConversationAdmin(ModelAdmin):
    list_display = ("id", "user", "mode", "linked_case", "is_archived", "updated_at")
    list_filter = ("mode", "is_archived")
    search_fields = ("title", "id", "user__email")


@admin.register(JuriaMessage)
class JuriaMessageAdmin(ModelAdmin):
    list_display = ("id", "thread", "conversation", "role", "mode", "created_at")
    list_filter = ("role", "mode")


@admin.register(JuriaFile)
class JuriaFileAdmin(ModelAdmin):
    list_display = ("original_name", "project", "ocr_status", "created_at")


@admin.register(JuriaArtifact)
class JuriaArtifactAdmin(ModelAdmin):
    list_display = ("title", "project", "artifact_type", "current_version", "updated_at")


@admin.register(JuriaActivity)
class JuriaActivityAdmin(ModelAdmin):
    list_display = ("action", "project", "actor", "created_at")
    list_filter = ("action",)


@admin.register(JuriaUsage)
class JuriaUsageAdmin(ModelAdmin):
    list_display = ("id", "user", "year", "month", "total_tokens", "total_messages")
    list_filter = ("year", "month")
