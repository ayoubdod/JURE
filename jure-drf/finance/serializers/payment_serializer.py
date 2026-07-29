from rest_framework import serializers

from finance.models import Invoice, Payment


class PaymentSerializer(serializers.ModelSerializer):
    invoice = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'case',
            'client',
            'invoice',
            'amount',
            'payment_method',
            'payment_date',
            'reference',
            'notes',
            'created_by',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_invoice(self, obj):
        if not obj.invoice_id:
            return None
        inv = obj.invoice
        return {
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'amount_ttc': float(inv.amount_ttc),
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'amount' in data and data['amount'] is not None:
            data['amount'] = float(data['amount'])
        return data


class PaymentCreateSerializer(serializers.ModelSerializer):
    invoice_id = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        source='invoice',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Payment
        fields = ['amount', 'payment_method', 'payment_date', 'invoice_id', 'reference', 'notes']

    def validate_invoice_id(self, invoice):
        case = self.context.get('case')
        if invoice and case and invoice.case_id != case.id:
            raise serializers.ValidationError('Invoice does not belong to this case.')
        return invoice

    def validate(self, attrs):
        case = self.context.get('case')
        if case and not case.client_id:
            raise serializers.ValidationError('Case must have a client to record a payment.')
        return attrs

    def create(self, validated_data):
        from finance.services.case_finance_service import get_or_create_firm_client

        case = self.context['case']
        request = self.context['request']
        client_profile = get_or_create_firm_client(case.client)
        if not client_profile:
            raise serializers.ValidationError('Could not resolve client profile for this case.')
        return Payment.objects.create(
            case=case,
            client=client_profile,
            created_by=request.user if request.user.is_authenticated else None,
            **validated_data,
        )
