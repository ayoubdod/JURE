from django.contrib import admin

from core.unfold_admin import JureModelAdmin
from cookie_consent.models import CookieConsent, CookieConsentEvent


class _ReadOnlyConsentAdmin(JureModelAdmin):
    """Staff may inspect decisions. Writes go through the API so the log stays consistent."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return bool(request.user and request.user.is_superuser)


@admin.register(CookieConsent)
class CookieConsentAdmin(_ReadOnlyConsentAdmin):
    list_display = (
        "id",
        "user",
        "action",
        "functional",
        "analytics",
        "policy_version",
        "updated_at",
    )
    list_filter = ("action", "policy_version", "functional", "analytics")
    search_fields = ("anonymous_id",)
    readonly_fields = (
        "id",
        "user",
        "anonymous_id",
        "action",
        "functional",
        "analytics",
        "policy_version",
        "created_at",
        "updated_at",
    )
    raw_id_fields = ("user",)


@admin.register(CookieConsentEvent)
class CookieConsentEventAdmin(_ReadOnlyConsentAdmin):
    list_display = (
        "id",
        "user",
        "action",
        "functional",
        "analytics",
        "policy_version",
        "created_at",
    )
    list_filter = ("action", "policy_version")
    search_fields = ("anonymous_id",)
    readonly_fields = (
        "id",
        "user",
        "anonymous_id",
        "action",
        "functional",
        "analytics",
        "policy_version",
        "created_at",
    )
    raw_id_fields = ("user",)
