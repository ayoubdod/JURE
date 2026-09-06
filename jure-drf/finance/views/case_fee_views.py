from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.models import Fee, Invoice
from finance.permissions import IsFinanceAuthorized
from finance.serializers import FeeSerializer, FeeWriteSerializer
from finance.services.audit_service import log_finance_action
from finance.views.case_scope import _case_in_cabinet_or_404


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
