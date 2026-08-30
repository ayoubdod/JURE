from rest_framework import serializers

from juria.constants import ArtifactType
from juria.models import JuriaActivity, JuriaArtifact, JuriaArtifactVersion, JuriaFile
from juria.serializers.common import JuriaPublicUserSerializer


class JuriaFileSerializer(serializers.ModelSerializer):
    uploaded_by = JuriaPublicUserSerializer(read_only=True)

    class Meta:
        model = JuriaFile
        fields = (
            "id",
            "original_name",
            "content_type",
            "file_kind",
            "size_bytes",
            "page_count",
            "ocr_status",
            "uploaded_by",
            "is_removed",
            "created_at",
        )


class JuriaArtifactVersionSerializer(serializers.ModelSerializer):
    created_by = JuriaPublicUserSerializer(read_only=True)

    class Meta:
        model = JuriaArtifactVersion
        fields = (
            "id",
            "version_number",
            "content_html",
            "content_markdown",
            "created_by",
            "created_at",
            "note",
        )


class JuriaArtifactSerializer(serializers.ModelSerializer):
    created_by = JuriaPublicUserSerializer(read_only=True)
    versions = JuriaArtifactVersionSerializer(many=True, read_only=True)

    class Meta:
        model = JuriaArtifact
        fields = (
            "id",
            "project_id",
            "thread_id",
            "title",
            "artifact_type",
            "content_html",
            "content_markdown",
            "current_version",
            "created_by",
            "created_at",
            "updated_at",
            "versions",
        )


class JuriaArtifactWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    artifact_type = serializers.ChoiceField(choices=ArtifactType.choices, required=False)
    content_html = serializers.CharField(required=False, allow_blank=True)
    content_markdown = serializers.CharField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    thread_id = serializers.UUIDField(required=False, allow_null=True)


class JuriaActivitySerializer(serializers.ModelSerializer):
    actor = JuriaPublicUserSerializer(read_only=True)

    class Meta:
        model = JuriaActivity
        fields = ("id", "action", "actor", "metadata", "created_at")
