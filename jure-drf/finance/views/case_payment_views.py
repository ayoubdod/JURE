from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.models import Payment
from finance.permissions import IsFinanceAuthorized
from finance.serializers import PaymentCreateSerializer, PaymentSerializer
from finance.services.audit_service import log_finance_action
from finance.views.case_scope import _case_in_cabinet_or_404


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
