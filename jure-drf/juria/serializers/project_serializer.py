from rest_framework import serializers

from juria.constants import (
    JurisdictionCode,
    LanguageCode,
    PermissionLevel,
    ProjectRole,
    ResourceType,
    SourceKind,
)
from juria.models import (
    JuriaProject,
    JuriaProjectMember,
    JuriaProjectPermission,
    JuriaProjectSource,
)
from juria.serializers.common import JuriaPublicUserSerializer
from juria.services.context_engine import build_context_summary


class JuriaProjectPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JuriaProjectPermission
        fields = ("resource", "level")


class JuriaProjectMemberSerializer(serializers.ModelSerializer):
    user = JuriaPublicUserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = JuriaProjectMember
        fields = ("id", "user", "user_id", "role", "created_at")
        read_only_fields = ("id", "created_at")


class JuriaProjectSourceSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()

    class Meta:
        model = JuriaProjectSource
        fields = (
            "id",
            "kind",
            "case_id",
            "case_attachment_id",
            "library_document_id",
            "client_id",
            "juria_file_id",
            "metadata",
            "title",
            "created_at",
        )

    def get_title(self, obj: JuriaProjectSource) -> str:
        if obj.kind == SourceKind.CASE and obj.case:
            return f"{obj.case.reference} — {obj.case.title}"
        if obj.case_attachment:
            return obj.case_attachment.display_name()
        if obj.library_document:
            return obj.library_document.title
        if obj.juria_file:
            return obj.juria_file.original_name
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}".strip()
        return obj.kind


class JuriaProjectListSerializer(serializers.ModelSerializer):
    owner = JuriaPublicUserSerializer(read_only=True)
    linked_case_id = serializers.IntegerField(read_only=True, allow_null=True)
    linked_case_title = serializers.SerializerMethodField()
    linked_case_reference = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    thread_count = serializers.SerializerMethodField()

    class Meta:
        model = JuriaProject
        fields = (
            "id",
            "name",
            "description",
            "status",
            "owner",
            "preferred_language",
            "jurisdiction_code",
            "legal_domain",
            "linked_case_id",
            "linked_case_title",
            "linked_case_reference",
            "is_favorite",
            "is_simple",
            "member_count",
            "thread_count",
            "created_at",
            "updated_at",
            "archived_at",
        )

    def get_linked_case_title(self, obj):
        return obj.linked_case.title if obj.linked_case_id else None

    def get_linked_case_reference(self, obj):
        return obj.linked_case.reference if obj.linked_case_id else None

    def get_member_count(self, obj) -> int:
        count = getattr(obj, "member_count", None)
        if count is not None:
            return count
        return obj.members.count()

    def get_thread_count(self, obj) -> int:
        count = getattr(obj, "thread_count", None)
        if count is not None:
            return count
        return obj.threads.filter(is_deleted=False, is_archived=False).count()


class JuriaProjectDetailSerializer(JuriaProjectListSerializer):
    permissions = JuriaProjectPermissionSerializer(many=True, read_only=True)
    members = JuriaProjectMemberSerializer(many=True, read_only=True)
    sources = JuriaProjectSourceSerializer(many=True, read_only=True)
    context = serializers.SerializerMethodField()
    instructions = serializers.CharField()

    class Meta(JuriaProjectListSerializer.Meta):
        fields = JuriaProjectListSerializer.Meta.fields + (
            "instructions",
            "permissions",
            "members",
            "sources",
            "context",
        )

    def get_context(self, obj):
        return build_context_summary(obj)


class JuriaProjectCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    preferred_language = serializers.ChoiceField(
        choices=LanguageCode.choices, required=False, default=LanguageCode.FR
    )
    jurisdiction_code = serializers.ChoiceField(
        choices=JurisdictionCode.choices, required=False, default=JurisdictionCode.MA
    )
    legal_domain = serializers.CharField(required=False, allow_blank=True, default="")
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    linked_case_id = serializers.IntegerField(required=False, allow_null=True)
    is_favorite = serializers.BooleanField(required=False, default=False)
    is_simple = serializers.BooleanField(required=False, default=False)
    permissions = serializers.DictField(child=serializers.CharField(), required=False)
    case_document_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    library_document_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    connect_calendar = serializers.BooleanField(required=False, default=False)
    connect_tasks = serializers.BooleanField(required=False, default=False)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    member_ids = serializers.ListField(child=serializers.IntegerField(), required=False)


class JuriaProjectUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    preferred_language = serializers.ChoiceField(choices=LanguageCode.choices, required=False)
    jurisdiction_code = serializers.ChoiceField(choices=JurisdictionCode.choices, required=False)
    legal_domain = serializers.CharField(required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    linked_case_id = serializers.IntegerField(required=False, allow_null=True)
    is_favorite = serializers.BooleanField(required=False)
    permissions = serializers.DictField(child=serializers.CharField(), required=False)


class JuriaPermissionUpdateSerializer(serializers.Serializer):
    resource = serializers.ChoiceField(choices=ResourceType.choices)
    level = serializers.ChoiceField(choices=PermissionLevel.choices)


class JuriaMemberInviteSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=ProjectRole.choices, default=ProjectRole.EDITOR)


class JuriaMemberRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=ProjectRole.choices)


class JuriaSourceCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=SourceKind.choices)
    case_id = serializers.IntegerField(required=False, allow_null=True)
    case_attachment_id = serializers.IntegerField(required=False, allow_null=True)
    case_document_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    library_document_id = serializers.IntegerField(required=False, allow_null=True)
    library_document_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    juria_file_id = serializers.UUIDField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False)
