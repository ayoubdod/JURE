from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Invoice(models.Model):
    """
    Formal invoice for a case. TVA per firm regime (Art. 89 CGI, Maroc).
    Currency is snapshotted from FirmFinanceSettings at creation.
    """

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('DRAFT')
        SENT = 'SENT', _('SENT')
        PARTIALLY_PAID = 'PARTIALLY_PAID', _('PARTIALLY_PAID')
        PAID = 'PAID', _('PAID')
        OVERDUE = 'OVERDUE', _('OVERDUE')
        CANCELLED = 'CANCELLED', _('CANCELLED')

    cabinet = models.ForeignKey(
        'cabinets.Cabinet',
        on_delete=models.PROTECT,
        related_name='finance_invoices',
    )
    invoice_number = models.CharField(max_length=32, db_index=True)
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.PROTECT,
        related_name='invoices',
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        related_name='invoices',
    )
    fee = models.ForeignKey(
        'finance.Fee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
    )
    amount_ht = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='MAD')
    tva_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    tva_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_ttc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tva_applicable = models.BooleanField(
        default=False,
        help_text='Snapshot at creation time — never mutated after insert.',
    )
    tva_exoneration_note = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    issued_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['cabinet', 'invoice_number'],
                name='finance_invoice_cabinet_invoice_number_uniq',
            ),
        ]

    def _jurisdiction_code(self) -> str:
        cab = getattr(self, 'cabinet', None)
        if cab is None and self.cabinet_id:
            from cabinets.models import Cabinet

            cab = Cabinet.objects.select_related('jurisdiction').filter(pk=self.cabinet_id).first()
        jur = getattr(cab, 'jurisdiction', None) if cab is not None else None
        return (getattr(jur, 'code', None) or '').upper()

    def save(self, *args, **kwargs):
        def _dec(value):
            if value is None:
                return Decimal('0')
            if isinstance(value, Decimal):
                return value
            return Decimal(str(value))

        jur_code = self._jurisdiction_code() if self.cabinet_id else ''

        if self._state.adding and self.cabinet_id:
            from finance.models.firm_settings import FirmFinanceSettings

            fs = FirmFinanceSettings.get_for_cabinet(self.cabinet)
            if fs:
                self.tva_applicable = fs.is_tva_applicable
                if not (self.currency or '').strip():
                    self.currency = (fs.default_currency or 'MAD')[:3]
            if not (self.currency or '').strip():
                self.currency = 'MAD'

        # Qatar: no Moroccan 20% TVA default — keep rate at 0.
        apply_tva = bool(self.tva_applicable) and jur_code != 'QA'
        default_rate = Decimal('0.00') if jur_code == 'QA' else Decimal('20.00')

        if not apply_tva:
            self.tva_rate = Decimal('0.00')
            self.tva_amount = Decimal('0.00')
            ht = _dec(self.amount_ht)
            self.amount_ttc = ht.quantize(Decimal('0.01'))
            if jur_code == 'QA':
                self.tva_exoneration_note = ''
            else:
                self.tva_exoneration_note = (
                    'Exonéré de TVA — CA cumulé inférieur à 500 000 MAD '
                    '(Art. 89 CGI Maroc)'
                )
        else:
            self.tva_rate = default_rate
            ht = _dec(self.amount_ht)
            rate_factor = default_rate / Decimal('100')
            self.tva_amount = (ht * rate_factor).quantize(Decimal('0.01'))
            self.amount_ttc = (ht + self.tva_amount).quantize(Decimal('0.01'))
            self.tva_exoneration_note = ''

        super().save(*args, **kwargs)
