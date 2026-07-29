from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Client(models.Model):
    """
    Fiscal / invoicing profile for a cabinet client (User with is_cabinet_member=False).
    One row per client user for ICE/IF and B2B fields.
    """

    class ClientType(models.TextChoices):
        INDIVIDUAL = 'INDIVIDUAL', _('INDIVIDUAL')
        COMPANY = 'COMPANY', _('COMPANY')

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='firm_client_profile',
    )
    ice = models.CharField(max_length=15, blank=True, null=True)
    if_number = models.CharField(max_length=20, blank=True, null=True)
    client_type = models.CharField(
        max_length=20,
        choices=ClientType.choices,
        default=ClientType.INDIVIDUAL,
    )

    class Meta:
        db_table = 'clients_client'

    def __str__(self):
        return f'ClientProfile({self.user_id})'
