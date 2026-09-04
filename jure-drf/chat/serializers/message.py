from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import transaction
from rest_framework import serializers

from cases.models import Case
from tasks.models import Appointment, Task

from ..models import Attachment, Message
from .sharing import (
    build_shared_item_payload,
    user_can_access_shared_appointment,
    user_can_access_shared_case,
    user_can_access_shared_task,
)
from .users import UserThinSerializer

User = get_user_model()


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ("id", "kind", "file", "mime", "size", "duration_ms", "thumbnail")


class MessageNotificationSerializer(serializers.ModelSerializer):
    unread = serializers.SerializerMethodField()
    sender = UserThinSerializer(read_only=True)
    is_message = serializers.BooleanField(default=True,read_only=True)

    user:User

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "body",
            "created",
            "unread",
            "conversation_id",
            "is_message",
        ]

    def get_unread(self, obj):
        return not obj.read_by.filter(id=self.user.id).exists()
    
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop("user")
        if not self.user:
            raise Exception("User is required")
        super().__init__(*args, **kwargs)


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_own = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    delivered_count = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()
    attachments = serializers.ListField(
        child=serializers.FileField(), write_only=True, required=False, default=[]
    )
    message_type = serializers.ChoiceField(
        choices=Message.MessageType.choices,
        required=False,
        default=Message.MessageType.TEXT,
        write_only=True,
    )
    sharedCaseId = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    sharedTaskId = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    sharedAppointmentId = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "conversation",
            "sender",
            "body",
            "reply_to",
            "forwarded_from",
            "edited_at",
            "sent_at",
            "is_deleted",
            "delivered_count",
            "read_count",
            "attachments",
            "is_own",
            "is_pinned",
            "message_type",
            "sharedCaseId",
            "sharedTaskId",
            "sharedAppointmentId",
        )
        read_only_fields = ("forwarded_from", "edited_at", "is_deleted", "sent_at")

    def get_delivered_count(self, obj):
        """Count of recipients (excluding sender) who have received this message."""
        return obj.deliveries.exclude(user_id=obj.sender_id).count()

    def get_read_count(self, obj):
        """Count of recipients (excluding sender) who have read this message."""
        return obj.read_by.exclude(id=obj.sender_id).count()

    def get_is_own(self, obj):
        request = self.context.get("request")
        return bool(
            request and request.user.is_authenticated and obj.sender_id == request.user.id
        )

    def get_is_pinned(self, obj):
        """Message is pinned for all participants when anyone has pinned it."""
        return obj.pinned_by.exists()

    def validate(self, attrs):
        # On update (partial), only allow body
        if self.instance:
            allowed = {"body"}
            extra = set(attrs.keys()) - allowed
            if extra:
                raise serializers.ValidationError(
                    f"Only 'body' can be updated when editing. Invalid: {extra}"
                )
            return super().validate(attrs)

        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        initial = self.initial_data or {}
        if "messageType" in initial and initial["messageType"] is not None:
            attrs["message_type"] = initial["messageType"]
        if "content" in initial and "body" not in initial:
            attrs["body"] = initial.get("content", "") or ""

        mt = attrs.get("message_type", Message.MessageType.TEXT)

        if mt in Message.call_message_types():
            raise serializers.ValidationError(
                {"message_type": "Call history messages are created by the system only."}
            )

        sc_id = attrs.pop("sharedCaseId", None)
        st_id = attrs.pop("sharedTaskId", None)
        sa_id = attrs.pop("sharedAppointmentId", None)
        if sc_id is None and "sharedCaseId" in initial:
            sc_id = initial.get("sharedCaseId")
        if st_id is None and "sharedTaskId" in initial:
            st_id = initial.get("sharedTaskId")
        if sa_id is None and "sharedAppointmentId" in initial:
            sa_id = initial.get("sharedAppointmentId")

        id_count = sum(1 for x in (sc_id, st_id, sa_id) if x is not None)

        if mt == Message.MessageType.TEXT:
            if id_count:
                raise serializers.ValidationError(
                    "Text messages cannot include sharedCaseId, sharedTaskId, or sharedAppointmentId."
                )
            attrs["shared_case"] = None
            attrs["shared_task"] = None
            attrs["shared_appointment"] = None
            return attrs

        if id_count != 1:
            raise serializers.ValidationError(
                "Exactly one of sharedCaseId, sharedTaskId, or sharedAppointmentId must be set for a shared message."
            )

        if mt == Message.MessageType.SHARED_CASE:
            if sc_id is None:
                raise serializers.ValidationError("sharedCaseId is required for SHARED_CASE messages.")
            try:
                case = Case.objects.get(pk=sc_id)
            except Case.DoesNotExist:
                raise serializers.ValidationError({"sharedCaseId": "Case not found."})
            if not user_can_access_shared_case(user, case):
                raise serializers.ValidationError({"sharedCaseId": "You do not have access to this case."})
            attrs["shared_case"] = case
            attrs["shared_task"] = None
            attrs["shared_appointment"] = None
            return attrs

        if mt == Message.MessageType.SHARED_TASK:
            if st_id is None:
                raise serializers.ValidationError("sharedTaskId is required for SHARED_TASK messages.")
            try:
                task = Task.objects.get(pk=st_id)
            except Task.DoesNotExist:
                raise serializers.ValidationError({"sharedTaskId": "Task not found."})
            if not user_can_access_shared_task(user, task):
                raise serializers.ValidationError({"sharedTaskId": "You do not have access to this task."})
            attrs["shared_case"] = None
            attrs["shared_task"] = task
            attrs["shared_appointment"] = None
            return attrs

        if mt == Message.MessageType.SHARED_APPOINTMENT:
            if sa_id is None:
                raise serializers.ValidationError(
                    {"sharedAppointmentId": "sharedAppointmentId is required for SHARED_APPOINTMENT messages."}
                )
            try:
                appt = Appointment.objects.get(pk=sa_id)
            except Appointment.DoesNotExist:
                raise serializers.ValidationError({"sharedAppointmentId": "Appointment not found."})
            if not user_can_access_shared_appointment(user, appt):
                raise serializers.ValidationError(
                    {"sharedAppointmentId": "You do not have access to this appointment."}
                )
            attrs["shared_case"] = None
            attrs["shared_task"] = None
            attrs["shared_appointment"] = appt
            return attrs

        raise serializers.ValidationError({"message_type": "Invalid message_type."})

    def to_representation(self, instance: Message) -> dict:
        self.fields["sender"] = UserThinSerializer(read_only=True)
        data = super().to_representation(instance)
        shared_item, effective_type = build_shared_item_payload(instance)
        data["messageType"] = effective_type
        data["sharedItem"] = shared_item
        data["attachments"] = AttachmentSerializer(
            instance.attachments.all(), many=True
        ).data
        # Mask deleted message body for all users
        if instance.is_deleted:
            data["body"] = ""
            data["attachments"] = []
        # Add forwarded_from_detail for forwarded messages
        orig = instance.forwarded_from
        if orig:
            data["forwarded_from_detail"] = {
                "id": orig.id,
                "sender": orig.sender_id,
                "body": "" if orig.is_deleted else orig.body,
                "sent_at": orig.sent_at.isoformat() if orig.sent_at else None,
            }
        else:
            data["forwarded_from_detail"] = None
        return data

    
    def _get_kind(self, file:InMemoryUploadedFile):
        if file.content_type.startswith("image/"):
            return Attachment.Kind.IMAGE
        elif file.content_type.startswith("video/"):
            return Attachment.Kind.VIDEO
        elif file.content_type.startswith("audio/"):
            return Attachment.Kind.AUDIO
        else:
            return Attachment.Kind.FILE
    
    
    def create(self, validated_data):
        attachments: list[InMemoryUploadedFile] = validated_data.pop("attachments", [])
        
        # Use atomic transaction to ensure message and attachments are created together
        with transaction.atomic():
            # Create the message instance first
            instance = super().create(validated_data)
            
            # Create all attachments for this message
            attachment_instances = []
            for attachment in attachments:
                kind = self._get_kind(attachment)
                
                attachment_data = {
                    "file": attachment,
                    "kind": kind,
                    "mime": attachment.content_type,
                    "size": attachment.size,
                    "duration_ms": None,
                    "thumbnail": None,
                }
                
                attachment_serializer = AttachmentSerializer(data=attachment_data)
                if attachment_serializer.is_valid():
                    attachment_instance = attachment_serializer.save(message=instance)
                    attachment_instances.append(attachment_instance)
                else:
                    # If any attachment fails validation, the transaction will rollback
                    raise serializers.ValidationError({
                        'attachments': f"Attachment validation error: {attachment_serializer.errors}"
                    })
        
        return instance
