from django.contrib import admin

from finance.models import Fee, FirmFinanceSettings, Invoice, Payment, TaxAdvance


@admin.register(FirmFinanceSettings)
class FirmFinanceSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'cabinet',
        'lifetime_ca',
        'is_tva_applicable',
        'tva_became_applicable_at',
        'threshold_notification_sent',
    )
    raw_id_fields = ('cabinet',)


@admin.register(Fee)
class FeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'case', 'fee_type', 'amount_expected', 'status', 'created_at')
    list_filter = ('fee_type', 'status')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice_number', 'cabinet', 'case', 'amount_ttc', 'status', 'issued_date')
    list_filter = ('status', 'issued_date')
    search_fields = ('invoice_number',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'case', 'amount', 'payment_method', 'payment_date')
    list_filter = ('payment_method',)


@admin.register(TaxAdvance)
class TaxAdvanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'case', 'amount', 'status', 'paid_date')
