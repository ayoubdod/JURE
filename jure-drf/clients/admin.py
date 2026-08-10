from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Client


@admin.register(Client)
class ClientAdmin(ModelAdmin):
    list_display = ("id", "user", "client_type", "ice", "if_number")
    list_filter = ("client_type",)
    search_fields = ("user__email", "ice", "if_number")
    raw_id_fields = ("user",)
