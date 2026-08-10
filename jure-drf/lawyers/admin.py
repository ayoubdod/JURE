from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import LawyerProfile

admin.site.register(LawyerProfile, ModelAdmin)
