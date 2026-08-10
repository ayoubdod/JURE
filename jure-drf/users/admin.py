from django.contrib import admin
from unfold.admin import ModelAdmin

from users.models import PasswordSetupToken, User, UserAddress

admin.site.register(User, ModelAdmin)
admin.site.register(UserAddress, ModelAdmin)


@admin.register(PasswordSetupToken)
class PasswordSetupTokenAdmin(ModelAdmin):
    list_display = ("user", "expires_at", "used_at", "is_valid")
    list_filter = ("used_at",)
    search_fields = ("user__email", "token")
    readonly_fields = ("token",)
