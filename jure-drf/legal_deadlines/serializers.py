from rest_framework import serializers

from cases.models import Case
from django.contrib.auth import get_user_model

from .models import CalculatedDeadline, DeadlineReminder, DeadlineRule, LegalHoliday, LegalSource

User = get_user_model()


class LegalSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalSource
        fields = [
            "id",
            "jurisdiction",
            "code_name",
            "law_number",
            "title",
            "publication_date",
            "effective_from",
            "effective_until",
            "official_reference",
            "status",
            "source_url",
            "notes",
        ]


class DeadlineRuleSerializer(serializers.ModelSerializer):
    source = LegalSourceSerializer(read_only=True)
    computation_method_label = serializers.CharField(
        source="get_computation_method_display", read_only=True
    )
    procedure_type_label = serializers.CharField(source="get_procedure_type_display", read_only=True)
    event_type_label = serializers.CharField(source="get_event_type_display", read_only=True)
    legal_domain_label = serializers.CharField(source="get_legal_domain_display", read_only=True)

    class Meta:
        model = DeadlineRule
        fields = [
            "id",
            "code",
            "name",
            "jurisdiction",
            "legal_domain",
            "legal_domain_label",
            "procedure_type",
            "procedure_type_label",
            "event_type",
            "event_type_label",
            "duration_value",
            "duration_unit",
            "computation_method",
            "computation_method_label",
            "exclude_triggering_day",
            "adjust_non_working_final_day",
            "weekend_days",
            "source",
            "article_reference",
            "version",
            "effective_from",
            "effective_until",
            "active",
            "verification_status",
            "notes",
            "special_conditions",
        ]


class LegalHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalHoliday
        fields = [
            "id",
            "jurisdiction",
            "name",
            "date",
            "year",
            "holiday_type",
            "is_legally_relevant",
            "notes",
        ]


class DeadlineReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeadlineReminder
        fields = ["id", "days_before", "created", "notified_at"]
        read_only_fields = ["id", "created", "notified_at"]


class CalculateDeadlineSerializer(serializers.Serializer):
    rule_id = serializers.IntegerField(required=False)
    legal_domain = serializers.ChoiceField(
        choices=DeadlineRule.LegalDomain.choices,
        default=DeadlineRule.LegalDomain.CIVIL_PROCEDURE,
        required=False,
    )
    procedure_type = serializers.ChoiceField(choices=DeadlineRule.ProcedureType.choices, required=False)
    event_type = serializers.ChoiceField(
        choices=DeadlineRule.EventType.choices,
        required=False,
        default=DeadlineRule.EventType.NOTIFICATION,
    )
    triggering_date = serializers.DateField()
    jurisdiction = serializers.CharField(required=False, default="MA")
    contextual_parameters = serializers.DictField(required=False, default=dict)

    def validate(self, attrs):
        if not attrs.get("rule_id") and not attrs.get("procedure_type"):
            raise serializers.ValidationError(
                {"procedure_type": "Provide procedure_type or rule_id."}
            )
        domain = attrs.get("legal_domain", DeadlineRule.LegalDomain.CIVIL_PROCEDURE)
        if domain != DeadlineRule.LegalDomain.CIVIL_PROCEDURE:
            raise serializers.ValidationError(
                {
                    "legal_domain": (
                        "Only Civil Procedure is available in this MVP. "
                        "No verified rule is currently available for this procedure."
                    )
                }
            )
        return attrs


class SaveDeadlineSerializer(CalculateDeadlineSerializer):
    case = serializers.PrimaryKeyRelatedField(queryset=Case.objects.none())
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    manual_deadline = serializers.DateField(required=False, allow_null=True)
    override_reason = serializers.CharField(required=False, allow_blank=True, default="")
    reminder_offsets = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        required=False,
        default=list,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            cabinet = request.user.get_owned_cabinet_or_none() or request.user.cabinet
            if cabinet:
                self.fields["case"].queryset = Case.objects.filter(cabinet=cabinet)


class CalculatedDeadlineSerializer(serializers.ModelSerializer):
    rule = DeadlineRuleSerializer(read_only=True)
    reminders = DeadlineReminderSerializer(many=True, read_only=True)
    case_title = serializers.CharField(source="case.title", read_only=True)
    case_reference = serializers.CharField(source="case.reference", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default=None)

    class Meta:
        model = CalculatedDeadline
        fields = [
            "id",
            "cabinet",
            "case",
            "case_title",
            "case_reference",
            "created_by",
            "created_by_email",
            "rule",
            "rule_snapshot",
            "triggering_event_type",
            "triggering_date",
            "calculated_deadline",
            "final_deadline",
            "is_manual_override",
            "original_calculated_deadline",
            "override_reason",
            "override_by",
            "override_at",
            "status",
            "calculation_explanation",
            "contextual_parameters",
            "notes",
            "linked_task",
            "reminders",
            "created",
            "modified",
        ]
        read_only_fields = [
            "id",
            "cabinet",
            "created_by",
            "rule",
            "rule_snapshot",
            "calculated_deadline",
            "original_calculated_deadline",
            "override_by",
            "override_at",
            "calculation_explanation",
            "linked_task",
            "created",
            "modified",
        ]


class CalculatedDeadlineUpdateSerializer(serializers.ModelSerializer):
    manual_deadline = serializers.DateField(required=False, allow_null=True)
    reminder_offsets = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        required=False,
    )

    class Meta:
        model = CalculatedDeadline
        fields = [
            "notes",
            "status",
            "manual_deadline",
            "override_reason",
            "reminder_offsets",
        ]

    def validate_status(self, value):
        allowed = {
            CalculatedDeadline.Status.COMPLETED,
            CalculatedDeadline.Status.CANCELLED,
            CalculatedDeadline.Status.UPCOMING,
            CalculatedDeadline.Status.DUE_SOON,
            CalculatedDeadline.Status.DUE_TODAY,
            CalculatedDeadline.Status.OVERDUE,
        }
        if value not in allowed:
            raise serializers.ValidationError("Invalid status.")
        return value


class CreateTaskFromDeadlineSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(), required=False, allow_null=True
    )
    priority = serializers.ChoiceField(
        choices=["low", "medium", "high"],
        required=False,
        default="high",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            cabinet = request.user.get_owned_cabinet_or_none() or request.user.cabinet
            if cabinet:
                self.fields["assigned_to"].queryset = User.objects.filter(
                    cabinet=cabinet, is_cabinet_member=True
                )


class DomainSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()
    available = serializers.BooleanField()
    message = serializers.CharField(allow_blank=True)
