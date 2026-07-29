from django.contrib import admin
from .models import Case


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['reference', 'title', 'case_type', 'status', 'court', 'assigned_to', 'client']
    list_filter = ['case_type', 'status', 'category']
    search_fields = ['reference', 'title', 'description']