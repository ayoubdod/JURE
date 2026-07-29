from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.models import Invoice, Payment
from finance.permissions import IsFinanceAuthorized
from finance.serializers import InvoiceSerializer, PaymentSerializer
from finance.views.pagination import FinanceListPagination


def _parse_date(s):
    if not s:
        return None
    from datetime import datetime

    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except (TypeError, ValueError):
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
            .order_by('-issued_date', '-id')
        )
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        client_id = request.query_params.get('client_id')
        if client_id:
            qs = qs.filter(client_id=client_id)
        df = _parse_date(request.query_params.get('dateFrom'))
        dt = _parse_date(request.query_params.get('dateTo'))
        if df:
            qs = qs.filter(issued_date__gte=df)
        if dt:
            qs = qs.filter(issued_date__lte=dt)

        paginator = FinanceListPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            ser = InvoiceSerializer(page, many=True)
            return paginator.get_paginated_response(ser.data)
        return Response(InvoiceSerializer(qs, many=True).data)


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
        pm = request.query_params.get('payment_method')
        if pm:
            qs = qs.filter(payment_method=pm)
        client_id = request.query_params.get('client_id')
        if client_id:
            qs = qs.filter(client_id=client_id)
        df = _parse_date(request.query_params.get('dateFrom'))
        dt = _parse_date(request.query_params.get('dateTo'))
        if df:
            qs = qs.filter(payment_date__gte=df)
        if dt:
            qs = qs.filter(payment_date__lte=dt)

        paginator = FinanceListPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            ser = PaymentSerializer(page, many=True)
            return paginator.get_paginated_response(ser.data)
        return Response(PaymentSerializer(qs, many=True).data)
