from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from django.contrib.auth import get_user_model

from chat.models import Conversation

User = get_user_model()


def _dedupe_users(users):
    seen = set()
    unique = []
    for user in users or []:
        if user is None:
            continue
        pk = getattr(user, 'pk', user)
        if pk in seen:
            continue
        seen.add(pk)
        unique.append(user)
    return unique


def _user_cabinet(user):
    return user.get_owned_cabinet_or_none() or getattr(user, 'cabinet', None)


class UserLiteSerializer(serializers.ModelSerializer):
    client_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'image', 'client_type']

    def get_client_type(self, obj):
        # Calendar events pass _user_lite dicts, not User instances.
        if not obj or isinstance(obj, dict):
            return obj.get('client_type') if isinstance(obj, dict) else None
        try:
            profile = obj.firm_client_profile
        except (ObjectDoesNotExist, AttributeError):
            return None
        return getattr(profile, 'client_type', None)


class ConversationLiteSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'type', 'title', 'display_name']

    def get_display_name(self, obj):
        title = (obj.title or '').strip()
        if title:
            return title
        return f'Conversation #{obj.pk}'


def _set_pk_queryset(field, queryset):
    """
    PK fields with many=True become ManyRelatedField (child_relation) or
    ListSerializer (child). Always update the inner RelatedField queryset.
    """
    if field is None:
        return
    inner = getattr(field, 'child_relation', None) or getattr(field, 'child', None)
    if inner is not None and hasattr(inner, 'queryset'):
        inner.queryset = queryset
    elif hasattr(field, 'queryset'):
        field.queryset = queryset

