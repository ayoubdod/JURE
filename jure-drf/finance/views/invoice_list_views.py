from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.models import Invoice, Payment
from finance.permissions import IsFinanceAuthorized
from finance.serializers.list_serializers import (
    FirmInvoiceListSerializer,
    FirmPaymentListSerializer,
)
from finance.views.pagination import FinanceListPagination


def _parse_date(s):
    if not s:
        return None
    from datetime import datetime

    try:
        return datetime.strptime(str(s)[:10], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def _first_param(request, *names):
    for name in names:
        val = request.query_params.get(name)
        if val is not None and str(val).strip() != '':
            return val
    return None


class FirmInvoiceListView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]
    pagination_class = FinanceListPagination

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            Invoice.objects.filter(case__cabinet=cab)
            .select_related('case', 'client__user', 'fee', 'created_by')
            .prefetch_related('items')
            .order_by('-issued_date', '-id')
        )
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)

        client_id = _first_param(request, 'client_id', 'clientId')
        client_q = _first_param(request, 'client', 'search')
        if client_id and str(client_id).isdigit():
            qs = qs.filter(client_id=int(client_id))
        elif client_q:
            qs = qs.filter(
                Q(client__user__first_name__icontains=client_q)
                | Q(client__user__last_name__icontains=client_q)
                | Q(client__user__email__icontains=client_q)
                | Q(invoice_number__icontains=client_q)
                | Q(case__reference__icontains=client_q)
            )

        df = _parse_date(_first_param(request, 'date_from', 'dateFrom', 'from'))
        dt = _parse_date(_first_param(request, 'date_to', 'dateTo', 'to'))
        if df:
            qs = qs.filter(issued_date__gte=df)
        if dt:
            qs = qs.filter(issued_date__lte=dt)

        paginator = FinanceListPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            ser = FirmInvoiceListSerializer(page, many=True)
            return paginator.get_paginated_response(ser.data)
        return Response(FirmInvoiceListSerializer(qs, many=True).data)


class FirmPaymentListView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]
    pagination_class = FinanceListPagination

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            Payment.objects.filter(case__cabinet=cab)
            .select_related('case', 'client__user', 'invoice', 'created_by')
            .order_by('-payment_date', '-id')
        )
        # Exclude cancelled from default firm list unless explicitly requested
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            if hasattr(Payment, 'Status'):
                qs = qs.exclude(status=Payment.Status.CANCELLED)

        pm = _first_param(request, 'payment_method', 'method')
        if pm:
            qs = qs.filter(payment_method=pm)

        client_id = _first_param(request, 'client_id', 'clientId')
        client_q = _first_param(request, 'client', 'search')
        if client_id and str(client_id).isdigit():
            qs = qs.filter(client_id=int(client_id))
        elif client_q:
            qs = qs.filter(
                Q(client__user__first_name__icontains=client_q)
                | Q(client__user__last_name__icontains=client_q)
                | Q(client__user__email__icontains=client_q)
                | Q(reference__icontains=client_q)
                | Q(case__reference__icontains=client_q)
                | Q(invoice__invoice_number__icontains=client_q)
            )

        df = _parse_date(_first_param(request, 'date_from', 'dateFrom', 'from'))
        dt = _parse_date(_first_param(request, 'date_to', 'dateTo', 'to'))
        if df:
            qs = qs.filter(payment_date__gte=df)
        if dt:
            qs = qs.filter(payment_date__lte=dt)

        paginator = FinanceListPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            ser = FirmPaymentListSerializer(page, many=True)
            return paginator.get_paginated_response(ser.data)
        return Response(FirmPaymentListSerializer(qs, many=True).data)
