from decimal import Decimal

from rest_framework import serializers

from finance.models import Fee, Invoice


class InvoiceClientNestedSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='user.id')
    name = serializers.SerializerMethodField()
    ice = serializers.CharField(allow_null=True, required=False)
    if_number = serializers.CharField(allow_null=True, required=False)

    def get_name(self, obj):
        u = obj.user
        return f'{u.first_name} {u.last_name}'.strip()


class InvoiceSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'case',
            'client',
            'fee',
            'amount_ht',
            'tva_rate',
            'tva_amount',
            'amount_ttc',
            'tva_applicable',
            'tva_exoneration_note',
            'status',
            'issued_date',
            'due_date',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
            'is_overdue',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'tva_amount',
            'amount_ttc',
            'issued_date',
            'created_at',
            'updated_at',
        ]

    def get_client(self, obj):
        return InvoiceClientNestedSerializer(obj.client).data

    def get_is_overdue(self, obj):
        from django.utils import timezone

        today = timezone.now().date()
        if not obj.due_date:
            return False
        if obj.status == Invoice.Status.PAID:
            return False
        return obj.due_date < today

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for k in ('amount_ht', 'tva_rate', 'tva_amount', 'amount_ttc'):
            if k in data and data[k] is not None:
                data[k] = float(data[k])
        return data


class InvoiceCreateSerializer(serializers.ModelSerializer):
    fee_id = serializers.PrimaryKeyRelatedField(
        queryset=Fee.objects.none(),
        source='fee',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Invoice
        fields = ['fee_id', 'amount_ht', 'due_date', 'notes']
        extra_kwargs = {
            'amount_ht': {'required': True},
            'due_date': {'required': False, 'allow_null': True},
            'notes': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        case = self.context.get('case')
        if case:
            from finance.models import Fee

            self.fields['fee_id'].queryset = Fee.objects.filter(case=case)

    def to_internal_value(self, data):
        # JSON clients sometimes send ISO datetimes; DateField expects YYYY-MM-DD.
        if isinstance(data, dict):
            data = {**data}
            dd = data.get('due_date')
            if isinstance(dd, str) and 'T' in dd:
                data['due_date'] = dd.split('T', 1)[0].strip()
        return super().to_internal_value(data)

    def validate(self, attrs):
        case = self.context.get('case')
        if case:
            if not case.cabinet_id:
                raise serializers.ValidationError(
                    {'case': 'Case must belong to a cabinet to create an invoice.'}
                )
            if not case.client_id:
                raise serializers.ValidationError(
                    {'client': 'Case must have a client to create an invoice.'}
                )
        return attrs

    def create(self, validated_data):
        from finance.services.case_finance_service import get_or_create_firm_client

        case = self.context['case']
        request = self.context['request']
        fee = validated_data.pop('fee', None)
        client_profile = get_or_create_firm_client(case.client)
        if not client_profile:
            raise serializers.ValidationError(
                {'client': 'Could not resolve client profile for this case.'}
            )
        inv = Invoice.objects.create(
            cabinet=case.cabinet,
            case=case,
            client=client_profile,
            fee=fee,
            amount_ht=validated_data['amount_ht'],
            due_date=validated_data.get('due_date'),
            notes=validated_data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        return inv


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['amount_ht', 'due_date', 'notes', 'tva_rate']
        extra_kwargs = {
            'due_date': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        inv = self.instance
        if inv and inv.status != Invoice.Status.DRAFT:
            blocked = []
            if 'amount_ht' in attrs:
                blocked.append('amount_ht')
            if 'tva_rate' in attrs:
                blocked.append('tva_rate')
            if blocked:
                raise serializers.ValidationError(
                    {
                        'detail': (
                            'Seuls les brouillons permettent de modifier le montant HT / la TVA. '
                            'Vous pouvez mettre à jour les notes et la date d’échéance.'
                        ),
                        **{k: ['Modification interdite pour ce statut.'] for k in blocked},
                    }
                )
        return attrs


class InvoiceStatusPatchSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            Invoice.Status.SENT,
            Invoice.Status.OVERDUE,
            Invoice.Status.CANCELLED,
        ]
    )
