# backend/tasks/serializers.py
from pathlib import Path

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Appointment, AppointmentAttachment, Task, TaskAttachment
from cases.models import Case
from chat.models import Conversation, ConversationMembership

User = get_user_model()


def _dedupe_users(users):
    seen = set()
    unique = []
    for user in users or []:
        if user is None:
            continue
        pk = getattr(user, 'pk', user)
        if pk in seen:
            continue
        seen.add(pk)
        unique.append(user)
    return unique


def _user_cabinet(user):
    return user.get_owned_cabinet_or_none() or getattr(user, 'cabinet', None)


class UserLiteSerializer(serializers.ModelSerializer):
    client_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'image', 'client_type']

    def get_client_type(self, obj):
        try:
            profile = obj.firm_client_profile
        except ObjectDoesNotExist:
            return None
        return getattr(profile, 'client_type', None)


class ConversationLiteSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'type', 'title', 'display_name']

    def get_display_name(self, obj):
        title = (obj.title or '').strip()
        if title:
            return title
        return f'Conversation #{obj.pk}'


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserLiteSerializer(source='uploaded_by', read_only=True)
    url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'name', 'original_name', 'mime', 'size',
            'uploaded_by', 'uploaded_by_details', 'created',
            'url', 'preview_url',
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return obj.original_name or Path(obj.file.name).name

    def get_url(self, obj):
        return f'/tasks/tasks/{obj.task_id}/attachments/{obj.pk}/download/'

    def get_preview_url(self, obj):
        return f'/tasks/tasks/{obj.task_id}/attachments/{obj.pk}/download/?inline=1'


class AppointmentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserLiteSerializer(source='uploaded_by', read_only=True)
    url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentAttachment
        fields = [
            'id', 'name', 'original_name', 'mime', 'size',
            'uploaded_by', 'uploaded_by_details', 'created',
            'url', 'preview_url',
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return obj.original_name or Path(obj.file.name).name

    def get_url(self, obj):
        return f'/tasks/appointments/{obj.appointment_id}/attachments/{obj.pk}/download/'

    def get_preview_url(self, obj):
        return f'/tasks/appointments/{obj.appointment_id}/attachments/{obj.pk}/download/?inline=1'


def _set_pk_queryset(field, queryset):
    """
    PK fields with many=True become ManyRelatedField (child_relation) or
    ListSerializer (child). Always update the inner RelatedField queryset.
    """
    if field is None:
        return
    inner = getattr(field, 'child_relation', None) or getattr(field, 'child', None)
    if inner is not None and hasattr(inner, 'queryset'):
        inner.queryset = queryset
    elif hasattr(field, 'queryset'):
        field.queryset = queryset


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(), required=False, allow_null=True
    )
    assigned_to_details = UserLiteSerializer(source='assigned_to', read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.none(), required=False, write_only=True
    )
    assignees = UserLiteSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)

    client = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(), required=False, allow_null=True
    )
    client_details = UserLiteSerializer(source='client', read_only=True)

    case = serializers.PrimaryKeyRelatedField(
        queryset=Case.objects.none(),
        required=False,
        allow_null=True,
    )
    case_title = serializers.CharField(source='case.title', read_only=True)
    created_by_details = UserLiteSerializer(source='created_by', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'due_date', 'estimated_hours',
            'assigned_to', 'assigned_to_details',
            'assignee_ids', 'assignees',
            'attachments',
            'cabinet', 'created', 'created_by', 'created_by_details',
            'client', 'client_details',
            'case', 'case_title',
        ]
        read_only_fields = [
            'cabinet', 'assigned_to_details', 'client_details', 'created',
            'created_by', 'created_by_details', 'assignees', 'attachments',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            user = getattr(request, 'user', None)
            if user is None or not getattr(user, 'is_authenticated', False):
                return
            cabinet = _user_cabinet(user)
            if cabinet:
                members = User.objects.filter(
                    Q(cabinet=cabinet, is_cabinet_member=True) | Q(pk=cabinet.owner_id)
                ).distinct()
                _set_pk_queryset(self.fields.get('assigned_to'), members)
                _set_pk_queryset(self.fields.get('assignee_ids'), members)
                _set_pk_queryset(
                    self.fields.get('client'),
                    User.objects.filter(cabinet=cabinet, is_cabinet_member=False),
                )
                _set_pk_queryset(self.fields.get('case'), Case.objects.filter(cabinet=cabinet))
            else:
                self.fields['assigned_to'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['assignee_ids'] = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
                self.fields['client'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['case'] = serializers.PrimaryKeyRelatedField(read_only=True)

    def _assert_cabinet_member(self, value, message):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if not cabinet or value is None:
            return value
        if value.pk == cabinet.owner_id:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError(message)
        if not getattr(value, 'is_cabinet_member', False):
            raise serializers.ValidationError(message)
        return value

    def validate_assigned_to(self, value):
        return self._assert_cabinet_member(value, "User must belong to your cabinet.")

    def validate_assignee_ids(self, value):
        for member in value or []:
            self._assert_cabinet_member(member, "User must belong to your cabinet.")
        return _dedupe_users(value)

    def validate_client(self, value):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if not cabinet or value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Client must belong to your cabinet.")
        if getattr(value, 'is_cabinet_member', True):
            raise serializers.ValidationError("Client must not be a cabinet member.")
        return value

    def validate_case(self, value):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if not cabinet or value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Case must belong to your cabinet.")
        return value

    def validate(self, attrs):
        assignees = attrs.get('assignee_ids')
        assigned_to = attrs.get('assigned_to')
        creating = self.instance is None
        if creating and not assignees and not assigned_to:
            raise serializers.ValidationError({
                'assignee_ids': 'Please select at least one participant.',
            })
        if not creating and 'assignee_ids' in attrs and not assignees and not assigned_to:
            raise serializers.ValidationError({
                'assignee_ids': 'Please select at least one participant.',
            })
        return attrs

    def _resolve_assignees(self, validated_data, instance=None):
        assignees = validated_data.pop('assignee_ids', None)
        assigned_to = validated_data.get('assigned_to')
        if assignees is not None:
            unique = _dedupe_users(assignees)
            if unique:
                validated_data['assigned_to'] = unique[0]
            else:
                validated_data['assigned_to'] = None
            return unique
        if assigned_to:
            existing = []
            if instance is not None:
                existing = list(instance.assignees.all())
            return _dedupe_users([*existing, assigned_to])
        return None

    def create(self, validated_data):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if cabinet:
            validated_data['cabinet'] = cabinet
        validated_data['created_by'] = user
        assignees = self._resolve_assignees(validated_data)
        inst = super().create(validated_data)
        if assignees:
            inst.assignees.set(assignees)
        return inst

    def update(self, instance, validated_data):
        assignees = self._resolve_assignees(validated_data, instance)
        inst = super().update(instance, validated_data)
        if assignees is not None:
            inst.assignees.set(assignees)
            primary = assignees[0] if assignees else None
            if inst.assigned_to_id != getattr(primary, 'pk', None):
                inst.assigned_to = primary
                inst.save(update_fields=['assigned_to'])
        return inst


class AppointmentSerializer(serializers.ModelSerializer):
    CONVERSATION_MODE_EXISTING = 'existing'
    CONVERSATION_MODE_CREATE_PERMANENT = 'create_permanent'
    CONVERSATION_MODE_CREATE_TEMPORARY = 'create_temporary'
    CONVERSATION_MODE_CHOICES = (
        (CONVERSATION_MODE_EXISTING, 'existing'),
        (CONVERSATION_MODE_CREATE_PERMANENT, 'create_permanent'),
        (CONVERSATION_MODE_CREATE_TEMPORARY, 'create_temporary'),
    )

    created_by_details = UserLiteSerializer(source='created_by', read_only=True)
    meeting_type = serializers.ChoiceField(
        choices=Appointment.MeetingType.choices,
        required=False,
        default=Appointment.MeetingType.IN_PERSON,
    )
    participant_scope = serializers.ChoiceField(
        choices=Appointment.ParticipantScope.choices,
        required=False,
        default=Appointment.ParticipantScope.TEAM,
    )
    conversation_mode = serializers.ChoiceField(
        choices=CONVERSATION_MODE_CHOICES,
        required=False,
        write_only=True,
        allow_null=True,
    )
    conversation_title = serializers.CharField(
        required=False, allow_blank=True, write_only=True, max_length=255
    )
    attendee_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.none(), required=False, write_only=True
    )
    attendees = UserLiteSerializer(many=True, read_only=True)
    client = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(),
        required=False,
        allow_null=True,
    )
    client_details = UserLiteSerializer(source='client', read_only=True)
    case = serializers.PrimaryKeyRelatedField(
        queryset=Case.objects.none(),
        required=False,
        allow_null=True,
    )
    case_title = serializers.CharField(source='case.title', read_only=True)
    conversation = serializers.PrimaryKeyRelatedField(
        queryset=Conversation.objects.none(),
        required=False,
        allow_null=True,
    )
    jure_conversation = ConversationLiteSerializer(source='conversation', read_only=True)
    conference_url = serializers.SerializerMethodField()
    attachments = AppointmentAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'title', 'description', 'start_at', 'end_at', 'status',
            'meeting_type', 'participant_scope',
            'created_by', 'created_by_details',
            'attendee_ids', 'attendees', 'cabinet', 'location', 'client', 'client_details',
            'case', 'case_title',
            'conversation', 'conversation_mode', 'conversation_title',
            'jure_conversation', 'conference_url',
            'attachments',
        ]
        read_only_fields = [
            'cabinet', 'created_by', 'created_by_details', 'client_details',
            'attendees', 'jure_conversation', 'conference_url', 'attachments',
        ]

    def get_conference_url(self, obj):
        return obj.conference_path()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            user = getattr(request, 'user', None)
            if user is None or not getattr(user, 'is_authenticated', False):
                return
            cabinet = _user_cabinet(user)
            if cabinet:
                members = User.objects.filter(
                    Q(cabinet=cabinet, is_cabinet_member=True) | Q(pk=cabinet.owner_id)
                ).distinct()
                _set_pk_queryset(self.fields.get('attendee_ids'), members)
                _set_pk_queryset(
                    self.fields.get('client'),
                    User.objects.filter(cabinet=cabinet, is_cabinet_member=False),
                )
                _set_pk_queryset(self.fields.get('case'), Case.objects.filter(cabinet=cabinet))
                _set_pk_queryset(
                    self.fields.get('conversation'),
                    Conversation.objects.filter(
                        type=Conversation.Type.GROUP,
                        memberships__user=user,
                        memberships__is_deleted=False,
                        is_temporary=False,
                    ).distinct(),
                )
            else:
                self.fields['client'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['case'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['conversation'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['attendee_ids'] = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    def validate_client(self, value):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if not cabinet or value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Client must belong to your cabinet.")
        if getattr(value, 'is_cabinet_member', True):
            raise serializers.ValidationError("Client must not be a cabinet member.")
        return value

    def validate_case(self, value):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if not cabinet or value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Case must belong to your cabinet.")
        return value

    def validate_conversation(self, value):
        if value is None:
            return value
        user = self.context['request'].user
        if value.type != Conversation.Type.GROUP:
            raise serializers.ValidationError(
                'Please select a JURE group conversation for the video conference.'
            )
        if value.is_temporary:
            raise serializers.ValidationError(
                'Please select a permanent JURE group conversation.'
            )
        if not ConversationMembership.objects.filter(
            conversation=value, user=user, is_deleted=False
        ).exists():
            raise serializers.ValidationError('You do not have access to this conversation.')
        return value

    def validate_attendee_ids(self, value):
        user = self.context['request'].user
        cabinet = _user_cabinet(user)
        if not cabinet:
            return _dedupe_users(value)
        for member in value or []:
            if member.pk == cabinet.owner_id:
                continue
            if getattr(member, 'cabinet_id', None) != getattr(cabinet, 'id', None):
                raise serializers.ValidationError('Attendees must belong to your cabinet.')
            if not getattr(member, 'is_cabinet_member', False):
                raise serializers.ValidationError('Attendees must be cabinet team members.')
        return _dedupe_users(value)

    def validate(self, attrs):
        instance = self.instance
        meeting_type = attrs.get('meeting_type')
        if not meeting_type:
            meeting_type = (
                getattr(instance, 'meeting_type', None) or Appointment.MeetingType.IN_PERSON
            )
        attrs['meeting_type'] = meeting_type

        scope = attrs.get('participant_scope')
        if not scope:
            scope = (
                getattr(instance, 'participant_scope', None)
                or Appointment.ParticipantScope.TEAM
            )
        attrs['participant_scope'] = scope

        attendees = attrs.get('attendee_ids')
        if attendees is None and instance is not None:
            attendees = list(instance.attendees.all())
        creating = instance is None
        if creating and not attendees:
            raise serializers.ValidationError({
                'attendee_ids': 'Please select at least one team member.',
            })
        if not creating and 'attendee_ids' in attrs and not attendees:
            raise serializers.ValidationError({
                'attendee_ids': 'Please select at least one team member.',
            })

        if scope == Appointment.ParticipantScope.WITH_CLIENT:
            client = attrs.get('client') if 'client' in attrs else getattr(instance, 'client', None)
            if not client:
                raise serializers.ValidationError({
                    'client': 'Please select a client for this appointment.',
                })
        else:
            attrs['client'] = None

        # Write-only helpers — not model fields
        conversation_mode = attrs.pop('conversation_mode', None)
        conversation_title = (attrs.pop('conversation_title', None) or '').strip()
        self._conversation_mode = conversation_mode
        self._conversation_title = conversation_title

        if meeting_type == Appointment.MeetingType.VIDEO:
            attrs['location'] = ''
            if conversation_mode in (
                self.CONVERSATION_MODE_CREATE_PERMANENT,
                self.CONVERSATION_MODE_CREATE_TEMPORARY,
            ):
                # conversation created in create/update
                attrs['conversation'] = None
                return attrs

            # existing or omitted mode with existing conversation
            if 'conversation' in attrs:
                conversation = attrs.get('conversation')
            else:
                conversation = getattr(instance, 'conversation', None)
            if conversation_mode == self.CONVERSATION_MODE_EXISTING or conversation_mode is None:
                if not conversation:
                    raise serializers.ValidationError({
                        'conversation': 'Please select a JURE group conversation or create one.',
                    })
            return attrs

        attrs['conversation'] = None
        if creating:
            if not str(attrs.get('location') or '').strip():
                raise serializers.ValidationError({
                    'location': 'Please enter an address for an in-person appointment.',
                })
            return attrs

        switching = (
            'meeting_type' in self.initial_data
            and meeting_type == Appointment.MeetingType.IN_PERSON
            and getattr(instance, 'meeting_type', None) != Appointment.MeetingType.IN_PERSON
        )
        if switching or 'location' in attrs:
            loc = attrs.get('location') if 'location' in attrs else instance.location
            if not str(loc or '').strip():
                raise serializers.ValidationError({
                    'location': 'Please enter an address for an in-person appointment.',
                })
        return attrs

    def _team_members_for_chat(self, attendees, creator):
        members = _dedupe_users([*(attendees or []), creator])
        return members

    def _create_meeting_conversation(self, *, title, attendees, creator, temporary: bool):
        convo = Conversation.objects.create(
            type=Conversation.Type.GROUP,
            title=title or 'Meeting',
            created_by=creator,
            is_temporary=temporary,
        )
        from tasks.meeting_chat import sync_conversation_members
        sync_conversation_members(convo, attendees, admin_user=creator)
        return convo

    def _resolve_video_conversation(self, validated_data, attendees, creator, instance=None):
        mode = getattr(self, '_conversation_mode', None)
        title = getattr(self, '_conversation_title', '') or validated_data.get('title') or (
            instance.title if instance else 'Meeting'
        )
        if mode == self.CONVERSATION_MODE_CREATE_PERMANENT:
            return self._create_meeting_conversation(
                title=title, attendees=attendees, creator=creator, temporary=False
            )
        if mode == self.CONVERSATION_MODE_CREATE_TEMPORARY:
            return self._create_meeting_conversation(
                title=title, attendees=attendees, creator=creator, temporary=True
            )
        return validated_data.get('conversation') or (
            instance.conversation if instance else None
        )

    def create(self, validated_data):
        from tasks.meeting_chat import sync_conversation_members

        attendees = validated_data.pop('attendee_ids', [])
        req = self.context['request']
        user = req.user
        cabinet = _user_cabinet(user)
        validated_data['created_by'] = user
        validated_data['cabinet'] = cabinet
        validated_data['meeting_type'] = (
            validated_data.get('meeting_type') or Appointment.MeetingType.IN_PERSON
        )
        # Never pass None/blank — SQLite NOT NULL ignores model default when key is present
        scope = validated_data.get('participant_scope')
        if scope not in (
            Appointment.ParticipantScope.TEAM,
            Appointment.ParticipantScope.WITH_CLIENT,
        ):
            scope = Appointment.ParticipantScope.TEAM
        validated_data['participant_scope'] = scope
        if scope != Appointment.ParticipantScope.WITH_CLIENT:
            validated_data['client'] = None

        if validated_data['meeting_type'] == Appointment.MeetingType.VIDEO:
            validated_data['location'] = ''
            members = self._team_members_for_chat(attendees, user)
            conversation = self._resolve_video_conversation(
                validated_data, members, user, instance=None
            )
            validated_data['conversation'] = conversation
        else:
            validated_data['conversation'] = None

        # Drop any leftover write-only keys that are not model fields
        validated_data.pop('conversation_mode', None)
        validated_data.pop('conversation_title', None)

        inst = super().create(validated_data)
        if attendees:
            inst.attendees.set(attendees)

        if (
            inst.meeting_type == Appointment.MeetingType.VIDEO
            and inst.conversation_id
        ):
            members = self._team_members_for_chat(list(inst.attendees.all()), user)
            sync_conversation_members(inst.conversation, members, admin_user=user)
            if inst.conversation.is_temporary:
                Conversation.objects.filter(pk=inst.conversation_id).update(
                    temporary_for_appointment=inst
                )
                inst.conversation.temporary_for_appointment = inst
        return inst

    def update(self, instance, validated_data):
        from tasks.meeting_chat import (
            maybe_cleanup_appointment_meeting_chat,
            sync_conversation_members,
        )

        attendees = validated_data.pop('attendee_ids', None)
        prev_status = instance.status
        meeting_type = validated_data.get('meeting_type', instance.meeting_type)
        scope = validated_data.get('participant_scope', instance.participant_scope)
        if scope != Appointment.ParticipantScope.WITH_CLIENT:
            validated_data['client'] = None

        if meeting_type == Appointment.MeetingType.VIDEO:
            validated_data['location'] = ''
            member_list = attendees if attendees is not None else list(instance.attendees.all())
            members = self._team_members_for_chat(member_list, self.context['request'].user)
            conversation = self._resolve_video_conversation(
                validated_data, members, self.context['request'].user, instance=instance
            )
            if conversation is not None:
                validated_data['conversation'] = conversation
        elif 'meeting_type' in validated_data:
            validated_data['conversation'] = None

        inst = super().update(instance, validated_data)
        if attendees is not None:
            inst.attendees.set(attendees)

        if inst.meeting_type == Appointment.MeetingType.VIDEO and inst.conversation_id:
            members = self._team_members_for_chat(
                list(inst.attendees.all()), self.context['request'].user
            )
            sync_conversation_members(inst.conversation, members, admin_user=self.context['request'].user)
            if inst.conversation.is_temporary and not inst.conversation.temporary_for_appointment_id:
                Conversation.objects.filter(pk=inst.conversation_id).update(
                    temporary_for_appointment=inst
                )

        # Cleanup temp chat when done/cancelled (or if already past end)
        if inst.status != prev_status or inst.end_at:
            maybe_cleanup_appointment_meeting_chat(inst)
        return inst


class CalendarEventSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=['task', 'appointment'])
    title = serializers.CharField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField(allow_null=True, required=False)
    allDay = serializers.BooleanField(default=False)
    status = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.CharField(required=False, allow_blank=True)

    assigned_to = UserLiteSerializer(required=False, allow_null=True)
    assignees = UserLiteSerializer(many=True, required=False)
    case_id = serializers.IntegerField(required=False, allow_null=True)
    case_title = serializers.CharField(required=False, allow_blank=True)
    client = UserLiteSerializer(required=False, allow_null=True)
    meeting_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    conversation_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    attachment_count = serializers.IntegerField(required=False)
    participant_scope = serializers.CharField(required=False, allow_blank=True, allow_null=True)
