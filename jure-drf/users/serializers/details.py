from django.core.exceptions import ObjectDoesNotExist
from dj_rest_auth.serializers import UserDetailsSerializer
from rest_framework import serializers

from cabinets.models import Cabinet
from jurisdictions.scoping import serialize_jurisdiction

from ..models import User
from .address import UserAddressSerializer
from .cabinet_fields import CabinetAttrField, CabinetLogoField, _cabinet_for_user

UserModel = User


class CustomUserDetailsSerializer(UserDetailsSerializer):
    default_address = UserAddressSerializer(read_only=True)
    trade_name = CabinetAttrField('trade_name', serializers.CharField(allow_blank=True, max_length=255))
    logo = CabinetLogoField(required=False, allow_null=True)
    structure_type = CabinetAttrField(
        'structure_type', serializers.CharField(allow_blank=True, allow_null=True, max_length=100)
    )
    business_address = CabinetAttrField(
        'business_address', serializers.CharField(allow_blank=True, max_length=255)
    )
    team_size = CabinetAttrField('team_size', serializers.IntegerField(min_value=1))
    website = CabinetAttrField(
        'website', serializers.URLField(allow_blank=True, allow_null=True)
    )
    practice_type = CabinetAttrField(
        'practice_type',
        serializers.ChoiceField(choices=Cabinet.PracticeType.choices, allow_blank=True, allow_null=True),
    )
    cabinet_id = serializers.SerializerMethodField()
    jurisdiction = serializers.SerializerMethodField()
    is_platform_admin = serializers.SerializerMethodField()
    client_type = serializers.SerializerMethodField()

    class Meta:
        extra_fields = []
        model = UserModel
        fields = [
            'id',
            'email',
            'phone',
            'first_name',
            'last_name',
            'bio',
            'default_address',
            'image',
            'affiliation_code',
            'trade_name',
            'logo',
            'structure_type',
            'business_address',
            'team_size',
            'website',
            'practice_type',
            'cabinet_id',
            'jurisdiction',
            'role',
            'is_platform_admin',
            'client_type',
            'accept_terms',
            'accept_data_processing',
        ]
        read_only_fields = ('email', 'cabinet_id', 'jurisdiction', 'role', 'is_platform_admin', 'client_type')

    def to_representation(self, instance):
        """Build absolute URL for logo in response."""
        data = super().to_representation(instance)
        logo = data.get('logo')
        if logo and not str(logo).startswith('http'):
            request = self.context.get('request') if hasattr(self, 'context') else None
            if request:
                data['logo'] = request.build_absolute_uri(logo)
        return data

    def get_cabinet_id(self, obj):
        cabinet = _cabinet_for_user(obj)
        return getattr(cabinet, "id", None)

    def get_jurisdiction(self, obj):
        cabinet = _cabinet_for_user(obj)
        if cabinet is None:
            return None
        return serialize_jurisdiction(getattr(cabinet, "jurisdiction", None))

    def get_is_platform_admin(self, obj):
        return bool(getattr(obj, "is_staff", False) or getattr(obj, "is_superuser", False))

    def get_client_type(self, obj):
        try:
            profile = obj.firm_client_profile
        except ObjectDoesNotExist:
            return None
        return getattr(profile, "client_type", None)

    def update(self, instance, validated_data):
        """Update user and sync cabinet fields (logo, etc.) to the cabinet."""
        cabinet = _cabinet_for_user(instance)
        cabinet_fields = ['logo', 'trade_name', 'structure_type', 'business_address', 'team_size', 'website', 'practice_type']
        cabinet_data = {}
        for field in cabinet_fields:
            if field in validated_data:
                cabinet_data[field] = validated_data.pop(field)

        if cabinet and cabinet_data and cabinet.owner_id == instance.id:
            for key, value in cabinet_data.items():
                setattr(cabinet, key, value)
            cabinet.save(update_fields=list(cabinet_data.keys()))

        return super().update(instance, validated_data)
