from datetime import date

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.permissions import IsFinanceAuthorized
from finance.services.ca_tracking_service import build_tva_status_payload
from finance.services.dashboard_service import build_dashboard_payload


class FinanceTvaStatusView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(build_tva_status_payload(cab))


class FinanceDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        period = request.query_params.get('period', 'month')
        if period not in ('month', 'quarter', 'year'):
            period = 'month'
        try:
            year = int(request.query_params.get('year', date.today().year))
        except (TypeError, ValueError):
            year = date.today().year
        payload = build_dashboard_payload(cab, period, year)
        return Response(payload)
