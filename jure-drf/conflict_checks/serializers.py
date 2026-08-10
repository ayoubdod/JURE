from rest_framework import serializers

from cases.models import Case

from .models import ConflictCheck, PotentialMatch


class PotentialMatchSerializer(serializers.ModelSerializer):
    matter_reference = serializers.CharField(source="matter.reference", read_only=True)
    matter_title = serializers.CharField(source="matter.title", read_only=True)
    matter_status = serializers.CharField(source="matter.status", read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    match_type_label = serializers.CharField(source="get_match_type_display", read_only=True)
    review_status_label = serializers.CharField(source="get_review_status_display", read_only=True)

    class Meta:
        model = PotentialMatch
        fields = [
            "id",
            "entity_type",
            "entity_id",
            "entity_name",
            "matter",
            "matter_reference",
            "matter_title",
            "matter_status",
            "role",
            "role_label",
            "match_type",
            "match_type_label",
            "confidence",
            "match_reason",
            "review_status",
            "review_status_label",
            "reviewed_by",
            "reviewed_at",
            "notes",
            "created",
        ]
        read_only_fields = [
            "id",
            "entity_type",
            "entity_id",
            "entity_name",
            "matter",
            "matter_reference",
            "matter_title",
            "matter_status",
            "role",
            "role_label",
            "match_type",
            "match_type_label",
            "confidence",
            "match_reason",
            "reviewed_by",
            "reviewed_at",
            "created",
        ]


class PotentialMatchReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PotentialMatch
        fields = ["review_status", "notes"]


class ConflictCheckSerializer(serializers.ModelSerializer):
    matches = PotentialMatchSerializer(many=True, read_only=True)
    exact_matches = serializers.SerializerMethodField()
    potential_matches = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    initiated_by_name = serializers.SerializerMethodField()
    matter_reference = serializers.CharField(
        source="matter.reference", read_only=True, allow_null=True
    )
    disclaimer = serializers.SerializerMethodField()

    class Meta:
        model = ConflictCheck
        fields = [
            "id",
            "search_query",
            "result_count",
            "status",
            "status_label",
            "notes",
            "matter",
            "matter_reference",
            "initiated_by",
            "initiated_by_name",
            "reviewed_by",
            "reviewed_at",
            "matches",
            "exact_matches",
            "potential_matches",
            "disclaimer",
            "created",
            "modified",
        ]
        read_only_fields = [
            "id",
            "search_query",
            "result_count",
            "initiated_by",
            "initiated_by_name",
            "reviewed_by",
            "reviewed_at",
            "matches",
            "exact_matches",
            "potential_matches",
            "disclaimer",
            "created",
            "modified",
            "matter",
            "matter_reference",
        ]

    def get_initiated_by_name(self, obj: ConflictCheck) -> str | None:
        u = obj.initiated_by
        if not u:
            return None
        parts = [p for p in (u.first_name or "", u.last_name or "") if p]
        return " ".join(parts).strip() or u.email

    def get_exact_matches(self, obj: ConflictCheck):
        qs = obj.matches.filter(match_type=PotentialMatch.MatchType.EXACT)
        return PotentialMatchSerializer(qs, many=True).data

    def get_potential_matches(self, obj: ConflictCheck):
        qs = obj.matches.exclude(match_type=PotentialMatch.MatchType.EXACT)
        return PotentialMatchSerializer(qs, many=True).data

    def get_disclaimer(self, obj: ConflictCheck) -> str:
        return (
            "Conflict Check identifies potential matches within the records accessible "
            "to your cabinet. It does not constitute a legal determination that a "
            "conflict exists or does not exist."
        )


class ConflictCheckReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConflictCheck
        fields = ["status", "notes"]


class ConflictSearchSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=2, max_length=255)
    matter_id = serializers.IntegerField(required=False, allow_null=True)
    exclude_matter_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_matter_id(self, value):
        if value is None:
            return value
        cabinet = self.context.get("cabinet")
        if not cabinet or not Case.objects.filter(pk=value, cabinet=cabinet).exists():
            raise serializers.ValidationError("Matter not found in your cabinet.")
        return value

    def validate_exclude_matter_id(self, value):
        return self.validate_matter_id(value)
