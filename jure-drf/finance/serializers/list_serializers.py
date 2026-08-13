"""Firm-wide list serializers aligned with frontend FinanceInvoiceListItem / PaymentListItem."""

from rest_framework import serializers

from finance.models import Invoice, Payment
from finance.services.invoice_totals_service import (
    invoice_amount_outstanding,
    invoice_amount_paid,
)


class FirmInvoiceListSerializer(serializers.ModelSerializer):
    number = serializers.CharField(source='invoice_number', read_only=True)
    case_id = serializers.IntegerField(read_only=True)
    case_reference = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    tva = serializers.SerializerMethodField()
    issue_date = serializers.DateField(source='issued_date', read_only=True)
    amount_paid = serializers.SerializerMethodField()
    amount_outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'number',
            'invoice_number',
            'case_id',
            'case_reference',
            'client_name',
            'amount_ht',
            'tva',
            'tva_amount',
            'amount_ttc',
            'amount_paid',
            'amount_outstanding',
            'status',
            'issue_date',
            'issued_date',
            'due_date',
            'tva_applicable',
            'tva_exoneration_note',
        ]

    def get_case_reference(self, obj):
        return obj.case.reference if obj.case_id else ''

    def get_client_name(self, obj):
        if not obj.client_id:
            return ''
        u = obj.client.user
        return f'{u.first_name} {u.last_name}'.strip() or (u.email or '')

    def get_tva(self, obj):
        return float(obj.tva_amount or 0)

    def get_amount_paid(self, obj):
        return float(invoice_amount_paid(obj))

    def get_amount_outstanding(self, obj):
        return float(invoice_amount_outstanding(obj))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for k in ('amount_ht', 'tva_amount', 'amount_ttc', 'tva'):
            if k in data and data[k] is not None:
                data[k] = float(data[k])
        return data


class FirmPaymentListSerializer(serializers.ModelSerializer):
    case_id = serializers.IntegerField(read_only=True)
    case_reference = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    method = serializers.CharField(source='payment_method', read_only=True)
    linked_invoice_number = serializers.SerializerMethodField()
    linked_invoice_id = serializers.IntegerField(source='invoice_id', read_only=True, allow_null=True)
    date = serializers.DateField(source='payment_date', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'case_id',
            'case_reference',
            'client_name',
            'amount',
            'method',
            'payment_method',
            'reference',
            'linked_invoice_number',
            'linked_invoice_id',
            'date',
            'payment_date',
            'status',
        ]

    def get_case_reference(self, obj):
        return obj.case.reference if obj.case_id else ''

    def get_client_name(self, obj):
        if not obj.client_id:
            return ''
        u = obj.client.user
        return f'{u.first_name} {u.last_name}'.strip() or (u.email or '')

    def get_linked_invoice_number(self, obj):
        if not obj.invoice_id:
            return None
        return obj.invoice.invoice_number

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'amount' in data and data['amount'] is not None:
            data['amount'] = float(data['amount'])
        return data
