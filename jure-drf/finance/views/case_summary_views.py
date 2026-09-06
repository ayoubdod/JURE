from decimal import Decimal

from django.db.models import Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import Expense, Fee, Payment, TaxAdvance
from finance.permissions import IsFinanceAuthorized
from finance.serializers import (
    ExpenseSerializer,
    FeeSerializer,
    InvoiceSerializer,
    PaymentSerializer,
)
from finance.views.case_scope import (
    _case_in_cabinet_or_404,
    _invoice_qs_for_case,
    _remaining_status,
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
        invoices = _invoice_qs_for_case(case)
        payments = Payment.objects.filter(case=case).select_related(
            'client__user', 'invoice', 'created_by'
        )
        expenses = Expense.objects.filter(case=case).select_related('client', 'created_by')
        tax_advance = TaxAdvance.objects.filter(case=case).first()

        amount_expected = fees.aggregate(s=Sum('amount_expected'))['s'] or 0
        total_billed = case.total_billed
        total_paid = case.total_paid
        remaining = float(total_billed - total_paid) if total_billed or total_paid else 0.0
        total_expenses = expenses.aggregate(s=Sum('amount'))['s'] or 0

        ta_payload = None
        if tax_advance:
            ta_payload = {
                'amount': float(tax_advance.amount),
                'status': tax_advance.status,
                'paid_date': tax_advance.paid_date.isoformat() if tax_advance.paid_date else None,
                'paid_at': tax_advance.paid_date.isoformat() if tax_advance.paid_date else None,
            }

        planned = float(amount_expected)
        invoiced = float(total_billed)
        paid = float(total_paid)
        expenses_total = float(total_expenses)
        # Net cash position for the matter: collected − expenses (backend source of truth)
        net_position = float(
            (Decimal(str(total_paid)) - Decimal(str(total_expenses))).quantize(Decimal('0.01'))
        )

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
                    'amount_expected': planned,
                    'total_billed': invoiced,
                    'total_paid': paid,
                    'remaining': remaining,
                    'planned': planned,
                    'invoiced': invoiced,
                    'paid': paid,
                    'remaining_status': _remaining_status(case),
                    'total_expenses': expenses_total,
                    'expenses': expenses_total,
                    'outstanding': remaining,
                    'net_position': net_position,
                },
                'fees': FeeSerializer(fees, many=True).data,
                'invoices': InvoiceSerializer(invoices, many=True).data,
                'payments': PaymentSerializer(payments, many=True).data,
                'expenses': ExpenseSerializer(expenses, many=True).data,
                'tax_advance': ta_payload,
            }
        )
