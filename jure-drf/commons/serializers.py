from rest_framework import serializers
from .models import Contact, Activity, Function, Tag

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['name', 'email', 'phone', 'message']


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