from django.contrib import admin
from .models import Announcement, ActivityLog

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "cabinet", "created")
    list_filter = ("is_active", "cabinet")

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("kind", "cabinet", "message", "created")
    list_filter = ("kind", "cabinet")
