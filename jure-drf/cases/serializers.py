"""
Case serializers with polymorphic validation. Validates case_type and
type-specific sub-fields (case_specific_data) based on discriminator.
"""
from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Case
from .validators import validate_case_specific_data, CASE_TYPES
from .utils import fetch_case_related_payload
from django.http import HttpRequest
from users.serializers import CustomUserDetailsSerializer

from typing import TYPE_CHECKING, cast
import uuid

if TYPE_CHECKING:
    from users.models import User


class CaseSerializer(ModelSerializer):
    """
    Polymorphic case serializer. Accepts caseType + case_specific_data.
    Validates sub-fields per case type (CONSULTATION | LITIGATION | ADMINISTRATIVE).
    """

    assigned_to = CustomUserDetailsSerializer(read_only=True)
    assigned_to_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    created_by = CustomUserDetailsSerializer(read_only=True)
    updated_at = serializers.SerializerMethodField()
    updated_by = CustomUserDetailsSerializer(read_only=True)
    convertedToCase = serializers.SerializerMethodField()
    convertedFromCase = serializers.SerializerMethodField()
    _counts = serializers.SerializerMethodField()
    _related = serializers.SerializerMethodField()
    # API exposes caseType to match REST spec; maps to model field case_type
    caseType = serializers.ChoiceField(
        choices=[(c, c) for c in sorted(CASE_TYPES)],
        required=False,
        default='LITIGATION',
        write_only=True,
        help_text='One of: CONSULTATION, LITIGATION, ADMINISTRATIVE. Defaults to LITIGATION for backward compatibility.',
    )
    case_specific_data = serializers.JSONField(
        required=False,
        default=dict,
        help_text='Type-specific sub-fields. Structure depends on caseType.',
    )

    class Meta:
        model = Case
        fields = [
            'id',
            'caseType',
            'case_specific_data',
            'category',
            'status',
            'summary',
            'description',
            'reference',
            'title',
            'court',
            'cabinet',
            'client',
            'assigned_to',
            'assigned_to_id',
            'created_by',
            'created',
            'updated_at',
            'updated_by',
            'convertedToCase',
            'convertedFromCase',
            '_counts',
            '_related',
        ]
        read_only_fields = ['cabinet']
        extra_kwargs = {
            'client': {'required': False, 'allow_null': True},
            'reference': {'required': False, 'allow_blank': True},
            'description': {'required': True},
            'title': {'required': True},
            'court': {'required': True, 'allow_blank': True},
        }

    def _populate_conversion_link(self, case):
        """Return { id, reference, title, caseType, status } for a linked case."""
        if case is None:
            return None
        return {
            "id": case.id,
            "reference": case.reference,
            "title": case.title,
            "caseType": case.case_type,
            "status": case.status,
        }

    def get_convertedToCase(self, obj):
        return self._populate_conversion_link(obj.converted_to_case)

    def get_convertedFromCase(self, obj):
        return self._populate_conversion_link(obj.converted_from_case)

    def get__counts(self, obj):
        cm = self.context.get("counts_map")
        if cm is not None:
            return cm.get(obj.id, {"tasks": 0, "appointments": 0})
        try:
            from tasks.models import Appointment, Task

            return {
                "tasks": Task.objects.filter(case_id=obj.id).count(),
                "appointments": Appointment.objects.filter(case_id=obj.id).count(),
            }
        except Exception:
            return {"tasks": 0, "appointments": 0}

    def get__related(self, obj):
        if not self.context.get("include_related"):
            return None
        payload = self.context.get("related_payload")
        if payload is not None:
            return payload
        try:
            return fetch_case_related_payload(obj)
        except Exception:
            return {"tasks": [], "appointments": []}

    def get_updated_at(self, obj):
        """ISO 8601 datetime for last modification (from TimeStampedModel.modified)."""
        modified = getattr(obj, 'modified', None)
        return modified.isoformat() if modified else None

    def to_representation(self, instance):
        self.fields['client'] = CustomUserDetailsSerializer(read_only=True)
        rep = super().to_representation(instance)
        # Expose caseType in response (same as case_type)
        rep['caseType'] = instance.case_type
        if rep.get("_related") is None:
            rep.pop("_related", None)
        return rep

    def validate_caseType(self, value):
        """Ensure caseType is one of the allowed values."""
        if value not in CASE_TYPES:
            raise serializers.ValidationError(
                'caseType must be one of: CONSULTATION, LITIGATION, ADMINISTRATIVE.'
            )
        return value

    def validate(self, attrs):
        """Validate case_specific_data based on caseType. Accept assigned_to and case_type as aliases."""
        # Frontend sends assigned_to (PK); backend uses assigned_to_id.
        if 'assigned_to_id' not in attrs and 'assigned_to' in self.initial_data:
            attrs['assigned_to_id'] = self.initial_data.get('assigned_to')

        # Accept both caseType (camelCase) and case_type (snake_case) from frontend
        case_type = (
            attrs.get('caseType')
            or self.initial_data.get('caseType')
            or self.initial_data.get('case_type')
            or (self.instance.case_type if self.instance else None)
        )
        # Normalize ADMINISTRATIVE_DUTY -> ADMINISTRATIVE (frontend may use different label)
        if case_type == 'ADMINISTRATIVE_DUTY':
            case_type = 'ADMINISTRATIVE'
        if case_type:
            if case_type not in CASE_TYPES:
                raise serializers.ValidationError(
                    {'caseType': 'Must be one of: CONSULTATION, LITIGATION, ADMINISTRATIVE.'}
                )
            attrs['caseType'] = case_type
        case_specific_data = attrs.get('case_specific_data', None)

        # Validate type-specific sub-fields only when client sends non-empty case_specific_data.
        # Empty dict preserves backward compatibility (legacy creates without sub-fields).
        data = case_specific_data if isinstance(case_specific_data, dict) else {}
        if case_type and data:
            try:
                validated_data = validate_case_specific_data(case_type, data)
                attrs['case_specific_data'] = validated_data
                attrs['case_type'] = case_type
            except DjangoValidationError as e:
                msg = e.messages if e.messages else [str(e)]
                raise serializers.ValidationError({'case_specific_data': msg})
        elif case_type:
            attrs['case_type'] = case_type

        return attrs

    def create(self, validated_data):
        case_type = validated_data.pop('caseType', None) or 'LITIGATION'
        case_specific_data = validated_data.pop('case_specific_data', {})

        # Validate type-specific sub-fields when provided; legacy creates default to LITIGATION + {}
        validated_data['case_type'] = case_type
        validated_data['case_specific_data'] = case_specific_data

        # Ensure reference exists
        if not validated_data.get('reference'):
            validated_data['reference'] = str(uuid.uuid4())[:8].upper()

        instance: Case = super().create(validated_data)

        request = cast(HttpRequest, self.context.get('request'))
        user = cast('User', request.user)
        _owned_cabinet = user.get_owned_cabinet_or_none()
        _cabinet = _owned_cabinet if user.is_cabinet_owner() else user.cabinet

        if _cabinet:
            instance.cabinet = _cabinet
        else:
            instance.assigned_to = user

        instance.save()
        return instance

    def update(self, instance, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        case_type = validated_data.pop('caseType', None)
        case_specific_data = validated_data.pop('case_specific_data', None)

        if case_type is not None:
            validated_data['case_type'] = case_type
        if case_specific_data is not None:
            validated_data['case_specific_data'] = case_specific_data

        instance = super().update(instance, validated_data)

        # Handle assignment update
        if assigned_to_id is not None:
            request = cast(HttpRequest, self.context.get('request'))
            user = cast('User', request.user)
            _owned_cabinet = user.get_owned_cabinet_or_none()
            _cabinet = _owned_cabinet if user.is_cabinet_owner() else user.cabinet

            if assigned_to_id:
                from users.models import User
                try:
                    assignee = User.objects.get(pk=assigned_to_id)
                    assignee_cabinet = (
                        assignee.get_owned_cabinet_or_none()
                        if assignee.is_cabinet_owner()
                        else assignee.cabinet
                    )
                    if assignee_cabinet != _cabinet:
                        raise serializers.ValidationError(
                            'Cannot assign case to user from different cabinet.'
                        )
                    instance.assigned_to = assignee
                except User.DoesNotExist:
                    raise serializers.ValidationError('Invalid user ID for assignment.')
            else:
                instance.assigned_to = None

        instance.save()
        return instance
