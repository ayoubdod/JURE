"""Delete the cabinet's people with the cabinet, never the cabinet with a person."""

from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import Cabinet


@receiver(pre_delete, sender=Cabinet)
def delete_cabinet_owner(sender, instance, **kwargs):
    """Members and clients follow User.cabinet (CASCADE).

    The owner link points the other way, so an owner whose account is not
    also attached through User.cabinet would otherwise be left behind.
    """
    owner_id = instance.owner_id
    if not owner_id:
        return
    from users.models import User

    owner = User.objects.filter(pk=owner_id).only("id", "cabinet_id").first()
    if owner is None or owner.cabinet_id == instance.pk:
        return
    User.objects.filter(pk=owner_id).delete()
