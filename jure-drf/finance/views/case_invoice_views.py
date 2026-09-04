import logging

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.models import Invoice
from finance.permissions import IsFinanceAuthorized
from finance.serializers import (
    InvoiceCreateSerializer,
    InvoiceSerializer,
    InvoiceUpdateSerializer,
)
from finance.services.audit_service import log_finance_action
from finance.services.invoice_pdf import build_invoice_pdf
from finance.views.case_scope import _case_in_cabinet_or_404, _invoice_qs_for_case

logger = logging.getLogger(__name__)


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
