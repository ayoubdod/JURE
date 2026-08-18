from rest_framework import serializers
from .models import Contact, Activity, Function, Tag

class ContactSerializer(serializers.ModelSerializer):
    locale = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=16)

    class Meta:
        model = Contact
        fields = ["name", "email", "phone", "company", "subject", "source", "message", "locale"]
        extra_kwargs = {
            "phone": {"required": False, "allow_blank": True, "allow_null": True},
            "company": {"required": False, "allow_blank": True},
            "subject": {"required": False, "allow_blank": True},
            "source": {"required": False, "allow_blank": True},
        }

    def validate_phone(self, value):
        return value or None

    def validate_source(self, value):
        cleaned = (value or "").strip()[:64]
        return cleaned or "contact"

    def create(self, validated_data):
        validated_data.pop("locale", None)
        return super().create(validated_data)


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            'id',
            'name_en',
            'name_ar',
            'name_fr',
            'description_en',
            'description_ar',
            'description_fr',
            'image',
            'slug'
        ]


class FunctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Function
        fields = [
            'id',
            'name_en',
            'name_ar',
            'name_fr',
            'description_en',
            'description_ar',
            'description_fr',
            'for_company',
            'slug'
        ]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = [
            'id',
            'slug'
        ]