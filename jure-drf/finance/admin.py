from django.contrib import admin
from unfold.admin import ModelAdmin

from finance.models import Expense, Fee, FirmFinanceSettings, Invoice, InvoiceItem, Payment, TaxAdvance


@admin.register(FirmFinanceSettings)
class FirmFinanceSettingsAdmin(ModelAdmin):
    list_display = (
        "cabinet",
        "lifetime_ca",
        "is_tva_applicable",
        "tva_became_applicable_at",
        "threshold_notification_sent",
    )
    raw_id_fields = ("cabinet",)


@admin.register(Fee)
class FeeAdmin(ModelAdmin):
    list_display = ("id", "case", "fee_type", "amount_expected", "status", "created_at")
    list_filter = ("fee_type", "status")


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    raw_id_fields = ("fee", "expense")


@admin.register(Invoice)
class InvoiceAdmin(ModelAdmin):
    list_display = (
        "id",
        "invoice_number",
        "cabinet",
        "case",
        "amount_ttc",
        "status",
        "issued_date",
    )
    list_filter = ("status", "issued_date")
    search_fields = ("invoice_number",)
    inlines = [InvoiceItemInline]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(ModelAdmin):
    list_display = ("id", "invoice", "description", "quantity", "unit_price", "amount")
    raw_id_fields = ("invoice", "fee", "expense")


@admin.register(Expense)
class ExpenseAdmin(ModelAdmin):
    list_display = (
        "id",
        "cabinet",
        "case",
        "description",
        "category",
        "amount",
        "expense_date",
        "billable",
    )
    list_filter = ("category", "billable", "reimbursable")
    search_fields = ("description", "receipt_reference")
    raw_id_fields = ("cabinet", "case", "client", "created_by")


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = ("id", "case", "amount", "payment_method", "status", "payment_date")
    list_filter = ("payment_method", "status")


@admin.register(TaxAdvance)
class TaxAdvanceAdmin(ModelAdmin):
    list_display = ("id", "case", "amount", "status", "paid_date")
