"""
Lifetime cumulative CA for TVA threshold (Art. 89 CGI, Maroc).
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from finance.models import Invoice
from finance.models.firm_settings import FirmFinanceSettings


def _billable_statuses():
    return [
        Invoice.Status.SENT,
        Invoice.Status.PARTIALLY_PAID,
        Invoice.Status.PAID,
        Invoice.Status.OVERDUE,
    ]


def recalculate_lifetime_ca(cabinet) -> Decimal:
    """
    Sum of amount_ht for all time for invoices in this cabinet with
    billable (issued) statuses. HT base is used for the CGI threshold.
    """
    if not cabinet:
        return Decimal('0.00')
    total = (
        Invoice.objects.filter(
            cabinet=cabinet,
            status__in=_billable_statuses(),
        ).aggregate(total=Sum('amount_ht'))['total']
        or Decimal('0.00')
    )
    return total


def check_and_update_tva_threshold(cabinet) -> dict:
    """
    Recalculates lifetime CA and updates FirmFinanceSettings.
    Crossing event happens at most once per cabinet (permanent assujettissement).
    """
    if not cabinet:
        return {
            'lifetime_ca': Decimal('0.00'),
            'threshold': FirmFinanceSettings.TVA_THRESHOLD,
            'is_tva_applicable': False,
            'threshold_just_crossed': False,
            'ca_remaining': FirmFinanceSettings.TVA_THRESHOLD,
            'threshold_percentage': 0.0,
            'regime': 'EXONÉRÉ',
            'tva_became_applicable_at': None,
        }

    with transaction.atomic():
        settings = (
            FirmFinanceSettings.objects.select_for_update()
            .filter(cabinet=cabinet)
            .first()
        )
        if not settings:
            settings = FirmFinanceSettings.get_for_cabinet(cabinet)
            settings = FirmFinanceSettings.objects.select_for_update().get(pk=settings.pk)

        new_ca = recalculate_lifetime_ca(cabinet)

        if settings.is_tva_applicable:
            FirmFinanceSettings.objects.filter(pk=settings.pk).update(lifetime_ca=new_ca)
            pct = (
                float((new_ca / FirmFinanceSettings.TVA_THRESHOLD) * 100)
                if FirmFinanceSettings.TVA_THRESHOLD > 0
                else 100.0
            )
            return {
                'lifetime_ca': new_ca,
                'threshold': FirmFinanceSettings.TVA_THRESHOLD,
                'is_tva_applicable': True,
                'threshold_just_crossed': False,
                'ca_remaining': Decimal('0.00'),
                'threshold_percentage': round(pct, 2),
                'regime': 'ASSUJETTI À LA TVA',
                'tva_became_applicable_at': (
                    settings.tva_became_applicable_at.isoformat()
                    if settings.tva_became_applicable_at
                    else None
                ),
            }

        threshold_just_crossed = new_ca >= FirmFinanceSettings.TVA_THRESHOLD
        update_fields = {'lifetime_ca': new_ca}

        crossed_at = None
        if threshold_just_crossed:
            crossed_at = timezone.now()
            update_fields.update(
                {
                    'is_tva_applicable': True,
                    'tva_became_applicable_at': crossed_at,
                    'tva_threshold_crossed_amount': new_ca,
                    'threshold_notification_sent': False,
                }
            )

        FirmFinanceSettings.objects.filter(pk=settings.pk).update(**update_fields)

        ca_remaining = max(Decimal('0.00'), FirmFinanceSettings.TVA_THRESHOLD - new_ca)
        pct = (
            float((new_ca / FirmFinanceSettings.TVA_THRESHOLD) * 100)
            if FirmFinanceSettings.TVA_THRESHOLD > 0
            else 100.0
        )

        return {
            'lifetime_ca': new_ca,
            'threshold': FirmFinanceSettings.TVA_THRESHOLD,
            'is_tva_applicable': threshold_just_crossed,
            'threshold_just_crossed': threshold_just_crossed,
            'ca_remaining': ca_remaining if not threshold_just_crossed else Decimal('0.00'),
            'threshold_percentage': round(pct, 2),
            'regime': (
                'ASSUJETTI À LA TVA' if threshold_just_crossed else 'EXONÉRÉ'
            ),
            'tva_became_applicable_at': (
                crossed_at.isoformat() if crossed_at else None
            ),
        }


def build_tva_status_payload(cabinet) -> dict:
    """Structured block for dashboard and GET /finance/tva-status/."""
    from finance.services.tva_formatting import format_mad_string

    if not cabinet:
        return {
            'regime': 'EXONÉRÉ',
            'is_tva_applicable': False,
            'lifetime_ca': format_mad_string(Decimal('0')),
            'threshold': format_mad_string(FirmFinanceSettings.TVA_THRESHOLD),
            'ca_remaining': format_mad_string(FirmFinanceSettings.TVA_THRESHOLD),
            'threshold_percentage': 0.0,
            'tva_became_applicable_at': None,
            'tva_threshold_crossed_amount': None,
            'note': (
                'Le seuil de 500 000 MAD est cumulatif sur toute la durée '
                "d'activité du cabinet. (Art. 89, CGI Maroc)"
            ),
        }

    fs = FirmFinanceSettings.get_for_cabinet(cabinet)
    new_ca = recalculate_lifetime_ca(cabinet)
    if fs.lifetime_ca != new_ca:
        FirmFinanceSettings.objects.filter(pk=fs.pk).update(lifetime_ca=new_ca)
        fs.lifetime_ca = new_ca

    ca_rem = fs.ca_remaining_to_threshold
    pct = fs.threshold_percentage

    return {
        'regime': fs.regime_label,
        'is_tva_applicable': fs.is_tva_applicable,
        'lifetime_ca': format_mad_string(fs.lifetime_ca),
        'threshold': format_mad_string(FirmFinanceSettings.TVA_THRESHOLD),
        'ca_remaining': format_mad_string(ca_rem),
        'threshold_percentage': float(pct),
        'tva_became_applicable_at': (
            fs.tva_became_applicable_at.isoformat() if fs.tva_became_applicable_at else None
        ),
        'tva_threshold_crossed_amount': (
            format_mad_string(fs.tva_threshold_crossed_amount)
            if fs.tva_threshold_crossed_amount is not None
            else None
        ),
        'note': (
            'Le seuil de 500 000 MAD est cumulatif sur toute la durée '
            "d'activité du cabinet. (Art. 89, CGI Maroc)"
        ),
    }
