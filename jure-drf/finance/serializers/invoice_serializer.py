from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from finance.models import Expense, Fee, Invoice, InvoiceItem
from finance.services.invoice_totals_service import (
    ensure_default_invoice_item,
    invoice_amount_outstanding,
    invoice_amount_paid,
    replace_invoice_items,
)


def _assert_line_refs_on_case(case, items):
    """Invoice lines may only point at fees/expenses on the same matter."""
    if not case or not items:
        return
    for item in items:
        fee_id = item.get('fee_id')
        if fee_id and not Fee.objects.filter(pk=fee_id, case=case).exists():
            raise serializers.ValidationError({'items': f'Fee {fee_id} not on this case.'})
        expense_id = item.get('expense_id')
        if expense_id and not Expense.objects.filter(pk=expense_id, case=case).exists():
            raise serializers.ValidationError(
                {'items': f'Expense {expense_id} not on this case.'}
            )


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            'id',
            'description',
            'quantity',
            'unit_price',
            'amount',
            'fee',
            'expense',
        ]
        read_only_fields = ['id', 'amount']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for k in ('quantity', 'unit_price', 'amount'):
            if k in data and data[k] is not None:
                data[k] = float(data[k])
        return data


class InvoiceItemWriteSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('1.00'))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    fee_id = serializers.IntegerField(required=False, allow_null=True)
    expense_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_quantity(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Quantity cannot be negative.')
        return value

    def validate_unit_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Unit price cannot be negative.')
        return value


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
    client_name = serializers.SerializerMethodField()
    case_id = serializers.IntegerField(read_only=True)
    case_reference = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    amount_paid = serializers.SerializerMethodField()
    amount_outstanding = serializers.SerializerMethodField()
    number = serializers.CharField(source='invoice_number', read_only=True)
    tva = serializers.SerializerMethodField()
    issue_date = serializers.DateField(source='issued_date', read_only=True)
    subtotal = serializers.SerializerMethodField()
    tax_amount = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'number',
            'case',
            'case_id',
            'case_reference',
            'client',
            'client_name',
            'fee',
            'amount_ht',
            'subtotal',
            'tva_rate',
            'tva_amount',
            'tva',
            'tax_amount',
            'amount_ttc',
            'total',
            'amount_paid',
            'amount_outstanding',
            'tva_applicable',
            'tva_exoneration_note',
            'status',
            'issued_date',
            'issue_date',
            'due_date',
            'notes',
            'items',
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

    def get_client_name(self, obj):
        if not obj.client_id:
            return ''
        u = obj.client.user
        return f'{u.first_name} {u.last_name}'.strip() or (u.email or '')

    def get_case_reference(self, obj):
        return obj.case.reference if obj.case_id else ''

    def get_is_overdue(self, obj):
        from django.utils import timezone

        today = timezone.now().date()
        if not obj.due_date:
            return False
        if obj.status == Invoice.Status.PAID:
            return False
        return obj.due_date < today

    def get_amount_paid(self, obj):
        return float(invoice_amount_paid(obj))

    def get_amount_outstanding(self, obj):
        return float(invoice_amount_outstanding(obj))

    def get_tva(self, obj):
        return float(obj.tva_amount or 0)

    def get_subtotal(self, obj):
        return float(obj.amount_ht or 0)

    def get_tax_amount(self, obj):
        return float(obj.tva_amount or 0)

    def get_total(self, obj):
        return float(obj.amount_ttc or 0)

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
    items = InvoiceItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = ['fee_id', 'amount_ht', 'due_date', 'notes', 'items']
        extra_kwargs = {
            'amount_ht': {'required': False},
            'due_date': {'required': False, 'allow_null': True},
            'notes': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        case = self.context.get('case')
        if case:
            self.fields['fee_id'].queryset = Fee.objects.filter(case=case)

    def to_internal_value(self, data):
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
        items = attrs.get('items') or []
        amount_ht = attrs.get('amount_ht')
        if items:
            subtotal = sum(
                (Decimal(str(i['quantity'])) * Decimal(str(i['unit_price']))).quantize(
                    Decimal('0.01')
                )
                for i in items
            )
            attrs['amount_ht'] = subtotal
        elif amount_ht is None:
            raise serializers.ValidationError(
                {'amount_ht': 'Provide amount_ht or at least one invoice item.'}
            )
        elif Decimal(str(amount_ht)) < 0:
            raise serializers.ValidationError({'amount_ht': 'Amount cannot be negative.'})

        _assert_line_refs_on_case(self.context.get('case'), items)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        from finance.services.audit_service import log_finance_action
        from finance.services.case_finance_service import get_or_create_firm_client

        items_data = validated_data.pop('items', None)
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
        if items_data:
            replace_invoice_items(inv, items_data)
        else:
            ensure_default_invoice_item(inv)
        inv.refresh_from_db()
        log_finance_action(
            cabinet=case.cabinet,
            kind='finance_invoice_created',
            message=f'Invoice {inv.invoice_number} created (TTC {inv.amount_ttc})',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Invoice',
            entity_id=inv.id,
            new_value={
                'invoice_number': inv.invoice_number,
                'amount_ht': float(inv.amount_ht),
                'amount_ttc': float(inv.amount_ttc),
                'status': inv.status,
            },
        )
        return inv


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    items = InvoiceItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = ['amount_ht', 'due_date', 'notes', 'tva_rate', 'items']
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
            if 'items' in attrs:
                blocked.append('items')
            if blocked:
                raise serializers.ValidationError(
                    {
                        'detail': (
                            'Seuls les brouillons permettent de modifier le montant HT / la TVA / les lignes. '
                            'Vous pouvez mettre à jour les notes et la date d’échéance.'
                        ),
                        **{k: ['Modification interdite pour ce statut.'] for k in blocked},
                    }
                )
        if inv is not None:
            _assert_line_refs_on_case(inv.case, attrs.get('items'))
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        from finance.services.audit_service import log_finance_action

        items_data = validated_data.pop('items', None)
        previous = {
            'amount_ht': float(instance.amount_ht),
            'due_date': instance.due_date.isoformat() if instance.due_date else None,
            'notes': instance.notes,
            'status': instance.status,
        }
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items_data is not None:
            replace_invoice_items(instance, items_data)
        instance.refresh_from_db()
        request = self.context.get('request')
        log_finance_action(
            cabinet=instance.cabinet,
            kind='finance_invoice_updated',
            message=f'Invoice {instance.invoice_number} updated',
            user=request.user if request and request.user.is_authenticated else None,
            entity_type='Invoice',
            entity_id=instance.id,
            previous_value=previous,
            new_value={
                'amount_ht': float(instance.amount_ht),
                'due_date': instance.due_date.isoformat() if instance.due_date else None,
                'notes': instance.notes,
                'status': instance.status,
            },
        )
        return instance


class InvoiceStatusPatchSerializer(serializers.Serializer):
    """
    Manual transitions only: SENT / CANCELLED.

    Payment-driven statuses (PARTIALLY_PAID, PAID, OVERDUE) are server-side.

    Allowed:
      DRAFT → SENT
      DRAFT → CANCELLED
      SENT → CANCELLED
      PARTIALLY_PAID → CANCELLED
      OVERDUE → CANCELLED
      OVERDUE → SENT (re-open overdue as sent if still unpaid — then sync may re-overdue)

    Forbidden:
      CANCELLED → anything
      PAID → anything manual
      * → PAID / PARTIALLY_PAID / OVERDUE / DRAFT via this endpoint
    """

    status = serializers.ChoiceField(
        choices=[
            Invoice.Status.SENT,
            Invoice.Status.CANCELLED,
        ]
    )

    def validate(self, attrs):
        inv = self.context.get('invoice')
        new_status = attrs.get('status')
        if inv is None:
            return attrs
        current = inv.status
        if current == Invoice.Status.CANCELLED:
            raise serializers.ValidationError(
                {'status': 'Cancelled invoices cannot change status.'}
            )
        if current == Invoice.Status.PAID:
            raise serializers.ValidationError(
                {'status': 'Paid invoices cannot be changed via status endpoint.'}
            )
        if new_status == Invoice.Status.SENT and current not in (
            Invoice.Status.DRAFT,
            Invoice.Status.SENT,
            Invoice.Status.OVERDUE,
            Invoice.Status.PARTIALLY_PAID,
        ):
            raise serializers.ValidationError(
                {'status': f'Cannot transition from {current} to SENT.'}
            )
        if new_status == Invoice.Status.CANCELLED and current == Invoice.Status.PAID:
            raise serializers.ValidationError(
                {'status': 'Paid invoices cannot be cancelled via status endpoint.'}
            )
        return attrs

