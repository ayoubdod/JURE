from rest_framework import serializers

from juria.models import JuriaConversation, JuriaThread
from juria.serializers.common import JuriaPublicUserSerializer


class JuriaThreadListSerializer(serializers.ModelSerializer):
    created_by = JuriaPublicUserSerializer(read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model = JuriaThread
        fields = (
            "id",
            "project_id",
            "title",
            "mode",
            "is_archived",
            "created_by",
            "created_at",
            "updated_at",
            "last_message_preview",
            "message_count",
            "conversation_id",
        )

    def get_conversation_id(self, obj) -> str | None:
        conv = obj.legacy_conversations.order_by("created_at").first()
        return str(conv.id) if conv else None

    def get_last_message_preview(self, obj) -> str | None:
        lp = getattr(obj, "last_preview", None)
        if lp is not None:
            return (lp or "")[:200]
        last = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
        if not last:
            return None
        return (last.content or "")[:200]

    def get_message_count(self, obj) -> int:
        count = getattr(obj, "message_count", None)
        if count is not None:
            return count
        return obj.messages.filter(is_deleted=False).count()


class JuriaThreadCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    mode = serializers.ChoiceField(
        choices=JuriaConversation.Mode.choices,
        required=False,
        default=JuriaConversation.Mode.CHAT,
    )


class JuriaThreadUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    mode = serializers.ChoiceField(choices=JuriaConversation.Mode.choices, required=False)
    is_archived = serializers.BooleanField(required=False)
