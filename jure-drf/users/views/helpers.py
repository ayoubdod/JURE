from core.utils import get_user_cabinet

from ..models import User


def _user_shares_cabinet(request_user: User, target: User) -> bool:
    cab = get_user_cabinet(request_user)
    if not cab:
        return False
    if target.cabinet_id == cab.id:
        return True
    owned = getattr(target, "owned_cabinet", None)
    return bool(owned and owned.id == cab.id)

