"""Cabinet OWNER / ADMIN recipients."""

from __future__ import annotations

from django.db.models import Q

from users.models import User


def owner_admin_user_ids_for_cabinet(cabinet) -> list[int]:
    if not cabinet:
        return []
    qs = User.objects.filter(
        Q(role__in=[User.Role.OWNER, User.Role.ADMIN])
        & (Q(cabinet=cabinet) | Q(owned_cabinet=cabinet))
    ).values_list("id", flat=True)
    return list(dict.fromkeys(qs))
