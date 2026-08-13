from django.utils import timezone
from rest_framework import serializers

from finance.models import TaxAdvance


class TaxAdvanceSerializer(serializers.ModelSerializer):
    paid_at = serializers.DateField(source='paid_date', read_only=True, allow_null=True)

    class Meta:
        model = TaxAdvance
        fields = ['id', 'case', 'amount', 'status', 'paid_date', 'paid_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'case', 'amount', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'amount' in data and data['amount'] is not None:
            data['amount'] = float(data['amount'])
        return data


class TaxAdvancePatchSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[TaxAdvance.Status.PAID, TaxAdvance.Status.UNPAID])
    paid_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        status = attrs.get('status')
        paid_date = attrs.get('paid_date')
        if status == TaxAdvance.Status.PAID and not paid_date:
            attrs['paid_date'] = timezone.now().date()
        if status == TaxAdvance.Status.UNPAID:
            attrs['paid_date'] = None
        return attrs
