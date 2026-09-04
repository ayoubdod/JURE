from django.db.models import Q
from rest_framework import serializers
from django.contrib.auth import get_user_model

from cases.models import Case
from ..models import Task
from .attachments import TaskAttachmentSerializer
from .common import UserLiteSerializer, _dedupe_users, _set_pk_queryset, _user_cabinet

User = get_user_model()


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

