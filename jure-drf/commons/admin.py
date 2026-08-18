from django.contrib import admin
from modeltranslation.admin import TabbedTranslationAdmin
from unfold.admin import ModelAdmin

from .models import Activity, Contact


@admin.register(Contact)
class ContactAdmin(ModelAdmin):
    list_display = ("name", "email", "source", "subject", "created")
    list_filter = ("source", "created")
    search_fields = ("name", "email", "company", "subject", "message")
    readonly_fields = ("created", "modified")


@admin.register(Activity)
class ActivityAdmin(ModelAdmin, TabbedTranslationAdmin):
    list_display = ("name", "created", "modified")
    list_filter = ("created", "modified")
    search_fields = ("name", "description")
    readonly_fields = ("created", "modified")
