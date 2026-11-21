from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.shortcuts import redirect
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from unfold.decorators import action
from unfold.enums import ActionVariant
from unfold.forms import BaseDialogForm

from core.unfold_admin import JureModelAdmin, JureTabularInline

from .models import (
    AIUsageEvent,
    BankTransfer,
    CreditLedger,
    CreditTariff,
    CreditWallet,
    PaymentEvent,
    Plan,
    Subscription,
    SubscriptionInvoice,
)
from .services.bank_transfer import expected_total, record_bank_transfer
from .services.catalog import plan_price


class BankTransferDialogForm(BaseDialogForm):
    reference = forms.CharField(
        label=_("Transfer reference"),
        max_length=128,
        help_text=_("The reference printed on the bank advice. Each reference can be used once."),
    )
    amount = forms.DecimalField(
        label=_("Amount received (MAD, incl. VAT)"),
        min_value=0,
        decimal_places=2,
        max_digits=12,
    )
    received_on = forms.DateField(label=_("Received on"))
    plan = forms.ModelChoiceField(label=_("Plan"), queryset=Plan.objects.none())
    billing_cycle = forms.ChoiceField(label=_("Billing cycle"), choices=Subscription.BillingCycle.choices)
    credits = forms.IntegerField(
        label=_("JURIA credits"),
        required=False,
        min_value=1,
        help_text=_("Required only for a plan with no included allowance, such as Enterprise."),
    )
    note = forms.CharField(label=_("Note"), required=False, widget=forms.Textarea(attrs={"rows": 2}))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["plan"].queryset = Plan.objects.filter(is_active=True).order_by("display_order")
        self.fields["received_on"].initial = timezone.localdate()
        subscription = (
            Subscription.objects.select_related("plan").filter(pk=self.object_id).first()
            if self.object_id
            else None
        )
        if subscription is None:
            return
        self.fields["plan"].initial = subscription.plan_id
        self.fields["billing_cycle"].initial = subscription.billing_cycle
        total = expected_total(subscription.plan, subscription.billing_cycle)
        if total is not None:
            self.fields["amount"].initial = total
            self.fields["amount"].help_text = _("Catalogue total for the current plan: %(total)s MAD incl. VAT.") % {
                "total": total
            }
        else:
            self.fields["amount"].help_text = _("This plan has no catalogue price. Enter the amount agreed on the quotation.")

    def clean(self):
        cleaned = super().clean()
        plan = cleaned.get("plan")
        credits = cleaned.get("credits")
        if plan is not None and plan.monthly_juria_credits is None and not credits:
            self.add_error(
                "credits",
                _("This plan has no included allowance. Enter the JURIA credits purchased with this transfer."),
            )
        cycle = cleaned.get("billing_cycle")
        if plan is not None and cycle and plan_price(plan, cycle) is None and not cleaned.get("amount"):
            self.add_error("amount", _("Enter the amount received."))
        return cleaned


class SubscriptionInvoiceInline(JureTabularInline):
    model = SubscriptionInvoice
    extra = 0
    can_delete = False
    fields = ("number", "status", "total", "currency", "description", "paid_at")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class BankTransferInline(JureTabularInline):
    model = BankTransfer
    extra = 0
    can_delete = False
    fields = ("reference", "amount", "currency", "received_on", "recorded_by", "note", "created_at")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Plan)
class PlanAdmin(JureModelAdmin):
    list_display = ("code", "name", "monthly_price", "annual_price", "is_active", "is_self_serve", "display_order")
    list_filter = ("is_active", "is_self_serve")
    search_fields = ("code", "name")
    ordering = ("display_order",)


@admin.register(CreditTariff)
class CreditTariffAdmin(JureModelAdmin):
    list_display = ("operation", "credits", "is_active")


@admin.register(Subscription)
class SubscriptionAdmin(JureModelAdmin):
    list_display = (
        "cabinet",
        "owner_email",
        "plan",
        "billing_cycle",
        "status",
        "list_price",
        "trial_end",
        "current_period_end",
    )
    list_filter = ("status", "billing_cycle", "plan")
    search_fields = ("cabinet__trade_name", "cabinet__owner__email", "cabinet__owner__first_name", "cabinet__owner__last_name")
    list_select_related = ("cabinet", "cabinet__owner", "plan")
    raw_id_fields = ("cabinet", "plan", "pending_plan")
    readonly_fields = (
        "cabinet",
        "plan",
        "billing_cycle",
        "status",
        "list_price",
        "currency",
        "start_date",
        "current_period_start",
        "current_period_end",
        "trial_start",
        "trial_end",
        "cancel_at_period_end",
        "cancellation_date",
        "pending_plan",
        "pending_billing_cycle",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (None, {"fields": ("cabinet", "plan", "billing_cycle", "status", "list_price", "currency")}),
        (_("Period"), {"fields": ("trial_start", "trial_end", "start_date", "current_period_start", "current_period_end")}),
        (_("Scheduled changes"), {"fields": ("pending_plan", "pending_billing_cycle", "cancel_at_period_end", "cancellation_date")}),
        (_("Record"), {"fields": ("created_at", "updated_at")}),
    )
    inlines = (SubscriptionInvoiceInline, BankTransferInline)
    actions_detail = ["record_bank_transfer_action"]

    @admin.display(description=_("Owner"), ordering="cabinet__owner__email")
    def owner_email(self, obj):
        owner = getattr(obj.cabinet, "owner", None)
        return getattr(owner, "email", "")

    @action(
        description=_("Record bank transfer"),
        url_path="record-bank-transfer",
        icon="payments",
        variant=ActionVariant.SUCCESS,
        permissions=["change"],
        dialog={
            "title": _("Bank transfer received"),
            "description": _(
                "Use this after the virement appears on the JURE account. "
                "The subscription becomes active for one paid period, open invoices are marked paid, "
                "and the plan's JURIA credits replace the trial balance."
            ),
            "form_class": BankTransferDialogForm,
            "form_submit_text": _("Activate subscription"),
        },
    )
    def record_bank_transfer_action(self, request, form, object_id):
        subscription = self.get_object(request, object_id)
        if subscription is None:
            self.message_user(request, _("Subscription not found."), level=messages.ERROR)
            return redirect("admin:subscriptions_subscription_changelist")
        try:
            transfer = record_bank_transfer(
                subscription=subscription,
                reference=form.cleaned_data["reference"],
                amount=form.cleaned_data["amount"],
                received_on=form.cleaned_data["received_on"],
                note=form.cleaned_data.get("note") or "",
                recorded_by=request.user,
                plan=form.cleaned_data["plan"],
                billing_cycle=form.cleaned_data["billing_cycle"],
                credit_allowance=form.cleaned_data.get("credits"),
            )
        except ValidationError as exc:
            self.message_user(request, " ".join(exc.messages), level=messages.ERROR)
            return redirect("admin:subscriptions_subscription_change", subscription.pk)
        transfer.subscription.refresh_from_db()
        self.message_user(
            request,
            _("Subscription is active until %(end)s. Transfer %(reference)s recorded.")
            % {
                "end": timezone.localtime(transfer.subscription.current_period_end).strftime("%Y-%m-%d"),
                "reference": transfer.reference,
            },
            level=messages.SUCCESS,
        )
        return redirect("admin:subscriptions_subscription_change", subscription.pk)


@admin.register(CreditWallet)
class CreditWalletAdmin(JureModelAdmin):
    list_display = ("cabinet", "balance", "updated_at")
    raw_id_fields = ("cabinet",)
    readonly_fields = ("balance", "cabinet", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CreditLedger)
class CreditLedgerAdmin(JureModelAdmin):
    list_display = ("cabinet", "movement_type", "amount", "balance_before", "balance_after", "created_at")
    raw_id_fields = ("cabinet", "usage_event")
    readonly_fields = (
        "cabinet",
        "movement_type",
        "amount",
        "balance_before",
        "balance_after",
        "description",
        "usage_event",
        "idempotency_key",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AIUsageEvent)
class AIUsageEventAdmin(JureModelAdmin):
    list_display = ("cabinet", "operation", "credits", "outcome", "created_at")
    raw_id_fields = ("cabinet", "user")


@admin.register(SubscriptionInvoice)
class SubscriptionInvoiceAdmin(JureModelAdmin):
    list_display = ("number", "cabinet", "status", "total", "currency", "created_at")
    list_filter = ("status",)
    search_fields = ("number", "cabinet__trade_name")
    raw_id_fields = ("cabinet", "subscription")
    readonly_fields = (
        "cabinet",
        "subscription",
        "number",
        "status",
        "currency",
        "subtotal",
        "vat_rate",
        "vat_amount",
        "total",
        "description",
        "created_at",
        "paid_at",
    )

    def has_add_permission(self, request):
        return False


@admin.register(BankTransfer)
class BankTransferAdmin(JureModelAdmin):
    list_display = ("reference", "cabinet", "amount", "currency", "received_on", "recorded_by", "created_at")
    search_fields = ("reference", "cabinet__trade_name", "note")
    list_filter = ("currency",)
    raw_id_fields = ("subscription", "cabinet", "recorded_by")
    readonly_fields = (
        "subscription",
        "cabinet",
        "reference",
        "amount",
        "currency",
        "received_on",
        "note",
        "recorded_by",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentEvent)
class PaymentEventAdmin(JureModelAdmin):
    list_display = ("event_id", "event_type", "cabinet", "processed", "created_at")
    readonly_fields = ("event_id", "event_type", "cabinet", "processed", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
