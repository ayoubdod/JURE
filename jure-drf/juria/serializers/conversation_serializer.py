from rest_framework import serializers

from juria.models import JuriaConversation, JuriaMessage


def build_case_context(case) -> dict:
    """Map a Case instance to the dict expected by Juria API prompts."""
    legal_arguments = ""
    data = case.case_specific_data or {}
    if isinstance(data, dict):
        legal_arguments = data.get("legalArguments") or data.get("legal_arguments") or ""
    jurisdiction = ""
    cab = getattr(case, "cabinet", None)
    jur = getattr(cab, "jurisdiction", None) if cab else None
    if jur:
        jurisdiction = getattr(jur, "name", "") or getattr(jur, "code", "") or ""
    return {
        "reference": case.reference,
        "title": case.title,
        "caseType": case.case_type,
        "status": case.status,
        "description": case.description or "",
        "legalArguments": legal_arguments,
        "court": case.court or "",
        "jurisdiction": jurisdiction,
    }


class JuriaConversationListSerializer(serializers.ModelSerializer):
    linked_case_id = serializers.IntegerField(read_only=True, allow_null=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = JuriaConversation
        fields = (
            "id",
            "title",
            "mode",
            "linked_case_id",
            "is_archived",
            "created_at",
            "updated_at",
            "last_message_preview",
            "project_id",
            "thread_id",
        )

    def get_last_message_preview(self, obj: JuriaConversation) -> str | None:
        lp = getattr(obj, "last_preview", None)
        if lp is not None:
            return (lp or "")[:200]
        last = obj.messages.order_by("-created_at").first()
        if not last:
            return None
        return (last.content or "")[:200]


class JuriaMessageNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = JuriaMessage
        fields = (
            "id",
            "role",
            "content",
            "mode",
            "has_attachment",
            "attachment_name",
            "attachment_type",
            "tokens_used",
            "response_time_ms",
            "juria_message_id",
            "generated_document_path",
            "created_at",
        )


class JuriaConversationDetailSerializer(serializers.ModelSerializer):
    linked_case_id = serializers.IntegerField(read_only=True, allow_null=True)
    messages = JuriaMessageNestedSerializer(many=True, read_only=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = JuriaConversation
        fields = (
            "id",
            "title",
            "mode",
            "linked_case_id",
            "is_archived",
            "created_at",
            "updated_at",
            "messages",
            "last_message_preview",
            "project_id",
            "thread_id",
        )

    def get_last_message_preview(self, obj: JuriaConversation) -> str | None:
        last = obj.messages.order_by("-created_at").first() if hasattr(obj, "messages") else None
        if not last:
            return None
        return (last.content or "")[:200]


class JuriaConversationCreateSerializer(serializers.ModelSerializer):
    linked_case_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    title = serializers.CharField(required=False, allow_blank=True, max_length=200)

    class Meta:
        model = JuriaConversation
        fields = ("id", "mode", "linked_case_id", "title")
        read_only_fields = ("id",)

    def validate(self, attrs):
        linked = attrs.get("linked_case_id")
        if linked is not None and not isinstance(linked, int):
            raise serializers.ValidationError({"linked_case_id": "Invalid case id."})
        return attrs
