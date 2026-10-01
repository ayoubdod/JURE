from django.contrib import admin

from privacy.models import CabinetPrivacyPolicy, PseudonymMapping, PseudonymMappingSession


@admin.register(CabinetPrivacyPolicy)
class CabinetPrivacyPolicyAdmin(admin.ModelAdmin):
    list_display = (
        "cabinet",
        "default_mode",
        "require_pseudonymization_for_documents",
        "reidentification_requires_authorization",
    )
    list_filter = ("default_mode",)
    raw_id_fields = ("cabinet",)


@admin.register(PseudonymMappingSession)
class PseudonymMappingSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "cabinet", "mode", "jurisdiction_code", "created_at")
    list_filter = ("mode", "jurisdiction_code")
    raw_id_fields = ("cabinet", "project", "case", "created_by")
    readonly_fields = ("entity_counts", "created_at")


@admin.register(PseudonymMapping)
class PseudonymMappingAdmin(admin.ModelAdmin):
    list_display = ("token", "entity_type", "cabinet", "session", "created_at")
    list_filter = ("entity_type",)
    raw_id_fields = ("session", "cabinet")
    readonly_fields = ("token", "entity_type", "value_hash", "encrypted_value", "created_at")

    def has_change_permission(self, request, obj=None):
        return False
