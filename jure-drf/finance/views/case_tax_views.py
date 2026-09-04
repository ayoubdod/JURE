from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import TaxAdvance
from finance.permissions import IsFinanceAuthorized
from finance.serializers import TaxAdvancePatchSerializer, TaxAdvanceSerializer
from finance.services.audit_service import log_finance_action
from finance.views.case_scope import _case_in_cabinet_or_404


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
