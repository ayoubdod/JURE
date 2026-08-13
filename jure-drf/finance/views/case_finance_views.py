import logging
from decimal import Decimal

from django.db.models import Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case
from core.utils import get_user_cabinet
from finance.models import Expense, Fee, Invoice, Payment, TaxAdvance
from finance.permissions import IsFinanceAuthorized
from finance.serializers import (
    ExpenseSerializer,
    ExpenseWriteSerializer,
    FeeSerializer,
    FeeWriteSerializer,
    InvoiceCreateSerializer,
    InvoiceSerializer,
    InvoiceUpdateSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    TaxAdvancePatchSerializer,
    TaxAdvanceSerializer,
)
from finance.services.audit_service import log_finance_action
from finance.services.invoice_pdf import build_invoice_pdf

logger = logging.getLogger(__name__)


def _case_in_cabinet_or_404(user, case_id):
    cab = get_user_cabinet(user)
    if not cab:
        return None
    return get_object_or_404(
        Case.objects.select_related('cabinet'),
        pk=case_id,
        cabinet=cab,
    )


def _remaining_status(case: Case) -> str:
    if case.financial_status == Case.FinancialStatus.PAID:
        return 'settled'
    if case.financial_status == Case.FinancialStatus.OVERDUE:
        return 'overdue'
    return 'due'


def _invoice_qs_for_case(case):
    return (
        Invoice.objects.filter(case=case)
        .select_related('client__user', 'fee', 'created_by')
        .prefetch_related('items')
    )


class CaseFinanceSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        fees = Fee.objects.filter(case=case).select_related('lawyer')
        invoices = _invoice_qs_for_case(case)
        payments = Payment.objects.filter(case=case).select_related(
            'client__user', 'invoice', 'created_by'
        )
        expenses = Expense.objects.filter(case=case).select_related('client', 'created_by')
        tax_advance = TaxAdvance.objects.filter(case=case).first()

        amount_expected = fees.aggregate(s=Sum('amount_expected'))['s'] or 0
        total_billed = case.total_billed
        total_paid = case.total_paid
        remaining = float(total_billed - total_paid) if total_billed or total_paid else 0.0
        total_expenses = expenses.aggregate(s=Sum('amount'))['s'] or 0

        ta_payload = None
        if tax_advance:
            ta_payload = {
                'amount': float(tax_advance.amount),
                'status': tax_advance.status,
                'paid_date': tax_advance.paid_date.isoformat() if tax_advance.paid_date else None,
                'paid_at': tax_advance.paid_date.isoformat() if tax_advance.paid_date else None,
            }

        planned = float(amount_expected)
        invoiced = float(total_billed)
        paid = float(total_paid)
        expenses_total = float(total_expenses)
        # Net cash position for the matter: collected − expenses (backend source of truth)
        net_position = float(
            (Decimal(str(total_paid)) - Decimal(str(total_expenses))).quantize(Decimal('0.01'))
        )

        return Response(
            {
                'case': {
                    'id': case.id,
                    'reference': case.reference,
                    'title': case.title,
                    'caseType': case.case_type,
                    'status': case.status,
                },
                'financial_status': case.financial_status,
                'summary': {
                    'amount_expected': planned,
                    'total_billed': invoiced,
                    'total_paid': paid,
                    'remaining': remaining,
                    'planned': planned,
                    'invoiced': invoiced,
                    'paid': paid,
                    'remaining_status': _remaining_status(case),
                    'total_expenses': expenses_total,
                    'expenses': expenses_total,
                    'outstanding': remaining,
                    'net_position': net_position,
                },
                'fees': FeeSerializer(fees, many=True).data,
                'invoices': InvoiceSerializer(invoices, many=True).data,
                'payments': PaymentSerializer(payments, many=True).data,
                'expenses': ExpenseSerializer(expenses, many=True).data,
                'tax_advance': ta_payload,
            }
        )


class FeeListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Fee.objects.filter(case=case).select_related('lawyer')
        return Response(FeeSerializer(qs, many=True).data)

    def post(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = FeeWriteSerializer(data=request.data, context={'case': case, 'request': request})
        ser.is_valid(raise_exception=True)
        fee = Fee.objects.create(
            case=case,
            created_by=request.user if request.user.is_authenticated else None,
            **ser.validated_data,
        )
        log_finance_action(
            cabinet=case.cabinet,
            kind='finance_fee_created',
            message=f'Fee #{fee.id} created ({fee.amount_expected})',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Fee',
            entity_id=fee.id,
            new_value={
                'amount_expected': float(fee.amount_expected),
                'fee_type': fee.fee_type,
                'status': fee.status,
            },
        )
        return Response(FeeSerializer(fee).data, status=status.HTTP_201_CREATED)


class ExpenseListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Expense.objects.filter(case=case).select_related('client', 'created_by')
        return Response(ExpenseSerializer(qs, many=True).data)

    def post(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = ExpenseWriteSerializer(
            data=request.data, context={'case': case, 'request': request}
        )
        ser.is_valid(raise_exception=True)
        expense = ser.save()
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        expense = get_object_or_404(
            Expense.objects.select_related('case', 'cabinet', 'client', 'created_by'),
            pk=pk,
        )
        if expense.cabinet_id != cab.id:
            return None
        return expense

    def get(self, request, pk):
        expense = self.get_object(request, pk)
        if expense is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ExpenseSerializer(expense).data)

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        expense = self.get_object(request, pk)
        if expense is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = ExpenseWriteSerializer(
            expense,
            data=request.data,
            partial=partial,
            context={'case': expense.case, 'request': request},
        )
        ser.is_valid(raise_exception=True)
        expense = ser.save()
        return Response(ExpenseSerializer(expense).data)

    def delete(self, request, pk):
        expense = self.get_object(request, pk)
        if expense is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        expense_id = expense.id
        cabinet = expense.cabinet
        description = expense.description
        amount = float(expense.amount)
        expense.delete()
        log_finance_action(
            cabinet=cabinet,
            kind='finance_expense_deleted',
            message=f'Expense "{description[:60]}" deleted',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Expense',
            entity_id=expense_id,
            previous_value={'amount': amount, 'description': description},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = _invoice_qs_for_case(case)
        return Response(InvoiceSerializer(qs, many=True).data)

    def post(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        logger.info(
            'invoice_create POST case_id=%s user_id=%s body=%s',
            case_id,
            getattr(request.user, 'pk', None),
            request.data,
        )
        ser = InvoiceCreateSerializer(
            data=request.data, context={'case': case, 'request': request}
        )
        ser.is_valid(raise_exception=True)
        inv = ser.save()
        inv = (
            Invoice.objects.select_related('client__user', 'fee', 'created_by')
            .prefetch_related('items')
            .get(pk=inv.pk)
        )
        return Response(InvoiceSerializer(inv).data, status=status.HTTP_201_CREATED)


class PaymentListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Payment.objects.filter(case=case).select_related(
            'client__user', 'invoice', 'created_by'
        )
        return Response(PaymentSerializer(qs, many=True).data)

    def post(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = PaymentCreateSerializer(
            data=request.data, context={'case': case, 'request': request}
        )
        ser.is_valid(raise_exception=True)
        payment = ser.save()
        payment.refresh_from_db()
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class TaxAdvanceCaseView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ta = TaxAdvance.objects.filter(case=case).first()
        if not ta:
            return Response({}, status=status.HTTP_200_OK)
        return Response(TaxAdvanceSerializer(ta).data)

    def patch(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ta = TaxAdvance.objects.filter(case=case).first()
        if not ta:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = TaxAdvancePatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        previous = {
            'status': ta.status,
            'paid_date': ta.paid_date.isoformat() if ta.paid_date else None,
        }
        ta.status = ser.validated_data['status']
        ta.paid_date = ser.validated_data.get('paid_date')
        ta.save(update_fields=['status', 'paid_date', 'updated_at'])
        log_finance_action(
            cabinet=case.cabinet,
            kind='finance_tax_advance_updated',
            message=f'Tax advance for case #{case.id} → {ta.status}',
            user=request.user if request.user.is_authenticated else None,
            entity_type='TaxAdvance',
            entity_id=ta.id,
            previous_value=previous,
            new_value={
                'status': ta.status,
                'paid_date': ta.paid_date.isoformat() if ta.paid_date else None,
            },
        )
        return Response(TaxAdvanceSerializer(ta).data)


class FeeDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        fee = get_object_or_404(
            Fee.objects.select_related('case', 'lawyer', 'created_by'), pk=pk
        )
        if fee.case.cabinet_id != cab.id:
            return None
        return fee

    def get(self, request, pk):
        fee = self.get_object(request, pk)
        if fee is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FeeSerializer(fee).data)

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        fee = self.get_object(request, pk)
        if fee is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        previous = {
            'amount_expected': float(fee.amount_expected),
            'fee_type': fee.fee_type,
            'status': fee.status,
            'description': fee.description,
        }
        ser = FeeWriteSerializer(
            fee,
            data=request.data,
            partial=partial,
            context={'case': fee.case, 'request': request},
        )
        ser.is_valid(raise_exception=True)
        for k, v in ser.validated_data.items():
            setattr(fee, k, v)
        fee.save()
        log_finance_action(
            cabinet=fee.case.cabinet,
            kind='finance_fee_updated',
            message=f'Fee #{fee.id} updated',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Fee',
            entity_id=fee.id,
            previous_value=previous,
            new_value={
                'amount_expected': float(fee.amount_expected),
                'fee_type': fee.fee_type,
                'status': fee.status,
                'description': fee.description,
            },
        )
        return Response(FeeSerializer(fee).data)

    def delete(self, request, pk):
        fee = self.get_object(request, pk)
        if fee is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        fee_id = fee.id
        case = fee.case
        cabinet = case.cabinet
        previous = {
            'amount_expected': float(fee.amount_expected),
            'fee_type': fee.fee_type,
            'status': fee.status,
        }
        # Detach invoices first so PROTECT / integrity constraints cannot block delete.
        Invoice.objects.filter(fee=fee).update(fee=None)
        fee.delete()
        from finance.services.case_finance_service import recalculate_case_financial_totals

        recalculate_case_financial_totals(case)
        log_finance_action(
            cabinet=cabinet,
            kind='finance_fee_deleted',
            message=f'Fee #{fee_id} deleted',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Fee',
            entity_id=fee_id,
            previous_value=previous,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        inv = get_object_or_404(
            Invoice.objects.select_related(
                'case', 'client__user', 'fee', 'created_by', 'cabinet'
            ).prefetch_related('items'),
            pk=pk,
        )
        if inv.case.cabinet_id != cab.id:
            return None
        return inv

    def get(self, request, pk):
        inv = self.get_object(request, pk)
        if inv is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceSerializer(inv).data)

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        inv = self.get_object(request, pk)
        if inv is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = InvoiceUpdateSerializer(
            inv, data=request.data, partial=partial, context={'request': request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        inv = (
            Invoice.objects.select_related('client__user', 'fee', 'created_by')
            .prefetch_related('items')
            .get(pk=inv.pk)
        )
        return Response(InvoiceSerializer(inv).data)

    def delete(self, request, pk):
        inv = self.get_object(request, pk)
        if inv is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if inv.status != Invoice.Status.DRAFT:
            return Response(
                {'detail': 'Only draft invoices can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        inv_id = inv.id
        number = inv.invoice_number
        cabinet = inv.cabinet
        inv.delete()
        log_finance_action(
            cabinet=cabinet,
            kind='finance_invoice_deleted',
            message=f'Invoice {number} deleted',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Invoice',
            entity_id=inv_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _invoice_pdf_http_response(inv: Invoice) -> HttpResponse:
    pdf_bytes = build_invoice_pdf(inv)
    safe_name = ''.join(c if c.isalnum() or c in '-_' else '_' for c in inv.invoice_number)
    filename = f'facture-{safe_name}.pdf'
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def _invoice_for_pdf(pk, **extra_filters):
    return get_object_or_404(
        Invoice.objects.select_related(
            'cabinet', 'case', 'client__user', 'fee'
        ).prefetch_related('items'),
        pk=pk,
        **extra_filters,
    )


class InvoicePdfView(APIView):
    """GET PDF binary for an invoice (same cabinet scope as finance invoice detail)."""

    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        inv = _invoice_for_pdf(pk)
        if inv.case.cabinet_id != cab.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return _invoice_pdf_http_response(inv)


class CaseInvoicePdfView(APIView):
    """GET PDF for an invoice scoped to a case (validates invoice belongs to case)."""

    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id, pk):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        inv = _invoice_for_pdf(pk, case=case)
        return _invoice_pdf_http_response(inv)


class InvoiceStatusPatchView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def patch(self, request, pk):
        from finance.serializers import InvoiceStatusPatchSerializer
        from finance.services.case_finance_service import sync_invoice_status_from_payments

        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        inv = get_object_or_404(
            Invoice.objects.select_related('case', 'cabinet').prefetch_related('items'),
            pk=pk,
        )
        if inv.case.cabinet_id != cab.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = InvoiceStatusPatchSerializer(
            data=request.data, context={'invoice': inv}
        )
        ser.is_valid(raise_exception=True)
        previous_status = inv.status
        new_status = ser.validated_data['status']
        inv.status = new_status
        inv.save(update_fields=['status', 'updated_at'])
        if new_status == Invoice.Status.SENT:
            sync_invoice_status_from_payments(inv)
            inv.refresh_from_db()
        elif new_status == Invoice.Status.CANCELLED:
            # Recalculate CA / case totals via signals on save already; ensure fee sync
            from finance.services.case_finance_service import (
                recalculate_case_financial_totals,
                recalculate_fee_amounts,
            )

            recalculate_case_financial_totals(inv.case)
            if inv.fee_id:
                recalculate_fee_amounts(inv.fee)
        log_finance_action(
            cabinet=inv.cabinet,
            kind='finance_invoice_status_changed',
            message=f'Invoice {inv.invoice_number} status {previous_status} → {inv.status}',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Invoice',
            entity_id=inv.id,
            previous_value={'status': previous_status},
            new_value={'status': inv.status},
        )
        inv = (
            Invoice.objects.select_related('client__user', 'fee', 'created_by')
            .prefetch_related('items')
            .get(pk=inv.pk)
        )
        return Response(InvoiceSerializer(inv).data)


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        pay = get_object_or_404(
            Payment.objects.select_related('case', 'invoice', 'client__user', 'created_by'),
            pk=pk,
        )
        if pay.case.cabinet_id != cab.id:
            return None
        return pay

    def get(self, request, pk):
        pay = self.get_object(request, pk)
        if pay is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentSerializer(pay).data)

    def patch(self, request, pk):
        """Cancel a payment (status=CANCELLED) and recalculate invoice/fee/case totals."""
        from finance.services.case_finance_service import (
            recalculate_case_financial_totals,
            recalculate_fee_amounts,
            sync_invoice_status_from_payments,
        )

        pay = self.get_object(request, pk)
        if pay is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        requested = (request.data or {}).get('status')
        if requested is not None and requested != Payment.Status.CANCELLED:
            return Response(
                {'detail': 'Only status=CANCELLED is supported on payment PATCH.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if pay.status == Payment.Status.CANCELLED:
            return Response(PaymentSerializer(pay).data)

        previous = {'status': pay.status, 'amount': float(pay.amount)}
        pay.status = Payment.Status.CANCELLED
        pay.save(update_fields=['status', 'updated_at'])

        if pay.invoice_id:
            sync_invoice_status_from_payments(pay.invoice)
            if pay.invoice.fee_id:
                recalculate_fee_amounts(pay.invoice.fee)
        recalculate_case_financial_totals(pay.case)

        log_finance_action(
            cabinet=pay.case.cabinet,
            kind='finance_payment_cancelled',
            message=f'Payment #{pay.id} cancelled ({pay.amount})',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Payment',
            entity_id=pay.id,
            previous_value=previous,
            new_value={'status': pay.status, 'amount': float(pay.amount)},
        )
        return Response(PaymentSerializer(pay).data)

    def delete(self, request, pk):
        from finance.services.case_finance_service import (
            recalculate_case_financial_totals,
            recalculate_fee_amounts,
            sync_invoice_status_from_payments,
        )

        pay = self.get_object(request, pk)
        if pay is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        pay_id = pay.id
        amount = float(pay.amount)
        case = pay.case
        cabinet = case.cabinet
        inv = pay.invoice
        fee = inv.fee if inv and inv.fee_id else None
        pay.delete()
        if inv:
            sync_invoice_status_from_payments(inv)
            if fee:
                recalculate_fee_amounts(fee)
        recalculate_case_financial_totals(case)
        log_finance_action(
            cabinet=cabinet,
            kind='finance_payment_deleted',
            message=f'Payment #{pay_id} deleted ({amount})',
            user=request.user if request.user.is_authenticated else None,
            entity_type='Payment',
            entity_id=pay_id,
            previous_value={'amount': amount},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
