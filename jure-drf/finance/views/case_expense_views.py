from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import get_user_cabinet
from finance.models import Expense
from finance.permissions import IsFinanceAuthorized
from finance.serializers import ExpenseSerializer, ExpenseWriteSerializer
from finance.services.audit_service import log_finance_action
from finance.views.case_scope import _case_in_cabinet_or_404


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
