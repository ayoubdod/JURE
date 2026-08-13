from decimal import Decimal

from django.db import models
from django.utils.translation import gettext_lazy as _


class FirmFinanceSettings(models.Model):
    """
    One row per cabinet (firm). Tracks lifetime cumulative CA for TVA threshold
    under Moroccan fiscal law (Art. 89 CGI).

    The 500,000 MAD threshold is LIFETIME CUMULATIVE.
    Once crossed: TVA applies permanently. No annual reset.
    """

    TVA_THRESHOLD = Decimal('500000.00')
    DEFAULT_TAX_ADVANCE = Decimal('100.00')

    cabinet = models.OneToOneField(
        'cabinets.Cabinet',
        on_delete=models.CASCADE,
        related_name='finance_settings',
    )

    tax_advance_default_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('100.00'),
        help_text='Default fiscal advance (acompte) amount per new matter.',
    )

    default_currency = models.CharField(max_length=3, default='MAD')

    lifetime_ca = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )

    is_tva_applicable = models.BooleanField(default=False)

    tva_became_applicable_at = models.DateTimeField(null=True, blank=True)

    tva_threshold_crossed_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )

    threshold_notification_sent = models.BooleanField(default=False)

    firm_created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Firm Finance Settings')

    @classmethod
    def get_for_cabinet(cls, cabinet):
        """Return settings for this firm; creates row on first access."""
        if cabinet is None:
            return None
        instance, _ = cls.objects.get_or_create(cabinet=cabinet)
        return instance

    @property
    def ca_remaining_to_threshold(self):
        if self.is_tva_applicable:
            return Decimal('0.00')
        remaining = self.TVA_THRESHOLD - self.lifetime_ca
        return max(Decimal('0.00'), remaining)

    @property
    def threshold_percentage(self):
        if self.TVA_THRESHOLD == 0:
            return 100.0
        pct = float((self.lifetime_ca / self.TVA_THRESHOLD) * 100)
        return round(pct, 2)

    @property
    def regime_label(self):
        if self.is_tva_applicable:
            return 'ASSUJETTI À LA TVA'
        return 'EXONÉRÉ'
