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
    remaining = serializers.SerializerMethodField()
    planned_amount = serializers.SerializerMethodField()

    class Meta:
        model = Fee
        fields = [
            'id',
            'case',
            'lawyer',
            'fee_type',
            'amount_expected',
            'planned_amount',
            'amount_billed',
            'amount_paid',
            'remaining',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'amount_billed', 'amount_paid', 'created_at', 'updated_at']

    def get_lawyer(self, obj):
        if not obj.lawyer_id:
            return None
        return LawyerMiniSerializer(obj.lawyer).data

    def get_remaining(self, obj):
        exp = obj.amount_expected or Decimal('0')
        paid = obj.amount_paid or Decimal('0')
        return float(exp - paid)

    def get_planned_amount(self, obj):
        if obj.amount_expected is None:
            return None
        return float(obj.amount_expected)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for k in ('amount_expected', 'amount_billed', 'amount_paid'):
            if k in data and data[k] is not None:
                data[k] = float(data[k])
        if 'remaining' in data and data['remaining'] is not None:
            data['remaining'] = float(data['remaining'])
        return data


class FeeWriteSerializer(serializers.ModelSerializer):
    """
    Create/update fee (honoraire).

    - `planned_amount` is an alias for model field `amount_expected` (frontend contract).
    - `lawyer_id` must be a **User.id** for a user who belongs to the case cabinet
      (cabinet member or cabinet owner). This matches `GET /api/v1/cabinets/members/`
      where each member row is a User and `id` is Django `User.pk` (there is no
      separate CabinetMember table).
    """

    planned_amount = serializers.DecimalField(
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
        fields = ['fee_type', 'amount_expected', 'planned_amount', 'lawyer_id', 'notes']
        extra_kwargs = {
            'amount_expected': {'required': False},
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
        expected = attrs.get('amount_expected')
        if planned is not None and expected is not None and planned != expected:
            raise serializers.ValidationError(
                {
                    'planned_amount': (
                        'planned_amount and amount_expected cannot both be set to different values.'
                    )
                }
            )
        if planned is not None:
            attrs['amount_expected'] = planned
        if attrs.get('amount_expected') is None:
            raise serializers.ValidationError(
                {
                    'planned_amount': 'Provide planned_amount or amount_expected.',
                    'amount_expected': 'Provide planned_amount or amount_expected.',
                }
            )
        lawyer = attrs.get('lawyer')
        if lawyer and case and not _lawyer_in_case_cabinet(lawyer, case):
            raise serializers.ValidationError(
                {'lawyer_id': 'Lawyer must belong to the same cabinet as the case.'}
            )
        return attrs
