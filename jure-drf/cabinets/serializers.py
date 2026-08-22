# cabinets/serializers.py
from rest_framework.serializers import ModelSerializer, ValidationError
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_flex_fields.serializers import FlexFieldsModelSerializer
from django_countries.serializer_fields import CountryField
from .permissions import get_role_permissions
from .models import Cabinet

User = get_user_model()


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

class CabinetMemberSelectionSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email"]

class CabinetMemberSerializer(FlexFieldsModelSerializer):
    assigned_in_progress_cases_count = serializers.IntegerField(
        source='get_assigned_in_progress_cases_count', read_only=True
    )
    permissions = serializers.SerializerMethodField()
    country = CountryField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id',
            "email",
            "first_name",
            "last_name",
            "image",
            "phone",
            "country",
            "address",
            "is_active",
            "date_joined",
            "assigned_in_progress_cases_count",
            "role",
            "permissions",
        ]
        read_only_fields = ["date_joined", "assigned_in_progress_cases_count"]
        expandable_fields = {
            'assigned_cases': ('cases.serializers.CaseSerializer', {'many': True}),
            'documents': ('library.serializers.DocumentSerializer', {'many': True}),
        }

    def get_permissions(self, obj:User):
        """Return list of permissions for this member based on their role"""
        try:
            role = obj.role
            if not role:
                return []
            
            # Get role-based permissions
            permissions = get_role_permissions(role)
            
            # # Add custom permissions if any
            # if obj.custom_permissions:
            #     permissions = list(set(permissions + member.custom_permissions))
            
            return permissions
        except User.DoesNotExist:
            # If user is cabinet owner, return all permissions
            if hasattr(obj, 'owned_cabinet') and obj.owned_cabinet:
                return get_role_permissions('OWNER')
            return []

class CabinetMemberCreateSerializer(ModelSerializer):
    """
    Used only for POST. Generates a temporary password and marks the user as a cabinet member.
    """
    # Explicit field overrides Meta.extra_kwargs — must set required=False here.
    # Frontend invite form has no country; view defaults missing values to "US".
    country = CountryField(required=False, allow_blank=True, allow_null=True)
    role = serializers.ChoiceField(
        choices=User.Role.choices,
        required=False,
        default=User.Role.VIEWER
    )
    # Password is generated automatically, not provided by user
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 
            'address', 'country', 'is_active', 'role', 'password'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'phone': {'required': True},
            'address': {'required': False, 'allow_blank': True, 'allow_null': True},
            'country': {'required': False, 'allow_blank': True, 'allow_null': True},
            'is_active': {'required': False, 'default': True},
            'role': {'required': False},
            'password': {'write_only': True, 'required': False, 'allow_blank': True},
        }
    
    def validate_email(self, value):
        """Check format (return specific error for invalid email) and uniqueness."""
        if value:
            value = value.lower().strip()
        if not value:
            raise serializers.ValidationError("Email is required.")
        try:
            from django.core.validators import validate_email as django_validate_email
            django_validate_email(value)
        except Exception:  # ValidationError or any email format error
            raise serializers.ValidationError("Invalid email address.")
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_phone(self, value):
        """Check that the phone number is not already taken."""
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        queryset = User.objects.filter(phone=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value
    
    def validate_first_name(self, value):
        """Validate first name."""
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required.")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("First name must contain at least 2 characters.")
        return value.strip()
    
    def validate_last_name(self, value):
        """Validate last name."""
        if not value or not value.strip():
            raise serializers.ValidationError("Last name is required.")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Last name must contain at least 2 characters.")
        return value.strip()
    
    def validate(self, attrs):
        """Remove password from validated_data if present - it's auto-generated."""
        attrs.pop('password', None)
        return attrs
    
    def create(self, validated_data):
        """
        Override create to prevent automatic instance creation.
        The instance will be created in perform_create() of the view.
        """
        # Don't create the instance here - let perform_create handle it
        # This prevents password validation error
        return None
