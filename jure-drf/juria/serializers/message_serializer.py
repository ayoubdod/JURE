from rest_framework import serializers

from juria.models import JuriaMessage, JuriaMessageVersion
from juria.serializers.common import JuriaPublicUserSerializer


class JuriaMessageVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JuriaMessageVersion
        fields = ("id", "version_number", "content", "created_at")


class JuriaMessageSerializer(serializers.ModelSerializer):
    author = JuriaPublicUserSerializer(read_only=True)
    versions = JuriaMessageVersionSerializer(many=True, read_only=True)

    class Meta:
        model = JuriaMessage
        fields = (
            "id",
            "thread_id",
            "conversation_id",
            "role",
            "content",
            "mode",
            "language",
            "author",
            "has_attachment",
            "attachment_name",
            "attachment_type",
            "tokens_used",
            "response_time_ms",
            "juria_message_id",
            "generated_document_path",
            "sources",
            "analysis",
            "proposed_actions",
            "is_deleted",
            "is_superseded",
            "edited_at",
            "parent_message_id",
            "versions",
            "created_at",
        )


class JuriaUserMessageResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    role = serializers.CharField()
    content = serializers.CharField()
    created_at = serializers.DateTimeField()


class JuriaAssistantMessageResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    role = serializers.CharField()
    content = serializers.CharField()
    suggestions = serializers.ListField(child=serializers.CharField(), required=False)
    tokens_used = serializers.IntegerField(required=False, allow_null=True)
    created_at = serializers.DateTimeField()


class JuriaMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(required=True, allow_blank=False)
    file_name = serializers.CharField(required=False, allow_blank=True, default="")
    language = serializers.CharField(required=False, allow_blank=True, default="")
    mode = serializers.CharField(required=False, allow_blank=True, default="")


class JuriaMessageEditSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, allow_blank=False)
    language = serializers.CharField(required=False, allow_blank=True, default="")
    regenerate = serializers.BooleanField(required=False, default=True)


class JuriaDraftRequestSerializer(serializers.Serializer):
    document_type = serializers.CharField(required=True)
    parameters = serializers.DictField(required=True)
    linked_case_id = serializers.IntegerField(required=False, allow_null=True)
    language = serializers.CharField(required=False, allow_blank=True, default="")
    title = serializers.CharField(required=False, allow_blank=True, default="")
