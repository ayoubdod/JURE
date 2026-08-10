from django.contrib import admin
from modeltranslation.admin import TabbedTranslationAdmin
from unfold.admin import ModelAdmin

from .models import Activity, Contact

admin.site.register(Contact, ModelAdmin)


@admin.register(Activity)
class ActivityAdmin(ModelAdmin, TabbedTranslationAdmin):
    list_display = ("name", "created", "modified")
    list_filter = ("created", "modified")
    search_fields = ("name", "description")
    readonly_fields = ("created", "modified")
