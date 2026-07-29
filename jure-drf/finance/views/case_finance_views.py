import logging

from django.db.models import Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case
from core.utils import get_user_cabinet
from finance.models import Fee, Invoice, Payment, TaxAdvance
from finance.services.invoice_pdf import build_invoice_pdf
from finance.permissions import IsFinanceAuthorized
from finance.serializers import (
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
        invoices = Invoice.objects.filter(case=case).select_related('client__user', 'fee')
        payments = Payment.objects.filter(case=case).select_related('client__user', 'invoice')
        tax_advance = TaxAdvance.objects.filter(case=case).first()

        amount_expected = fees.aggregate(s=Sum('amount_expected'))['s'] or 0
        total_billed = case.total_billed
        total_paid = case.total_paid
        remaining = float(total_billed - total_paid) if total_billed or total_paid else 0.0

        ta_payload = None
        if tax_advance:
            ta_payload = {
                'amount': float(tax_advance.amount),
                'status': tax_advance.status,
                'paid_date': tax_advance.paid_date.isoformat() if tax_advance.paid_date else None,
            }

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
                    'amount_expected': float(amount_expected),
                    'total_billed': float(total_billed),
                    'total_paid': float(total_paid),
                    'remaining': remaining,
                },
                'fees': FeeSerializer(fees, many=True).data,
                'invoices': InvoiceSerializer(invoices, many=True).data,
                'payments': PaymentSerializer(payments, many=True).data,
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
        fee = Fee.objects.create(case=case, **ser.validated_data)
        return Response(FeeSerializer(fee).data, status=status.HTTP_201_CREATED)


class InvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request, case_id):
        case = _case_in_cabinet_or_404(request.user, case_id)
        if case is None:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Invoice.objects.filter(case=case).select_related('client__user', 'fee', 'created_by')
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
        inv.refresh_from_db()
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
        qs = Payment.objects.filter(case=case).select_related('client__user', 'invoice', 'created_by')
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
        ta.status = ser.validated_data['status']
        ta.paid_date = ser.validated_data['paid_date']
        ta.save(update_fields=['status', 'paid_date'])
        return Response(TaxAdvanceSerializer(ta).data)


class FeeDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        fee = get_object_or_404(Fee.objects.select_related('case', 'lawyer'), pk=pk)
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
        return Response(FeeSerializer(fee).data)

    def delete(self, request, pk):
        fee = self.get_object(request, pk)
        if fee is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        fee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        inv = get_object_or_404(
            Invoice.objects.select_related('case', 'client__user', 'fee'), pk=pk
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
        ser = InvoiceUpdateSerializer(inv, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        ser.save()
        inv.refresh_from_db()
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
        inv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _invoice_pdf_http_response(inv: Invoice) -> HttpResponse:
    pdf_bytes = build_invoice_pdf(inv)
    safe_name = ''.join(c if c.isalnum() or c in '-_' else '_' for c in inv.invoice_number)
    filename = f'facture-{safe_name}.pdf'
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


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
        inv = get_object_or_404(
            Invoice.objects.select_related('cabinet', 'case', 'client__user', 'fee'),
            pk=pk,
        )
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
        inv = get_object_or_404(
            Invoice.objects.select_related('cabinet', 'case', 'client__user', 'fee'),
            pk=pk,
            case=case,
        )
        return _invoice_pdf_http_response(inv)


class InvoiceStatusPatchView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def patch(self, request, pk):
        from finance.serializers import InvoiceStatusPatchSerializer

        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        inv = get_object_or_404(Invoice, pk=pk)
        if inv.case.cabinet_id != cab.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = InvoiceStatusPatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        inv.status = ser.validated_data['status']
        inv.save(update_fields=['status', 'updated_at'])
        return Response(InvoiceSerializer(inv).data)


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get_object(self, request, pk):
        cab = get_user_cabinet(request.user)
        if not cab:
            return None
        pay = get_object_or_404(Payment.objects.select_related('case', 'invoice'), pk=pk)
        if pay.case.cabinet_id != cab.id:
            return None
        return pay

    def get(self, request, pk):
        pay = self.get_object(request, pk)
        if pay is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentSerializer(pay).data)

    def delete(self, request, pk):
        pay = self.get_object(request, pk)
        if pay is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        inv_id = pay.invoice_id
        pay.delete()
        if inv_id:
            from finance.models import Invoice as Inv
            from finance.services.case_finance_service import (
                recalculate_fee_amounts,
                sync_invoice_status_from_payments,
            )

            inv = Inv.objects.filter(pk=inv_id).first()
            if inv:
                sync_invoice_status_from_payments(inv)
                if inv.fee_id:
                    recalculate_fee_amounts(inv.fee)
        return Response(status=status.HTTP_204_NO_CONTENT)
