from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Plan(models.Model):
    code = models.SlugField(max_length=32, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    monthly_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="MAD")
    maximum_users = models.PositiveIntegerField(null=True, blank=True)
    storage_bytes = models.BigIntegerField(null=True, blank=True)
    monthly_juria_credits = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True)
    is_self_serve = models.BooleanField(default=True)
    is_recommended = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    feature_entitlements = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "code"]

    def __str__(self) -> str:
        return self.name


class CreditTariff(models.Model):
    """Credits charged for one JURIA operation. Editable without a deploy."""

    operation = models.SlugField(max_length=64, unique=True)
    credits = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.operation}={self.credits}"


class Subscription(models.Model):
    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", _("Monthly")
        ANNUAL = "annual", _("Annual")

    class Status(models.TextChoices):
        PENDING_VERIFICATION = "PENDING_VERIFICATION", _("Pending verification")
        TRIALING = "TRIALING", _("Trialing")
        PENDING_PAYMENT = "PENDING_PAYMENT", _("Pending payment")
        ACTIVE = "ACTIVE", _("Active")
        PAST_DUE = "PAST_DUE", _("Past due")
        CANCELLED = "CANCELLED", _("Cancelled")
        EXPIRED = "EXPIRED", _("Expired")

    WRITE_ALLOWED = {
        Status.PENDING_VERIFICATION,
        Status.TRIALING,
        Status.ACTIVE,
    }

    cabinet = models.OneToOneField(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    billing_cycle = models.CharField(max_length=16, choices=BillingCycle.choices)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING_VERIFICATION)
    list_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="MAD")
    start_date = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    cancellation_date = models.DateTimeField(null=True, blank=True)
    pending_plan = models.ForeignKey(
        Plan,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pending_subscriptions",
    )
    pending_billing_cycle = models.CharField(max_length=16, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Subscription")
        verbose_name_plural = _("Subscriptions")
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["trial_end"]),
        ]

    def __str__(self) -> str:
        return f"{self.cabinet_id}:{self.plan_id}:{self.status}"


class CreditWallet(models.Model):
    cabinet = models.OneToOneField(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="credit_wallet",
    )
    balance = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"wallet:{self.cabinet_id}:{self.balance}"


class AIUsageEvent(models.Model):
    class Outcome(models.TextChoices):
        RESERVED = "RESERVED", "RESERVED"
        COMMITTED = "COMMITTED", "COMMITTED"
        RELEASED = "RELEASED", "RELEASED"

    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.CASCADE, related_name="ai_usage_events")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_usage_events",
    )
    operation = models.CharField(max_length=64)
    credits = models.PositiveIntegerField()
    model_name = models.CharField(max_length=120, blank=True)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    outcome = models.CharField(max_length=16, choices=Outcome.choices, default=Outcome.RESERVED)
    idempotency_key = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cabinet", "idempotency_key"],
                name="uniq_ai_usage_idempotency",
            ),
        ]
        indexes = [
            models.Index(fields=["cabinet", "created_at"]),
        ]


class CreditLedger(models.Model):
    class Movement(models.TextChoices):
        TRIAL_GRANT = "TRIAL_GRANT", _("Trial grant")
        INCLUDED_GRANT = "INCLUDED_GRANT", _("Included grant")
        PURCHASE_GRANT = "PURCHASE_GRANT", _("Purchased credits")
        DEDUCTION = "DEDUCTION", _("Deduction")
        RELEASE = "RELEASE", _("Release")
        EXPIRY = "EXPIRY", _("Expiry")
        ADJUSTMENT = "ADJUSTMENT", _("Adjustment")

    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.CASCADE, related_name="credit_ledger")
    movement_type = models.CharField(max_length=32, choices=Movement.choices)
    amount = models.PositiveIntegerField()
    balance_before = models.PositiveIntegerField()
    balance_after = models.PositiveIntegerField()
    description = models.CharField(max_length=255, blank=True)
    usage_event = models.ForeignKey(
        AIUsageEvent,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ledger_entries",
    )
    idempotency_key = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cabinet", "idempotency_key"],
                name="uniq_credit_ledger_idempotency",
            ),
        ]
        indexes = [
            models.Index(fields=["cabinet", "created_at"]),
        ]


class SubscriptionInvoice(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", _("Open")
        PAID = "PAID", _("Paid")
        VOID = "VOID", _("Void")

    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.CASCADE, related_name="subscription_invoices")
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="invoices")
    number = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    currency = models.CharField(max_length=3, default="MAD")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)


class BankTransfer(models.Model):
    """A virement recorded by staff. This is the source of truth until a payment provider exists."""

    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name="bank_transfers")
    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.PROTECT,
        related_name="bank_transfers",
    )
    reference = models.CharField(_("transfer reference"), max_length=128, unique=True)
    amount = models.DecimalField(_("amount received"), max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="MAD")
    received_on = models.DateField(_("received on"))
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recorded_bank_transfers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_on", "-id"]
        verbose_name = _("Bank transfer")
        verbose_name_plural = _("Bank transfers")

    def __str__(self) -> str:
        return self.reference


class StoragePackage(models.Model):
    """Extra cabinet storage. A row with no price cannot be purchased."""

    class BillingType(models.TextChoices):
        ONE_TIME = "one_time", _("One-time")
        RECURRING = "recurring", _("Recurring")

    code = models.SlugField(max_length=32, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    capacity_bytes = models.BigIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="MAD")
    billing_type = models.CharField(max_length=16, choices=BillingType.choices, default=BillingType.ONE_TIME)
    billing_interval = models.CharField(max_length=16, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "code"]

    def __str__(self) -> str:
        return self.name

    @property
    def is_purchasable(self) -> bool:
        return bool(self.is_active and self.billing_type == self.BillingType.ONE_TIME and self.price and self.price > 0)


class CreditPackage(models.Model):
    """Extra JURIA credits. Price and validity are staff-editable."""

    code = models.SlugField(max_length=32, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    credits = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="MAD")
    validity_days = models.PositiveIntegerField(default=90)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "code"]

    def __str__(self) -> str:
        return self.name

    @property
    def is_purchasable(self) -> bool:
        return bool(self.is_active and self.price and self.price > 0 and self.credits > 0)


class AddonPurchase(models.Model):
    """A storage or credit package requested by a cabinet. Inactive until staff verify the transfer."""

    class Kind(models.TextChoices):
        STORAGE = "storage", _("Storage")
        CREDITS = "credits", _("JURIA credits")

    class Status(models.TextChoices):
        PENDING_VERIFICATION = "PENDING_VERIFICATION", _("Pending verification")
        PAID = "PAID", _("Paid")
        FAILED = "FAILED", _("Failed")
        CANCELLED = "CANCELLED", _("Cancelled")

    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.PROTECT, related_name="addon_purchases")
    subscription = models.ForeignKey(
        Subscription,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="addon_purchases",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    storage_package = models.ForeignKey(
        StoragePackage, null=True, blank=True, on_delete=models.PROTECT, related_name="purchases"
    )
    credit_package = models.ForeignKey(
        CreditPackage, null=True, blank=True, on_delete=models.PROTECT, related_name="purchases"
    )
    package_code = models.CharField(max_length=32)
    package_name = models.CharField(max_length=80)
    capacity_bytes = models.BigIntegerField(null=True, blank=True)
    credits = models.PositiveIntegerField(null=True, blank=True)
    validity_days = models.PositiveIntegerField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="MAD")
    payment_reference = models.CharField(max_length=64, unique=True)
    bank_reference = models.CharField(max_length=128, unique=True, null=True, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING_VERIFICATION)
    note = models.TextField(blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_addon_purchases",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["cabinet", "status"])]

    def __str__(self) -> str:
        return self.payment_reference


class StorageEntitlement(models.Model):
    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.PROTECT, related_name="storage_entitlements")
    purchase = models.OneToOneField(AddonPurchase, on_delete=models.PROTECT, related_name="storage_entitlement")
    capacity_bytes = models.BigIntegerField()
    activated_at = models.DateTimeField()

    def __str__(self) -> str:
        return f"{self.cabinet_id}:{self.capacity_bytes}"


class CreditLot(models.Model):
    """Purchased JURIA credits. Monthly and trial credits stay in the wallet balance."""

    cabinet = models.ForeignKey("cabinets.Cabinet", on_delete=models.CASCADE, related_name="credit_lots")
    purchase = models.OneToOneField(AddonPurchase, on_delete=models.PROTECT, related_name="credit_lot")
    issued = models.PositiveIntegerField()
    remaining = models.PositiveIntegerField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["cabinet", "expires_at"])]

    def __str__(self) -> str:
        return f"{self.cabinet_id}:{self.remaining}"


class PaymentEvent(models.Model):
    """Idempotent record of a verified provider notification. Not a frontend callback."""

    event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64)
    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payment_events",
    )
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
