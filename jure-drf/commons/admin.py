from django.contrib import admin
from modeltranslation.admin import TranslationAdmin
from .models import Contact, Activity
# Register your models here.

admin.site.register(Contact)

@admin.register(Activity)
class ActivityAdmin(TranslationAdmin):
    list_display = ('name', 'created', 'modified')
    list_filter = ('created', 'modified')
    search_fields = ('name', 'description')
    readonly_fields = ('created', 'modified')
