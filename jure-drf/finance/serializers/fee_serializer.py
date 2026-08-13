from decimal import Decimal

from django.db.models import Q
from rest_framework import serializers

from finance.models import Fee
from users.models import User


def _lawyer_in_case_cabinet(lawyer: User, case) -> bool:
    if not lawyer or not case or not case.cabinet:
        return False
    cab = case.cabinet
    if lawyer.cabinet_id == cab.id:
        return True
    if cab.owner_id == lawyer.id:
        return True
    return False


class LawyerMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')


class FeeSerializer(serializers.ModelSerializer):
    lawyer = serializers.SerializerMethodField()
    lawyer_name = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    planned_amount = serializers.SerializerMethodField()
    invoiced_amount = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    firm_id = serializers.SerializerMethodField()
    client_id = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Fee
        fields = [
            'id',
            'case',
            'firm_id',
            'client_id',
            'lawyer',
            'lawyer_name',
            'description',
            'fee_type',
            'amount',
            'amount_expected',
            'planned_amount',
            'currency',
            'fee_date',
            'amount_billed',
            'invoiced_amount',
            'amount_paid',
            'paid_amount',
            'remaining',
            'status',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'amount_billed',
            'amount_paid',
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_lawyer(self, obj):
        if not obj.lawyer_id:
            return None
        return LawyerMiniSerializer(obj.lawyer).data

    def get_lawyer_name(self, obj):
        if not obj.lawyer_id:
            return ''
        u = obj.lawyer
        return f'{u.first_name} {u.last_name}'.strip() or (u.email or '')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['lawyer_id'] = instance.lawyer_id
        for k in ('amount_expected', 'amount_billed', 'amount_paid', 'amount'):
            if k in data and data[k] is not None:
                data[k] = float(data[k])
        if 'remaining' in data and data['remaining'] is not None:
            data['remaining'] = float(data['remaining'])
        return data

    def get_remaining(self, obj):
        exp = obj.amount_expected or Decimal('0')
        paid = obj.amount_paid or Decimal('0')
        return float(exp - paid)

    def get_planned_amount(self, obj):
        if obj.amount_expected is None:
            return None
        return float(obj.amount_expected)

    def get_invoiced_amount(self, obj):
        return float(obj.amount_billed or 0)

    def get_paid_amount(self, obj):
        return float(obj.amount_paid or 0)

    def get_amount(self, obj):
        return float(obj.amount_expected or 0)

    def get_firm_id(self, obj):
        return obj.case.cabinet_id if obj.case_id else None

    def get_client_id(self, obj):
        return obj.case.client_id if obj.case_id else None


class FeeWriteSerializer(serializers.ModelSerializer):
    """
    Create/update fee (honoraire).

    - `planned_amount` is an alias for model field `amount_expected` (frontend contract).
    - `lawyer_id` must be a User.id belonging to the case cabinet.
    """

    planned_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        write_only=True,
        required=False,
    )
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        write_only=True,
        required=False,
    )
    lawyer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.none(),
        source='lawyer',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Fee
        fields = [
            'fee_type',
            'amount_expected',
            'planned_amount',
            'amount',
            'description',
            'currency',
            'fee_date',
            'lawyer_id',
            'notes',
        ]
        extra_kwargs = {
            'amount_expected': {'required': False},
            'description': {'required': False, 'allow_blank': True},
            'currency': {'required': False},
            'fee_date': {'required': False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        case = self.context.get('case')
        if case and case.cabinet_id:
            cab = case.cabinet
            qs = User.objects.filter(
                Q(cabinet_id=cab.id, is_cabinet_member=True) | Q(pk=cab.owner_id)
            ).distinct()
            self.fields['lawyer_id'].queryset = qs
        else:
            self.fields['lawyer_id'].queryset = User.objects.all()

    def validate(self, attrs):
        case = self.context.get('case')
        planned = attrs.pop('planned_amount', None)
        amount_alias = attrs.pop('amount', None)
        expected = attrs.get('amount_expected')

        candidates = [v for v in (planned, amount_alias, expected) if v is not None]
        if len(set(candidates)) > 1:
            raise serializers.ValidationError(
                {
                    'amount': (
                        'planned_amount, amount and amount_expected cannot both be set '
                        'to different values.'
                    )
                }
            )
        if candidates:
            attrs['amount_expected'] = candidates[0]
        if attrs.get('amount_expected') is None:
            raise serializers.ValidationError(
                {
                    'planned_amount': 'Provide planned_amount, amount or amount_expected.',
                    'amount_expected': 'Provide planned_amount, amount or amount_expected.',
                }
            )
        if attrs['amount_expected'] < 0:
            raise serializers.ValidationError({'amount': 'Amount cannot be negative.'})

        lawyer = attrs.get('lawyer')
        if lawyer and case and not _lawyer_in_case_cabinet(lawyer, case):
            raise serializers.ValidationError(
                {'lawyer_id': 'Lawyer must belong to the same cabinet as the case.'}
            )
        return attrs
