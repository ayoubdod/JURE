from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from ..models import Cabinet


class CabinetSerializer(ModelSerializer):
    """Serializer for cabinet profile (logo, trade_name, etc.). Used for PATCH updates."""

    jurisdiction_code = serializers.SerializerMethodField()
    practice_type = serializers.ChoiceField(
        choices=Cabinet.PracticeType.choices,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Cabinet
        fields = [
            'id',
            'trade_name',
            'description',
            'business_address',
            'founded_date',
            'structure_type',
            'practice_type',
            'jurisdiction',
            'jurisdiction_code',
            'team_size',
            'website',
            'logo',
        ]
        read_only_fields = ['id', 'jurisdiction', 'jurisdiction_code']

    def get_jurisdiction_code(self, obj):
        jur = getattr(obj, "jurisdiction", None)
        return getattr(jur, "code", None)

