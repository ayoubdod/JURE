from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from finance.models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id',
            'cabinet',
            'case',
            'client',
            'description',
            'category',
            'amount',
            'currency',
            'expense_date',
            'billable',
            'reimbursable',
            'receipt_reference',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'cabinet', 'case', 'client', 'created_by', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'amount' in data and data['amount'] is not None:
            data['amount'] = float(data['amount'])
        return data


class ExpenseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'description',
            'category',
            'amount',
            'currency',
            'expense_date',
            'billable',
            'reimbursable',
            'receipt_reference',
        ]
        extra_kwargs = {
            'currency': {'required': False},
            'category': {'required': False},
            'billable': {'required': False},
            'reimbursable': {'required': False},
            'receipt_reference': {'required': False, 'allow_blank': True},
        }

    def validate_amount(self, value):
        if value is None or Decimal(str(value)) < 0:
            raise serializers.ValidationError('Expense amount cannot be negative.')
        if Decimal(str(value)) == 0:
            raise serializers.ValidationError('Expense amount must be greater than zero.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        from finance.services.audit_service import log_finance_action
        from finance.services.case_finance_service import get_or_create_firm_client

        case = self.context['case']
        request = self.context['request']
        client_profile = get_or_create_firm_client(case.client) if case.client_id else None
        expense = Expense.objects.create(
            cabinet=case.cabinet,
            case=case,
            client=client_profile,
            created_by=request.user if request.user.is_authenticated else None,
            **validated_data,
        )
        log_finance_action(
            cabinet=case.cabinet,
            kind='finance_expense_created',
            message=f'Expense "{expense.description[:60]}" ({expense.amount})',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Expense',
            entity_id=expense.id,
            new_value={
                'amount': float(expense.amount),
                'category': expense.category,
                'billable': expense.billable,
            },
        )
        return expense

    @transaction.atomic
    def update(self, instance, validated_data):
        from finance.services.audit_service import log_finance_action

        previous = {
            'amount': float(instance.amount),
            'description': instance.description,
            'category': instance.category,
        }
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        request = self.context.get('request')
        log_finance_action(
            cabinet=instance.cabinet,
            kind='finance_expense_updated',
            message=f'Expense #{instance.id} updated',
            user=request.user if request and request.user.is_authenticated else None,
            entity_type='Expense',
            entity_id=instance.id,
            previous_value=previous,
            new_value={
                'amount': float(instance.amount),
                'description': instance.description,
                'category': instance.category,
            },
        )
        return instance
