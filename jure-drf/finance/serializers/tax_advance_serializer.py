from rest_framework import serializers

from finance.models import TaxAdvance


class TaxAdvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxAdvance
        fields = ['id', 'case', 'amount', 'status', 'paid_date', 'created_at']
        read_only_fields = ['id', 'case', 'amount', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'amount' in data and data['amount'] is not None:
            data['amount'] = float(data['amount'])
        return data


class TaxAdvancePatchSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[TaxAdvance.Status.PAID])
    paid_date = serializers.DateField()
