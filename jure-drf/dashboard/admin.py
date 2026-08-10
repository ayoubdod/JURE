from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ActivityLog, Announcement


@admin.register(Announcement)
class AnnouncementAdmin(ModelAdmin):
    list_display = ("title", "is_active", "cabinet", "created")
    list_filter = ("is_active", "cabinet")


@admin.register(ActivityLog)
class ActivityLogAdmin(ModelAdmin):
    list_display = ("kind", "cabinet", "message", "created")
    list_filter = ("kind", "cabinet")
