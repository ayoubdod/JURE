from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.permissions import IsFinanceAuthorized
from finance.services.receivables_service import build_receivables_payload


class ReceivablesView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAuthorized]

    def get(self, request):
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response(
                {'detail': 'User is not attached to any cabinet.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(build_receivables_payload(cab))
