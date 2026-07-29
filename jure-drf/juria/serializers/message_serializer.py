from rest_framework import serializers


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


class JuriaDraftRequestSerializer(serializers.Serializer):
    document_type = serializers.CharField(required=True)
    parameters = serializers.DictField(required=True)
    linked_case_id = serializers.IntegerField(required=False, allow_null=True)
