"""
Case serializers with polymorphic validation. Validates case_type and
type-specific sub-fields (case_specific_data) based on discriminator.
"""
from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Case, CaseAttachment
from .validators import validate_case_specific_data, CASE_TYPES
from .utils import fetch_case_related_payload
from .consultation_fields import duration_minutes
from django.http import HttpRequest
from users.serializers import CustomUserDetailsSerializer

from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from users.models import User


def _file_size(att: CaseAttachment) -> int | None:
    try:
        return att.file.size if att.file else None
    except Exception:
        return None


class CaseAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = CustomUserDetailsSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = CaseAttachment
        fields = [
            "id",
            "file_name",
            "file_url",
            "file_size",
            "other_type",
            "uploaded_by",
            "created",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        try:
            url = obj.file.url
        except Exception:
            return None
        request = self.context.get("request")
        if request and url:
            return request.build_absolute_uri(url)
        return url

    def get_file_name(self, obj):
        return obj.display_name()

    def get_file_size(self, obj):
        return _file_size(obj)


class CaseSerializer(ModelSerializer):
    """
    Polymorphic case serializer. Accepts caseType + case_specific_data.
    Validates sub-fields per case type (CONSULTATION | LITIGATION | ADMINISTRATIVE).
    """

    assigned_to = CustomUserDetailsSerializer(read_only=True)
    assigned_to_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigned_attorneys = CustomUserDetailsSerializer(many=True, read_only=True)
    assigned_attorney_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    created_by = CustomUserDetailsSerializer(read_only=True)
    updated_at = serializers.SerializerMethodField()
    updated_by = CustomUserDetailsSerializer(read_only=True)
    convertedToCase = serializers.SerializerMethodField()
    convertedFromCase = serializers.SerializerMethodField()
    parentConsultation = serializers.SerializerMethodField()
    followUps = serializers.SerializerMethodField()
    followUpCount = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    conversion = serializers.SerializerMethodField()
    emailConfirmation = serializers.SerializerMethodField()
    scheduleConflicts = serializers.SerializerMethodField()
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
            'assigned_attorneys',
            'assigned_attorney_ids',
            'created_by',
            'created',
            'updated_at',
            'updated_by',
            'convertedToCase',
            'convertedFromCase',
            'parentConsultation',
            'followUps',
            'followUpCount',
            'attachments',
            'activity',
            'conversion',
            'emailConfirmation',
            'scheduleConflicts',
            '_counts',
            '_related',
        ]
        read_only_fields = ['cabinet', 'reference']
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

    def get_parentConsultation(self, obj):
        return self._populate_conversion_link(obj.parent_consultation)

    def get_followUpCount(self, obj):
        n = getattr(obj, "follow_up_count", None)
        if n is not None:
            return int(n)
        if obj.case_type != Case.CaseType.CONSULTATION:
            return 0
        return obj.follow_ups.count()

    def get_followUps(self, obj):
        if obj.case_type != Case.CaseType.CONSULTATION:
            return []
        if not self.context.get("include_related"):
            return None
        rows = obj.follow_ups.all().order_by("follow_up_sequence", "id")
        payload = []
        for child in rows:
            data = child.case_specific_data or {}
            attorneys = [self._user_summary(u) for u in child.assigned_attorneys.all() if u]
            if not attorneys and child.assigned_to:
                attorneys = [self._user_summary(child.assigned_to)]
            payload.append(
                {
                    "id": child.id,
                    "reference": child.reference,
                    "title": child.title,
                    "status": child.status,
                    "caseType": child.case_type,
                    "consultationDate": data.get("consultationDate"),
                    "durationMinutes": duration_minutes(data),
                    "format": data.get("format"),
                    "outcome": data.get("outcome") or child.status,
                    "assigned_to": self._user_summary(child.assigned_to),
                    "assigned_attorneys": attorneys,
                }
            )
        return payload

    def get_attachments(self, obj):
        if not self.context.get("include_related"):
            return None
        from django.db.models import Q

        qs = (
            CaseAttachment.objects.filter(Q(case=obj) | Q(linked_cases=obj))
            .select_related("uploaded_by")
            .distinct()
            .order_by("-created")
        )
        return CaseAttachmentSerializer(qs, many=True, context=self.context).data

    def get_activity(self, obj):
        if not self.context.get("include_related"):
            return None
        from .activity import consultation_activity_payload

        return consultation_activity_payload(obj)

    def get_conversion(self, obj):
        converted = obj.converted_to_case_id is not None
        return {
            "converted": converted,
            "convertedCase": self._populate_conversion_link(obj.converted_to_case) if converted else None,
        }

    def get_emailConfirmation(self, obj):
        return {
            "status": obj.email_confirmation_status or None,
            "error": obj.email_confirmation_error or None,
        }

    def get_scheduleConflicts(self, obj):
        return self.context.get("schedule_conflicts")

    def _user_summary(self, user):
        if not user:
            return None
        return {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        }

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
        for optional in ("followUps", "attachments", "activity", "scheduleConflicts"):
            if rep.get(optional) is None:
                rep.pop(optional, None)
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
        if 'assigned_attorney_ids' not in attrs and 'assigned_attorney_ids' in self.initial_data:
            attrs['assigned_attorney_ids'] = self.initial_data.get('assigned_attorney_ids')

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
                if getattr(e, 'message_dict', None):
                    raise serializers.ValidationError({'case_specific_data': e.message_dict})
                msg = e.messages if e.messages else [str(e)]
                raise serializers.ValidationError({'case_specific_data': msg})
        elif case_type:
            attrs['case_type'] = case_type

        return attrs

    def create(self, validated_data):
        case_type = validated_data.pop('caseType', None) or 'LITIGATION'
        case_specific_data = validated_data.pop('case_specific_data', {})
        attorney_ids = validated_data.pop('assigned_attorney_ids', None)
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        validated_data.pop('reference', None)

        validated_data['case_type'] = case_type
        validated_data['case_specific_data'] = case_specific_data

        cabinet = validated_data.get('cabinet')
        if cabinet:
            from .reference import allocate_typed_reference

            validated_data['reference'] = allocate_typed_reference(cabinet, case_type)
        else:
            from .utils import generate_unique_reference

            validated_data['reference'] = generate_unique_reference()

        if assigned_to_id is not None and not validated_data.get('assigned_to'):
            validated_data['assigned_to_id'] = assigned_to_id

        if attorney_ids is None:
            attorney_ids = self._co_counsel_ids(case_specific_data)

        instance: Case = super().create(validated_data)
        self._sync_attorneys(instance, attorney_ids, assigned_to_id or instance.assigned_to_id)
        return instance

    def update(self, instance, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        attorney_ids = validated_data.pop('assigned_attorney_ids', None)
        case_type = validated_data.pop('caseType', None)
        case_specific_data = validated_data.pop('case_specific_data', None)
        validated_data.pop('reference', None)

        if case_type is not None:
            validated_data['case_type'] = case_type
        if case_specific_data is not None:
            validated_data['case_specific_data'] = case_specific_data

        instance = super().update(instance, validated_data)

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
            instance.save(update_fields=['assigned_to'])

        if attorney_ids is None and case_specific_data is not None:
            attorney_ids = self._co_counsel_ids(case_specific_data)

        if attorney_ids is not None or assigned_to_id is not None:
            self._sync_attorneys(instance, attorney_ids, instance.assigned_to_id)
        return instance

    def _co_counsel_ids(self, case_specific_data):
        """Parse case_specific_data.coCounsel into user ids when assigned_attorney_ids is omitted."""
        if not isinstance(case_specific_data, dict):
            return None
        raw = case_specific_data.get('coCounsel')
        if not isinstance(raw, list):
            return None
        ids = []
        for item in raw:
            try:
                if isinstance(item, int):
                    ids.append(item)
                elif isinstance(item, str) and item.strip().isdigit():
                    ids.append(int(item.strip()))
                elif isinstance(item, dict):
                    val = item.get('id') or item.get('userId')
                    if val:
                        ids.append(int(val))
            except (TypeError, ValueError):
                continue
        return ids or None

    def _sync_attorneys(self, instance: Case, attorney_ids, primary_id):
        ids = []
        if attorney_ids:
            ids = [int(x) for x in attorney_ids if x]
        if primary_id and int(primary_id) not in ids:
            ids.append(int(primary_id))
        # Deduplicate while preserving order
        seen = set()
        unique = []
        for i in ids:
            if i not in seen:
                seen.add(i)
                unique.append(i)
        instance.assigned_attorneys.set(unique)
