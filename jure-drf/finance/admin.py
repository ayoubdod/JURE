from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin, JureTabularInline
from finance.models import Expense, Fee, FirmFinanceSettings, Invoice, InvoiceItem, Payment, TaxAdvance


@admin.register(FirmFinanceSettings)
class FirmFinanceSettingsAdmin(JureModelAdmin):
    list_display = (
        "cabinet",
        "lifetime_ca",
        "is_tva_applicable",
        "tva_became_applicable_at",
        "threshold_notification_sent",
    )
    raw_id_fields = ("cabinet",)


@admin.register(Fee)
class FeeAdmin(JureModelAdmin):
    list_display = ("id", "case", "fee_type", "amount_expected", "status_badge", "created_at")
    list_filter = ("fee_type", "status")
    search_fields = ("description", "case__reference")

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())


class InvoiceItemInline(JureTabularInline):
    model = InvoiceItem
    extra = 0
    raw_id_fields = ("fee", "expense")


@admin.register(Invoice)
class InvoiceAdmin(JureModelAdmin):
    list_display = (
        "invoice_number",
        "cabinet",
        "case",
        "amount_ttc",
        "status_badge",
        "issued_date",
    )
    list_filter = ("status", "issued_date")
    search_fields = ("invoice_number",)
    inlines = [InvoiceItemInline]
    list_select_related = ("cabinet", "case")

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())


@admin.register(InvoiceItem)
class InvoiceItemAdmin(JureModelAdmin):
    list_display = ("id", "invoice", "description", "quantity", "unit_price", "amount")
    raw_id_fields = ("invoice", "fee", "expense")


@admin.register(Expense)
class ExpenseAdmin(JureModelAdmin):
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
class PaymentAdmin(JureModelAdmin):
    list_display = ("id", "case", "amount", "payment_method", "status_badge", "payment_date")
    list_filter = ("payment_method", "status")
    search_fields = ("reference", "case__reference")

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())


@admin.register(TaxAdvance)
class TaxAdvanceAdmin(JureModelAdmin):
    list_display = ("id", "case", "amount", "status_badge", "paid_date")

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())
