from rest_framework import serializers

from cases.models import Case

from .models import ResearchNote


class ResearchNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    matter_reference = serializers.CharField(
        source="matter.reference", read_only=True, allow_null=True
    )
    matter_title = serializers.CharField(
        source="matter.title", read_only=True, allow_null=True
    )

    class Meta:
        model = ResearchNote
        fields = [
            "id",
            "title",
            "citation",
            "content",
            "matter",
            "matter_reference",
            "matter_title",
            "author",
            "author_name",
            "created",
            "modified",
        ]
        read_only_fields = [
            "id",
            "author",
            "author_name",
            "matter_reference",
            "matter_title",
            "created",
            "modified",
        ]

    def get_author_name(self, obj: ResearchNote) -> str | None:
        u = obj.author
        if not u:
            return None
        parts = [p for p in (u.first_name or "", u.last_name or "") if p]
        return " ".join(parts).strip() or u.email

    def validate_title(self, value: str) -> str:
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("Title is required.")
        return title

    def validate_matter(self, value):
        if value is None:
            return value
        cabinet = self.context.get("cabinet")
        if cabinet is None:
            return value
        if value.cabinet_id != cabinet.id:
            raise serializers.ValidationError("Matter not found in your cabinet.")
        return value

    def validate(self, attrs):
        # On create/update, matter may arrive as PK via PrimaryKeyRelatedField.
        matter = attrs.get("matter", serializers.empty)
        if matter is serializers.empty:
            return attrs
        if matter is None:
            return attrs
        cabinet = self.context.get("cabinet")
        if cabinet and getattr(matter, "cabinet_id", None) != cabinet.id:
            raise serializers.ValidationError(
                {"matter": "Matter not found in your cabinet."}
            )
        return attrs


class ResearchNoteWriteSerializer(ResearchNoteSerializer):
    """Accept matter as optional PK; enforce cabinet ownership in validate_matter."""

    matter = serializers.PrimaryKeyRelatedField(
        queryset=Case.objects.all(),
        required=False,
        allow_null=True,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        cabinet = self.context.get("cabinet")
        if cabinet is not None:
            self.fields["matter"].queryset = Case.objects.filter(cabinet=cabinet)
