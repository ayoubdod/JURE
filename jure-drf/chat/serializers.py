# chat/serializers.py
from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction

from cases.models import Case
from core.utils import get_user_cabinet
from tasks.models import Appointment, Task

from .models import Attachment, Conversation, ConversationMembership, Message, ReadReceipt
from .icons import SUGGESTED_GROUP_ICONS

User = get_user_model()


def _assigned_to_chat_preview(user):
    if user is None:
        return None
    fn = (getattr(user, "first_name", None) or "").strip()
    ln = (getattr(user, "last_name", None) or "").strip()
    name = f"{fn} {ln}".strip() or (getattr(user, "email", None) or str(user.pk))
    return {"id": user.pk, "name": name}


def _case_priority_from_specific(case: Case) -> str | None:
    data = case.case_specific_data or {}
    if case.case_type in (Case.CaseType.LITIGATION, Case.CaseType.ADMINISTRATIVE):
        p = data.get("priority")
        return str(p).upper() if p else None
    return None


def build_shared_item_payload(message: Message) -> tuple[dict | None, str]:
    """Returns (sharedItem dict or None, effective messageType for API)."""
    mt = message.message_type
    if mt == Message.MessageType.TEXT:
        return None, Message.MessageType.TEXT

    if mt == Message.MessageType.SHARED_CASE:
        c = message.shared_case
        if not c:
            return None, Message.MessageType.TEXT
        return {
            "type": "CASE",
            "id": str(c.id),
            "title": c.title,
            "status": c.status,
            "priority": _case_priority_from_specific(c),
            "reference": c.reference,
            "dueDate": None,
            "caseType": c.case_type,
            "assignedTo": _assigned_to_chat_preview(c.assigned_to),
        }, mt

    if mt == Message.MessageType.SHARED_TASK:
        t = message.shared_task
        if not t:
            return None, Message.MessageType.TEXT
        due = t.due_date.isoformat() if t.due_date else None
        primary = t.assigned_to
        if primary is None:
            primary = t.assignees.first()
        return {
            "type": "TASK",
            "id": str(t.id),
            "title": t.title,
            "status": t.status,
            "priority": str(t.priority).upper() if t.priority else None,
            "reference": None,
            "dueDate": due,
            "caseType": None,
            "assignedTo": _assigned_to_chat_preview(primary),
        }, mt

    if mt == Message.MessageType.SHARED_APPOINTMENT:
        a = message.shared_appointment
        if not a:
            return None, Message.MessageType.TEXT
        return {
            "type": "APPOINTMENT",
            "id": str(a.id),
            "title": a.title,
            "status": a.status,
            "priority": None,
            "reference": None,
            "dueDate": a.start_at.isoformat() if a.start_at else None,
            "caseType": None,
            "assignedTo": _assigned_to_chat_preview(a.created_by),
        }, mt

    if mt in Message.call_message_types():
        call = message.shared_call
        if not call:
            return None, Message.MessageType.TEXT
        kind = "video" if str(call.kind).lower() == "video" else "voice"
        if mt in (Message.MessageType.CALL_MISSED_VOICE, Message.MessageType.CALL_MISSED_VIDEO):
            outcome = "missed"
        else:
            outcome = "completed"
        duration_seconds = None
        if call.started_at and call.ended_at:
            duration_seconds = max(0, int((call.ended_at - call.started_at).total_seconds()))
        return {
            "type": "CALL",
            "id": str(call.id),
            "title": message.body or "",
            "status": outcome,
            "priority": None,
            "reference": None,
            "dueDate": None,
            "caseType": None,
            "assignedTo": None,
            "kind": kind,
            "outcome": outcome,
            "durationSeconds": duration_seconds,
            "startedAt": call.started_at.isoformat() if call.started_at else None,
            "endedAt": call.ended_at.isoformat() if call.ended_at else None,
        }, mt

    return None, Message.MessageType.TEXT


def user_can_access_shared_case(user, case: Case) -> bool:
    cab = get_user_cabinet(user)
    return bool(cab and case.cabinet_id == cab.id)


def user_can_access_shared_task(user, task: Task) -> bool:
    cab = get_user_cabinet(user)
    return bool(cab and task.cabinet_id == cab.id)


def user_can_access_shared_appointment(user, appt: Appointment) -> bool:
    cab = get_user_cabinet(user)
    return bool(cab and appt.cabinet_id == cab.id)


class UserThinSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "email", "full_name", "image")

    def get_full_name(self, obj):
        fn = (getattr(obj, "first_name", None) or "").strip()
        ln = (getattr(obj, "last_name", None) or "").strip()
        combined = f"{fn} {ln}".strip()
        if combined:
            return combined
        full = (obj.get_full_name() or "").strip() if hasattr(obj, "get_full_name") else ""
        if full:
            return full
        email = (getattr(obj, "email", None) or "").strip()
        if "@" in email:
            return email.split("@", 1)[0]
        if email:
            return email
        return f"Member {obj.pk}"


class ConversationSerializer(serializers.ModelSerializer):
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    archived = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    icon_url = serializers.SerializerMethodField()
    icon_preset_emoji = serializers.SerializerMethodField()
    linkedCase = serializers.SerializerMethodField()
    active_or_upcoming_appointment = serializers.SerializerMethodField()

    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    participants = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), write_only=True)
    icon = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Conversation
        fields = (
            "id",
            "type",
            "title",
            "icon_preset",
            "icon_image",
            "icon_url",
            "icon_preset_emoji",
            "icon",
            "participants",
            "other_participant",
            "display_name",
            "latest_message",
            "unread_count",
            "archived",
            "is_pinned",
            "linkedCase",
            "is_temporary",
            "active_or_upcoming_appointment",
            "created_by",
            "created",
        )
        read_only_fields = ("is_temporary",)
    

    def validate(self, _attrs):
        attrs = super().validate(_attrs)
        participants = attrs.get("participants")
        if participants is not None and len(participants) == 0:
            raise serializers.ValidationError("At least one participant is required")
        
        if participants is not None and attrs.get("type") == Conversation.Type.DIRECT:
            if len(participants) > 1:
                raise serializers.ValidationError("Direct conversation must have exactly You and one other participant")

            participant = participants[0]
            creator = self.context.get('request').user

            if participant.id == creator.id:
                raise serializers.ValidationError("You can only create a direct conversation with yourself")
            
            old_conversation = Conversation.objects.filter(type=Conversation.Type.DIRECT).filter(participants=creator).filter(participants=participant).first()
            if old_conversation and ConversationMembership.objects.get(conversation=old_conversation, user=creator).is_deleted == False:
                raise serializers.ValidationError("You already have a direct conversation with this participant")
        
        return attrs

    def create(self, validated_data):
        participants = validated_data.pop("participants",[])

        instance = None

        if validated_data.get("type") == Conversation.Type.DIRECT:
            participant = participants[0]
            creator = self.context.get('request').user
            instance = Conversation.objects.filter(type=Conversation.Type.DIRECT).filter(participants=creator).filter(participants=participant).first()
        
        if instance is None:
            instance = super().create(validated_data)

        for participant in participants:
            m,c =ConversationMembership.objects.get_or_create(
                conversation=instance,
                user=participant,
            )
            m.is_deleted = False
            m.save()
        
        admin_member, _ = ConversationMembership.objects.get_or_create(
            conversation=instance,
            user=self.context.get('request').user,
        )

        admin_member.is_admin = True
        admin_member.is_deleted = False
        admin_member.save()

        
        return instance
    
    def update(self, instance: Conversation, validated_data) -> Conversation:
        validated_data.pop("participants", [])
        icon_file = validated_data.pop("icon", None)
        icon_preset = validated_data.pop("icon_preset", None)
        if icon_file is not None:
            if instance.icon_image:
                instance.icon_image.delete(save=False)
            instance.icon_image = icon_file
            instance.icon_preset = ""  # custom upload
        if icon_preset is not None and icon_file is None:
            instance.icon_preset = str(icon_preset)[:50]
            if instance.icon_image:
                instance.icon_image.delete(save=False)
                instance.icon_image = None
        return super().update(instance, validated_data)
    
    def to_representation(self, instance: Conversation):
        self.fields["memberships"] = ConversationMembershipSerializer(many=True, read_only=True)
        return super().to_representation(instance)
    
    def get_latest_message(self, obj: Conversation):
        if not obj.messages.exists():
            return None
        msg = (
            obj.messages.select_related(
                "shared_case",
                "shared_task",
                "shared_appointment",
                "shared_case__assigned_to",
                "shared_task__assigned_to",
                "shared_task__case",
                "shared_appointment__created_by",
                "shared_appointment__case",
            )
            .order_by("-created")
            .first()
        )
        return MessageSerializer(msg, context={"request": self.context.get("request")}).data

    def get_unread_count(self, obj: Conversation):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        # Count messages not sent by current user that they haven't read
        return Message.objects.filter(conversation=obj).exclude(
            sender=request.user
        ).exclude(read_by=request.user).count()

    def get_other_participant(self, obj: Conversation):
        """For direct chats, return the other participant (not current user)."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if obj.type != Conversation.Type.DIRECT:
            return None
        other = obj.participants.exclude(id=request.user.id).first()
        return UserThinSerializer(other).data if other else None

    def get_display_name(self, obj: Conversation):
        """display_name: direct chats = peer name, group chats = title."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return obj.title or ""
        if obj.type == Conversation.Type.DIRECT:
            other = obj.participants.exclude(id=request.user.id).first()
            return UserThinSerializer(other).data.get("full_name", "") if other else ""
        return obj.title or ""

    def _get_my_membership(self, obj: Conversation):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return obj.memberships.filter(user=request.user, is_deleted=False).first()

    def get_archived(self, obj: Conversation):
        m = self._get_my_membership(obj)
        return m.archived if m else False

    def get_is_pinned(self, obj: Conversation):
        m = self._get_my_membership(obj)
        return m.is_pinned if m else False

    def get_icon_url(self, obj: Conversation):
        """URL of custom icon image if set, else None."""
        if obj.icon_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.icon_image.url)
            return obj.icon_image.url
        return None

    def get_icon_preset_emoji(self, obj: Conversation):
        """Emoji for preset icon when no custom image. None for direct chats."""
        if obj.type != Conversation.Type.GROUP:
            return None
        if obj.icon_image:
            return None
        preset = obj.icon_preset or "group"
        for item in SUGGESTED_GROUP_ICONS:
            if item["id"] == preset:
                return item["emoji"]
        return "👥"  # fallback

    def get_linkedCase(self, obj: Conversation):
        c = obj.linked_case
        if not c:
            return None
        return {
            "id": str(c.id),
            "reference": c.reference,
            "title": c.title,
            "caseType": c.case_type,
            "status": c.status,
        }

    def get_active_or_upcoming_appointment(self, obj: Conversation):
        """Return joinable or upcoming scheduled video appointment linked to this conversation."""
        from datetime import timedelta

        from django.utils import timezone

        now = timezone.now()
        early = now + timedelta(minutes=15)
        qs = (
            Appointment.objects.filter(
                conversation=obj,
                meeting_type=Appointment.MeetingType.VIDEO,
                status=Appointment.Status.SCHEDULED,
            )
            .filter(end_at__gte=now)
            .order_by('start_at')
        )
        appt = qs.first()
        if appt is None:
            return None
        # Include if already joinable (start-15m .. end) or still upcoming (planned)
        joinable = appt.is_joinable(now=now, early_minutes=15)
        upcoming = appt.start_at > early
        if not joinable and not (appt.start_at > now):
            # past join window but somehow end_at still future — still show if within end
            if appt.end_at < now:
                return None
        return {
            'id': appt.id,
            'title': appt.title,
            'start_at': appt.start_at.isoformat(),
            'end_at': appt.end_at.isoformat(),
            'conference_url': appt.conference_path(),
            'joinable': joinable or (appt.start_at <= early and appt.end_at >= now),
            'is_temporary_chat': bool(obj.is_temporary),
        }


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


class ConversationMembershipSerializer(serializers.ModelSerializer):
    user = UserThinSerializer(read_only=True)

    class Meta:
        model = ConversationMembership
        fields = ("id", "user", "is_admin", "archived", "last_read_at", "joined_at")
