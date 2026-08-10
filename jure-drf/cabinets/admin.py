from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Cabinet

admin.site.register(Cabinet, ModelAdmin)
