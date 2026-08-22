from rest_framework import serializers

from .models import Jurisdiction


class JurisdictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Jurisdiction
        fields = [
            "id",
            "code",
            "name",
            "country_code",
            "legal_system",
            "default_language",
            "status",
        ]
        read_only_fields = fields
