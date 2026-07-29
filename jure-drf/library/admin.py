from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'created', 'modified']
    list_filter = ['category', 'tags', 'created']
    search_fields = ['title', 'description']
    filter_horizontal = ['tags']
    readonly_fields = ['created', 'modified']
