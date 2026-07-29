from django.contrib import admin

from juria.models import JuriaConversation, JuriaMessage, JuriaUsage


@admin.register(JuriaConversation)
class JuriaConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "mode", "linked_case", "is_archived", "updated_at")
    list_filter = ("mode", "is_archived")
    search_fields = ("title", "id", "user__email")


@admin.register(JuriaMessage)
class JuriaMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "mode", "created_at")
    list_filter = ("role", "mode")


@admin.register(JuriaUsage)
class JuriaUsageAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "year", "month", "total_tokens", "total_messages")
    list_filter = ("year", "month")
