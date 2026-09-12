from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils.translation import gettext as _
from rest_framework import serializers
from tasks.models import Appointment

from core.utils import get_user_cabinet

from ..icons import SUGGESTED_GROUP_ICONS
from ..models import Conversation, ConversationMembership, Message
from .membership import ConversationMembershipSerializer
from .message import MessageSerializer
from .users import UserThinSerializer

User = get_user_model()


def _set_pk_queryset(field, queryset):
    """many=True PK fields wrap the RelatedField; update the inner queryset."""
    if field is None:
        return
    inner = getattr(field, "child_relation", None) or getattr(field, "child", None)
    if inner is not None and hasattr(inner, "queryset"):
        inner.queryset = queryset
    elif hasattr(field, "queryset"):
        field.queryset = queryset


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
    participants = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.none(), write_only=True
    )
    icon = serializers.ImageField(write_only=True, required=False)
    memberships = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is None or not getattr(user, "is_authenticated", False):
            return
        cabinet = get_user_cabinet(user)
        if cabinet:
            members = User.objects.filter(
                Q(cabinet=cabinet, is_cabinet_member=True) | Q(pk=cabinet.owner_id)
            ).distinct()
            _set_pk_queryset(self.fields.get("participants"), members)
        else:
            _set_pk_queryset(self.fields.get("participants"), User.objects.none())

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
            "memberships",
            "is_admin",
            "created_by",
            "created",
        )
        read_only_fields = ("is_temporary", "memberships", "is_admin")
    

    def validate(self, _attrs):
        attrs = super().validate(_attrs)
        participants = attrs.get("participants")
        if participants is not None and len(participants) == 0:
            raise serializers.ValidationError(_("At least one participant is required"))

        request = self.context.get("request")
        creator = getattr(request, "user", None) if request else None

        if participants is not None:
            cabinet = get_user_cabinet(creator) if creator else None
            if not cabinet:
                raise serializers.ValidationError(_("You must belong to a cabinet."))
            for participant in participants:
                if participant.pk == cabinet.owner_id:
                    continue
                if getattr(participant, "cabinet_id", None) != cabinet.id:
                    raise serializers.ValidationError(
                        _("Participants must belong to your cabinet.")
                    )
                if not getattr(participant, "is_cabinet_member", False):
                    raise serializers.ValidationError(
                        _("Participants must be cabinet team members.")
                    )

        if participants is not None and attrs.get("type") == Conversation.Type.DIRECT:
            if len(participants) > 1:
                raise serializers.ValidationError(
                    _("Direct conversation must have exactly You and one other participant")
                )

            participant = participants[0]

            if creator and participant.id == creator.id:
                raise serializers.ValidationError(
                    _("You cannot create a direct conversation with yourself")
                )

        return attrs

    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        creator = self.context.get("request").user
        instance = None

        if validated_data.get("type") == Conversation.Type.DIRECT and participants:
            participant = participants[0]
            with transaction.atomic():
                # One in-flight create per user pair so two clicks cannot open two DMs.
                list(
                    User.objects.select_for_update().filter(
                        pk__in=sorted({creator.id, participant.id})
                    )
                )
                instance = (
                    Conversation.objects.filter(type=Conversation.Type.DIRECT)
                    .filter(participants=creator)
                    .filter(participants=participant)
                    .first()
                )
                if instance is None:
                    instance = super().create(validated_data)
                self._ensure_direct_memberships(instance, participants, creator)
            return instance

        instance = super().create(validated_data)
        self._ensure_direct_memberships(instance, participants, creator)
        return instance

    def _ensure_direct_memberships(self, instance, participants, creator):
        for participant in participants:
            membership, _ = ConversationMembership.objects.get_or_create(
                conversation=instance,
                user=participant,
            )
            membership.is_deleted = False
            membership.save()

        admin_member, _ = ConversationMembership.objects.get_or_create(
            conversation=instance,
            user=creator,
        )
        admin_member.is_admin = True
        admin_member.is_deleted = False
        admin_member.save()
    
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

    def get_memberships(self, obj: Conversation):
        cached = getattr(obj, "_prefetched_objects_cache", {}).get("memberships")
        if cached is not None:
            qs = cached
        else:
            qs = obj.memberships.filter(is_deleted=False).select_related("user")
        return ConversationMembershipSerializer(qs, many=True).data

    def get_is_admin(self, obj: Conversation) -> bool:
        m = self._get_my_membership(obj)
        return bool(m and m.is_admin)
    
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
