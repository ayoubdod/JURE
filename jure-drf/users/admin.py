from django.contrib import admin
from users.models import User, UserAddress, PasswordSetupToken

# Register your models here.
admin.site.register(User)
admin.site.register(UserAddress)


@admin.register(PasswordSetupToken)
class PasswordSetupTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "used_at", "is_valid")
    list_filter = ("used_at",)
    search_fields = ("user__email", "token")
    readonly_fields = ("token",)