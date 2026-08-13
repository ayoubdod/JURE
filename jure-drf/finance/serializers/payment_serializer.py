from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from finance.models import Invoice, Payment
from finance.services.invoice_totals_service import invoice_amount_outstanding


class PaymentSerializer(serializers.ModelSerializer):
    invoice = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    method = serializers.CharField(source='payment_method', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'case',
            'client',
            'invoice',
            'amount',
            'payment_method',
            'method',
            'payment_date',
            'reference',
            'status',
            'notes',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']

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
        fields = [
            'amount',
            'payment_method',
            'payment_date',
            'invoice_id',
            'reference',
            'notes',
        ]

    def validate_amount(self, value):
        if value is None or Decimal(str(value)) <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value

    def validate_invoice_id(self, invoice):
        case = self.context.get('case')
        if invoice and case and invoice.case_id != case.id:
            raise serializers.ValidationError('Invoice does not belong to this case.')
        return invoice

    def validate(self, attrs):
        case = self.context.get('case')
        if case and not case.client_id:
            raise serializers.ValidationError('Case must have a client to record a payment.')
        invoice = attrs.get('invoice')
        amount = attrs.get('amount')
        if invoice and amount is not None:
            if invoice.status == Invoice.Status.CANCELLED:
                raise serializers.ValidationError(
                    {'invoice_id': 'Cannot pay a cancelled invoice.'}
                )
            if invoice.status == Invoice.Status.DRAFT:
                raise serializers.ValidationError(
                    {'invoice_id': 'Send the invoice before recording a payment.'}
                )
            outstanding = invoice_amount_outstanding(invoice)
            if Decimal(str(amount)) > outstanding:
                raise serializers.ValidationError(
                    {
                        'amount': (
                            f'Payment exceeds outstanding balance ({float(outstanding)} MAD).'
                        )
                    }
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        from finance.services.audit_service import log_finance_action
        from finance.services.case_finance_service import get_or_create_firm_client

        case = self.context['case']
        request = self.context['request']
        client_profile = get_or_create_firm_client(case.client)
        if not client_profile:
            raise serializers.ValidationError('Could not resolve client profile for this case.')
        payment = Payment.objects.create(
            case=case,
            client=client_profile,
            status=Payment.Status.CONFIRMED,
            created_by=request.user if request.user.is_authenticated else None,
            **validated_data,
        )
        log_finance_action(
            cabinet=case.cabinet,
            kind='finance_payment_created',
            message=f'Payment {payment.amount} recorded',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Payment',
            entity_id=payment.id,
            new_value={
                'amount': float(payment.amount),
                'invoice_id': payment.invoice_id,
                'payment_method': payment.payment_method,
                'status': payment.status,
            },
        )
        return payment
