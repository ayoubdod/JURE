"""
TVA threshold crossing — one-time notice to OWNER/ADMIN.
"""
import logging

from django.db.models import Q

from finance.models.firm_settings import FirmFinanceSettings
from notifications.constants import NotificationPriority, NotificationType
from notifications.services.notification_service import create_bulk_notifications
from notifications.utils.urls import finance_action_url
from users.models import User

logger = logging.getLogger(__name__)


def dispatch_tva_threshold_notification(ca_data: dict, cabinet) -> None:
    """
    Notify all OWNER and ADMIN users of the cabinet when the lifetime CA
    threshold is crossed. Marks threshold_notification_sent on success.
    """
    if not cabinet:
        return

    fs = FirmFinanceSettings.objects.filter(cabinet=cabinet).first()
    if not fs or fs.threshold_notification_sent:
        return

    amount = ca_data.get('lifetime_ca')
    crossed_at = ca_data.get('tva_became_applicable_at')
    recipient_ids = list(
        User.objects.filter(
            Q(role__in=[User.Role.OWNER, User.Role.ADMIN])
            & (Q(cabinet=cabinet) | Q(owned_cabinet=cabinet))
        )
        .values_list("id", flat=True)
        .distinct()
    )

    title = "⚖️ Seuil TVA franchi — TVA obligatoire"
    message = (
        'Votre cabinet a franchi le seuil cumulé de 500 000 MAD de chiffre '
        "d'affaires. Conformément à l'article 89 du CGI Maroc, la TVA à 20% "
        'est désormais applicable de manière permanente sur toutes vos '
        f'nouvelles factures. CA cumulé atteint : {amount} MAD. '
        f"Date : {crossed_at}. Cette obligation est définitive."
    )

    try:
        create_bulk_notifications(
            recipient_ids,
            notification_type=NotificationType.TVA_THRESHOLD_CROSSED,
            title=title,
            message=message,
            priority=NotificationPriority.URGENT,
            action_url=finance_action_url(),
            send_email=True,
        )
    except Exception:
        logger.exception("dispatch_tva_threshold_notification failed")
        return

    logger.info(
        "finance.tva_threshold_notification sent to %s recipients",
        len(recipient_ids),
    )

    FirmFinanceSettings.objects.filter(pk=fs.pk).update(threshold_notification_sent=True)
