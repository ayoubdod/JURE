from django.urls import path

from finance.views.case_finance_views import (
    CaseFinanceSummaryView,
    CaseInvoicePdfView,
    FeeListCreateView,
    InvoiceListCreateView,
    PaymentListCreateView,
    TaxAdvanceCaseView,
)

urlpatterns = [
    path('finance/', CaseFinanceSummaryView.as_view(), name='case-finance-summary'),
    path('fees/', FeeListCreateView.as_view(), name='case-fees'),
    path('invoices/', InvoiceListCreateView.as_view(), name='case-invoices'),
    path(
        'invoices/<int:pk>/pdf/',
        CaseInvoicePdfView.as_view(),
        name='case-invoice-pdf',
    ),
    path('payments/', PaymentListCreateView.as_view(), name='case-payments'),
    path('tax-advance/', TaxAdvanceCaseView.as_view(), name='case-tax-advance'),
]
