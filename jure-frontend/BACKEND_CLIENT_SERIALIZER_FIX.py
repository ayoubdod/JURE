"""
Backend Fix for Client Update Validation Issue
==============================================

Copy this code into your Django backend project.
Replace your existing ClientSerializer with this version.

Location: Usually in something like:
- clients/serializers.py
- apps/clients/serializers.py
- or similar location in your Django project
"""

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Client  # Adjust import path as needed


class ClientSerializer(serializers.ModelSerializer):
    """
    Client Serializer with proper uniqueness validation that excludes
    the current instance when updating.
    """
    
    email = serializers.EmailField()
    phone = serializers.CharField()
    
    class Meta:
        model = Client
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'date_joined',
            'is_active',
            # Add other fields as needed
        ]
        read_only_fields = ['id', 'date_joined']  # Adjust as needed
    
    def validate_email(self, value):
        """
        Validate email uniqueness, excluding current instance when updating.
        """
        instance = self.instance  # None for create, Client instance for update
        
        if instance:
            # Update: exclude current instance
            if Client.objects.filter(email=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError(
                    "This email is already in use by another client."
                )
        else:
            # Create: check if email exists
            if Client.objects.filter(email=value).exists():
                raise serializers.ValidationError(
                    "This email is already in use by another client."
                )
        
        return value
    
    def validate_phone(self, value):
        """
        Validate phone uniqueness, excluding current instance when updating.
        """
        instance = self.instance  # None for create, Client instance for update
        
        if instance:
            # Update: exclude current instance
            if Client.objects.filter(phone=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError(
                    "This phone number is already in use by another client."
                )
        else:
            # Create: check if phone exists
            if Client.objects.filter(phone=value).exists():
                raise serializers.ValidationError(
                    "This phone number is already in use by another client."
                )
        
        return value
    
    def validate(self, attrs):
        """
        Additional validation if needed.
        This method runs after field-level validation.
        """
        # You can add cross-field validation here if needed
        return attrs


# Alternative: If you prefer using the validate() method approach:
class ClientSerializerAlternative(serializers.ModelSerializer):
    """
    Alternative implementation using validate() method.
    Use this if the field-level validation doesn't work for your setup.
    """
    
    class Meta:
        model = Client
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'date_joined',
            'is_active',
        ]
        read_only_fields = ['id', 'date_joined']
    
    def validate(self, attrs):
        """
        Validate email and phone uniqueness, excluding current instance when updating.
        """
        instance = self.instance  # None for create, Client instance for update
        
        # Get email value (from attrs if updating, or from instance if not provided)
        email = attrs.get('email')
        if email is None and instance:
            email = instance.email
        
        # Get phone value
        phone = attrs.get('phone')
        if phone is None and instance:
            phone = instance.phone
        
        # Validate email uniqueness
        if email:
            queryset = Client.objects.filter(email=email)
            if instance:
                queryset = queryset.exclude(pk=instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'email': 'This email is already in use by another client.'
                })
        
        # Validate phone uniqueness
        if phone:
            queryset = Client.objects.filter(phone=phone)
            if instance:
                queryset = queryset.exclude(pk=instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'phone': 'This phone number is already in use by another client.'
                })
        
        return attrs








