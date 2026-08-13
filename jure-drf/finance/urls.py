from django.urls import path

from finance.views.case_finance_views import (
    CaseFinanceSummaryView,
    ExpenseDetailView,
    FeeDetailView,
    FeeListCreateView,
    InvoiceDetailView,
    InvoiceListCreateView,
    InvoicePdfView,
    InvoiceStatusPatchView,
    PaymentDetailView,
    PaymentListCreateView,
    TaxAdvanceCaseView,
)
from finance.views.dashboard_views import FinanceDashboardView, FinanceTvaStatusView
from finance.views.invoice_list_views import FirmInvoiceListView, FirmPaymentListView
from finance.views.receivables_views import ReceivablesView

urlpatterns = [
    path('dashboard/', FinanceDashboardView.as_view(), name='finance-dashboard'),
    path('tva-status/', FinanceTvaStatusView.as_view(), name='finance-tva-status'),
    path('receivables/', ReceivablesView.as_view(), name='finance-receivables'),
    path('invoices/', FirmInvoiceListView.as_view(), name='finance-firm-invoices'),
    path('payments/', FirmPaymentListView.as_view(), name='finance-firm-payments'),
    path('fees/<int:pk>/', FeeDetailView.as_view(), name='finance-fee-detail'),
    path('expenses/<int:pk>/', ExpenseDetailView.as_view(), name='finance-expense-detail'),
    path('invoices/<int:pk>/pdf/', InvoicePdfView.as_view(), name='finance-invoice-pdf'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='finance-invoice-detail'),
    path('invoices/<int:pk>/status/', InvoiceStatusPatchView.as_view(), name='finance-invoice-status'),
    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='finance-payment-detail'),
]
