from django.contrib import admin
from modeltranslation.admin import TabbedTranslationAdmin

from core.unfold_admin import JureModelAdmin
from .models import Activity, Contact, Tag


@admin.register(Contact)
class ContactAdmin(JureModelAdmin):
    list_display = ("name", "email", "source", "subject", "created")
    list_filter = ("source", "created")
    search_fields = ("name", "email", "company", "subject", "message")
    readonly_fields = ("created", "modified")


@admin.register(Tag)
class TagAdmin(JureModelAdmin):
    list_display = ["slug", "created", "modified"]
    search_fields = ["slug"]
    readonly_fields = ["created", "modified"]


@admin.register(Activity)
class ActivityAdmin(JureModelAdmin, TabbedTranslationAdmin):
    list_display = ("name", "created", "modified")
    list_filter = ("created", "modified")
    search_fields = ("name", "description")
    readonly_fields = ("created", "modified")
