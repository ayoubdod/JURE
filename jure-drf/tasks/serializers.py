# backend/tasks/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Task, Appointment
from cases.models import Case

User = get_user_model()


class UserLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(), required=False, allow_null=True
    )
    assigned_to_details = UserLiteSerializer(source='assigned_to', read_only=True)

    # Client field - User with is_cabinet_member=False
    client = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(), required=False, allow_null=True
    )
    client_details = UserLiteSerializer(source='client', read_only=True)

    # Case field
    case = serializers.PrimaryKeyRelatedField(
        queryset=Case.objects.none(),  # ✅ satisfies DRF at import-time
        required=False,
        allow_null=True,
    )
    case_title = serializers.CharField(source='case.title', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'due_date', 'estimated_hours',
            'assigned_to', 'assigned_to_details',
            'cabinet', 'created', 'client', 'client_details',
            'case', 'case_title',
        ]
        read_only_fields = ['cabinet', 'assigned_to_details', 'client_details', 'created']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            user = request.user
            cabinet = user.get_owned_cabinet_or_none() or user.cabinet
            if cabinet:
                # Set queryset for assigned_to (cabinet members)
                self.fields['assigned_to'].queryset = User.objects.filter(cabinet=cabinet, is_cabinet_member=True)
                # Set queryset for client (non-cabinet members)
                self.fields['client'].queryset = User.objects.filter(cabinet=cabinet, is_cabinet_member=False)
                # Set queryset for case
                from cases.models import Case
                self.fields['case'].queryset = Case.objects.filter(cabinet=cabinet)
            else:
                self.fields['assigned_to'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['client'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['case'] = serializers.PrimaryKeyRelatedField(read_only=True)

    def validate_assigned_to(self, value):
        user = self.context['request'].user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        if not cabinet:
            return value
        if value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("User must belong to your cabinet.")
        return value

    def validate_client(self, value):
        user = self.context['request'].user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        if not cabinet:
            return value
        if value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Client must belong to your cabinet.")
        if getattr(value, 'is_cabinet_member', True):
            raise serializers.ValidationError("Client must not be a cabinet member.")
        return value

    def validate_case(self, value):
        user = self.context['request'].user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        if not cabinet:
            return value
        if value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Case must belong to your cabinet.")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        if cabinet:
            validated_data['cabinet'] = cabinet
        return super().create(validated_data)


class AppointmentSerializer(serializers.ModelSerializer):
    created_by_details = UserLiteSerializer(source='created_by', read_only=True)
    attendee_ids = serializers.PrimaryKeyRelatedField(source='attendees', many=True, queryset=User.objects.all(), required=False)
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

    class Meta:
        model = Appointment
        fields = [
            'id', 'title', 'description', 'start_at', 'end_at', 'status',
            'created_by', 'created_by_details',
            'attendee_ids', 'cabinet', 'location', 'client', 'client_details',
            'case', 'case_title',
        ]
        read_only_fields = ['cabinet', 'created_by', 'created_by_details', 'client_details']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            user = request.user
            cabinet = user.get_owned_cabinet_or_none() or user.cabinet
            if cabinet:
                # Set queryset for client (non-cabinet members)
                self.fields['client'].queryset = User.objects.filter(cabinet=cabinet, is_cabinet_member=False)
                from cases.models import Case
                self.fields['case'].queryset = Case.objects.filter(cabinet=cabinet)
            else:
                self.fields['client'] = serializers.PrimaryKeyRelatedField(read_only=True)
                self.fields['case'] = serializers.PrimaryKeyRelatedField(read_only=True)

    def validate_client(self, value):
        user = self.context['request'].user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        if not cabinet:
            return value
        if value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Client must belong to your cabinet.")
        if getattr(value, 'is_cabinet_member', True):
            raise serializers.ValidationError("Client must not be a cabinet member.")
        return value

    def validate_case(self, value):
        user = self.context['request'].user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        if not cabinet:
            return value
        if value is None:
            return value
        if getattr(value, 'cabinet_id', None) != getattr(cabinet, 'id', None):
            raise serializers.ValidationError("Case must belong to your cabinet.")
        return value

    def create(self, validated_data):
        attendees = validated_data.pop('attendees', [])
        req = self.context['request']
        user = req.user
        cabinet = user.get_owned_cabinet_or_none() or user.cabinet
        validated_data['created_by'] = user
        validated_data['cabinet'] = cabinet
        inst = super().create(validated_data)
        if attendees:
            inst.attendees.set(attendees)
        return inst


# Unified Calendar Event serializer (normalized for frontend calendar)
class CalendarEventSerializer(serializers.Serializer):
    id = serializers.CharField()        # e.g. "task-12" or "appt-9"
    type = serializers.ChoiceField(choices=['task', 'appointment'])
    title = serializers.CharField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField(allow_null=True, required=False)
    allDay = serializers.BooleanField(default=False)
    status = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.CharField(required=False, allow_blank=True)

    # Extras for side panels / modals
    assigned_to = UserLiteSerializer(required=False, allow_null=True)
    case_id = serializers.IntegerField(required=False, allow_null=True)
    case_title = serializers.CharField(required=False, allow_blank=True)
    client = UserLiteSerializer(required=False, allow_null=True)
