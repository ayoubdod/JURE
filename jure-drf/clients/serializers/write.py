from django_countries.serializer_fields import CountryField
from rest_framework import serializers

from users.models import User


class ClientWriteSerializer(serializers.ModelSerializer):
    # Explicit field overrides Meta.extra_kwargs — must set required=False here.
    # Frontend create form has no country; view defaults missing values to "US".
    country = CountryField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'address', 'is_active', 'country']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'phone': {'required': True},
            'is_active': {'required': False, 'read_only': True},
            'address': {'required': False, 'allow_blank': True, 'allow_null': True},
            'country': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
    
    def validate_email(self, value):
        """Check that the email is not already taken (case-insensitive)."""
        # Normalize email to lowercase
        if value:
            value = value.lower().strip()
        if not value:
            raise serializers.ValidationError("Email is required.")
        queryset = User.objects.filter(email__iexact=value)
        # Exclude current instance during updates
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
        # Exclude current instance during updates
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
        
