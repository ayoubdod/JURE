from __future__ import annotations

from rest_framework import serializers

from consultations.models import (
    ConsultationAttachment,
    ConsultationComment,
    ConsultationEvent,
    ConsultationRequest,
)
from consultations.permissions import is_cabinet_staff, is_portal_client


class ConsultationAttachmentSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    uploadedByName = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationAttachment
        fields = (
            "id",
            "name",
            "original_name",
            "url",
            "uploaded_by",
            "uploadedByName",
            "created",
        )
        read_only_fields = fields

    def get_name(self, obj):
        return obj.display_name()

    def get_uploadedByName(self, obj):
        user = obj.uploaded_by
        if not user:
            return ""
        return user.get_full_name() or user.email

    def get_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class ConsultationCommentSerializer(serializers.ModelSerializer):
    authorName = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationComment
        fields = (
            "id",
            "content",
            "visibility",
            "author",
            "authorName",
            "created",
        )
        read_only_fields = ("id", "author", "authorName", "created")

    def get_authorName(self, obj):
        user = obj.author
        if not user:
            return ""
        return user.get_full_name() or user.email


class ConsultationEventSerializer(serializers.ModelSerializer):
    actorName = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationEvent
        fields = (
            "id",
            "event_type",
            "actor",
            "actorName",
            "metadata",
            "client_visible",
            "created",
        )
        read_only_fields = fields

    def get_actorName(self, obj):
        user = obj.actor
        if not user:
            return ""
        return user.get_full_name() or user.email


class UserBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    firstName = serializers.CharField(source="first_name")
    lastName = serializers.CharField(source="last_name")
    email = serializers.EmailField()
    fullName = serializers.SerializerMethodField()

    def get_fullName(self, obj):
        return obj.get_full_name() or obj.email


class ConsultationRequestSerializer(serializers.ModelSerializer):
    client = UserBriefSerializer(read_only=True)
    assignedLawyer = UserBriefSerializer(source="assigned_lawyer", read_only=True)
    relatedCaseId = serializers.IntegerField(source="related_case_id", read_only=True)
    relatedCaseTitle = serializers.SerializerMethodField()
    conversationId = serializers.IntegerField(source="conversation_id", read_only=True)
    chatAvailable = serializers.BooleanField(source="chat_available", read_only=True)
    comments = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    attachments = ConsultationAttachmentSerializer(many=True, read_only=True)
    preferredFormat = serializers.CharField(source="preferred_format")
    preferredDatetime = serializers.CharField(source="preferred_datetime", allow_blank=True)
    legalArea = serializers.CharField(source="legal_area")
    createdAt = serializers.DateTimeField(source="created", read_only=True)
    updatedAt = serializers.DateTimeField(source="modified", read_only=True)
    confirmedAt = serializers.DateTimeField(source="confirmed_at", read_only=True)
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)

    class Meta:
        model = ConsultationRequest
        fields = (
            "id",
            "reference",
            "subject",
            "legalArea",
            "legal_area",
            "description",
            "preferredFormat",
            "preferred_format",
            "preferredDatetime",
            "preferred_datetime",
            "status",
            "priority",
            "client",
            "assignedLawyer",
            "relatedCaseId",
            "relatedCaseTitle",
            "conversationId",
            "chatAvailable",
            "comments",
            "events",
            "attachments",
            "createdAt",
            "updatedAt",
            "confirmedAt",
            "completedAt",
        )
        read_only_fields = (
            "id",
            "reference",
            "status",
            "client",
            "assignedLawyer",
            "conversationId",
            "chatAvailable",
            "comments",
            "events",
            "attachments",
            "createdAt",
            "updatedAt",
            "confirmedAt",
            "completedAt",
        )

    def get_relatedCaseTitle(self, obj):
        case = obj.related_case
        return case.title if case else None

    def get_comments(self, obj):
        request = self.context.get("request")
        qs = obj.comments.select_related("author").all()
        if request and is_portal_client(request.user):
            qs = qs.filter(visibility=ConsultationComment.Visibility.CLIENT)
        return ConsultationCommentSerializer(qs, many=True, context=self.context).data

    def get_events(self, obj):
        request = self.context.get("request")
        qs = obj.events.select_related("actor").all()
        if request and is_portal_client(request.user):
            qs = qs.filter(client_visible=True)
            # Hide internal-only metadata noise: filter comment events that are internal
            qs = qs.exclude(
                event_type=ConsultationEvent.EventType.COMMENT_ADDED,
                metadata__visibility=ConsultationComment.Visibility.INTERNAL,
            )
        return ConsultationEventSerializer(qs, many=True, context=self.context).data


class ConsultationRequestListSerializer(serializers.ModelSerializer):
    clientName = serializers.SerializerMethodField()
    assignedLawyerName = serializers.SerializerMethodField()
    legalArea = serializers.CharField(source="legal_area")
    preferredFormat = serializers.CharField(source="preferred_format")
    createdAt = serializers.DateTimeField(source="created", read_only=True)
    chatAvailable = serializers.BooleanField(source="chat_available", read_only=True)
    conversationId = serializers.IntegerField(source="conversation_id", read_only=True)

    class Meta:
        model = ConsultationRequest
        fields = (
            "id",
            "reference",
            "subject",
            "legalArea",
            "status",
            "priority",
            "clientName",
            "assignedLawyerName",
            "preferredFormat",
            "createdAt",
            "chatAvailable",
            "conversationId",
        )

    def get_clientName(self, obj):
        c = obj.client
        return c.get_full_name() or c.email if c else ""

    def get_assignedLawyerName(self, obj):
        l = obj.assigned_lawyer
        return l.get_full_name() or l.email if l else ""


class ConsultationRequestCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    legal_area = serializers.ChoiceField(
        choices=ConsultationRequest.LegalArea.choices,
        required=False,
    )
    legalArea = serializers.ChoiceField(
        choices=ConsultationRequest.LegalArea.choices,
        required=False,
    )
    description = serializers.CharField()
    preferred_format = serializers.ChoiceField(
        choices=ConsultationRequest.PreferredFormat.choices,
        required=False,
    )
    preferredFormat = serializers.ChoiceField(
        choices=ConsultationRequest.PreferredFormat.choices,
        required=False,
    )
    preferred_datetime = serializers.CharField(required=False, allow_blank=True)
    preferredDatetime = serializers.CharField(required=False, allow_blank=True)
    related_case = serializers.IntegerField(required=False, allow_null=True)
    relatedCaseId = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        legal_area = attrs.get("legal_area") or attrs.get("legalArea")
        if not legal_area:
            raise serializers.ValidationError({"legalArea": "This field is required."})
        attrs["legal_area"] = legal_area
        attrs["preferred_format"] = (
            attrs.get("preferred_format")
            or attrs.get("preferredFormat")
            or ConsultationRequest.PreferredFormat.CHAT
        )
        attrs["preferred_datetime"] = (
            attrs.get("preferred_datetime") or attrs.get("preferredDatetime") or ""
        )
        related = attrs.get("related_case")
        if related is None:
            related = attrs.get("relatedCaseId")
        attrs["related_case_id"] = related
        return attrs


class AssignLawyerSerializer(serializers.Serializer):
    lawyer_id = serializers.IntegerField(required=False)
    lawyerId = serializers.IntegerField(required=False)

    def validate(self, attrs):
        lawyer_id = attrs.get("lawyer_id") or attrs.get("lawyerId")
        if not lawyer_id:
            raise serializers.ValidationError({"lawyerId": "This field is required."})
        attrs["lawyer_id"] = lawyer_id
        return attrs


class StatusChangeSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ConsultationRequest.Status.choices)
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class DeclineSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField()
    visibility = serializers.ChoiceField(
        choices=ConsultationComment.Visibility.choices,
        default=ConsultationComment.Visibility.CLIENT,
    )

    def validate(self, attrs):
        request = self.context.get("request")
        if request and is_portal_client(request.user):
            attrs["visibility"] = ConsultationComment.Visibility.CLIENT
        elif request and is_cabinet_staff(request.user):
            # Staff must be explicit; default CLIENT for client-facing updates
            attrs.setdefault("visibility", ConsultationComment.Visibility.CLIENT)
        return attrs
