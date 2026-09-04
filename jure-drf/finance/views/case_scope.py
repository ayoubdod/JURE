from django.shortcuts import get_object_or_404

from cases.models import Case
from core.utils import get_user_cabinet
from finance.models import Invoice


def _case_in_cabinet_or_404(user, case_id):
    cab = get_user_cabinet(user)
    if not cab:
        return None
    return get_object_or_404(
        Case.objects.select_related('cabinet'),
        pk=case_id,
        cabinet=cab,
    )


def _remaining_status(case: Case) -> str:
    if case.financial_status == Case.FinancialStatus.PAID:
        return 'settled'
    if case.financial_status == Case.FinancialStatus.OVERDUE:
        return 'overdue'
    return 'due'


def _invoice_qs_for_case(case):
    return (
        Invoice.objects.filter(case=case)
        .select_related('client__user', 'fee', 'created_by')
        .prefetch_related('items')
    )
