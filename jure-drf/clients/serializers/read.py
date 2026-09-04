from rest_framework import serializers

from users.models import User

from .fields import ClientCaseSerializer, _firm_client_profile


class ClientReadSerializer(serializers.ModelSerializer):
    cases = ClientCaseSerializer(many=True, read_only=True, source='client_cases')
    cases_count = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    ice = serializers.SerializerMethodField()
    fiscal_if = serializers.SerializerMethodField()
    client_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'address', 'cases_count', 'cases',
            'is_active', 'date_joined',
            'ice', 'fiscal_if', 'client_type',
        ]

    def get_ice(self, obj):
        profile = _firm_client_profile(obj)
        return profile.ice if profile else None

    def get_fiscal_if(self, obj):
        profile = _firm_client_profile(obj)
        return profile.if_number if profile else None

    def get_client_type(self, obj):
        profile = _firm_client_profile(obj)
        return profile.client_type if profile else 'INDIVIDUAL'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Frontend create/update maps fiscal_if → API `if`
        data['if'] = data.get('fiscal_if')
        return data

