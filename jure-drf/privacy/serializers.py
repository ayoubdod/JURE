"""Privacy API serializers — never expose encrypted mapping values."""

from __future__ import annotations

from rest_framework import serializers

from privacy.constants import PrivacyMode
from privacy.models import CabinetPrivacyPolicy


class CabinetPrivacyPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CabinetPrivacyPolicy
        fields = (
            "default_mode",
            "require_pseudonymization_for_documents",
            "reidentification_requires_authorization",
            "created",
            "modified",
        )
        read_only_fields = ("created", "modified")

    def validate_default_mode(self, value):
        if value not in PrivacyMode.values:
            raise serializers.ValidationError("Invalid privacy mode.")
        return value


class ReidentifyRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    text = serializers.CharField(allow_blank=False, max_length=500_000)


class ReidentifyResponseSerializer(serializers.Serializer):
    text = serializers.CharField()
    session_id = serializers.UUIDField()


class PrivacyAuditEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.CharField()
    message = serializers.CharField()
    created = serializers.DateTimeField()
    actor_id = serializers.IntegerField(allow_null=True)
    actor_email = serializers.CharField(allow_null=True, required=False)
    entity_id = serializers.CharField(allow_blank=True)
    metadata = serializers.JSONField(allow_null=True)
