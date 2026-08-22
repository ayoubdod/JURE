from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from .constants import VisibilityScope


def validate_visibility_scope(
    *,
    visibility_scope: str,
    jurisdiction=None,
    cabinet=None,
    require_cabinet: bool = False,
) -> None:
    """Enforce GLOBAL/JURISDICTION/CABINET consistency. Used by models and serializers."""
    errors = {}
    if visibility_scope == VisibilityScope.GLOBAL:
        if jurisdiction is not None:
            errors["jurisdiction"] = _("Global content cannot be tied to a jurisdiction.")
    elif visibility_scope == VisibilityScope.JURISDICTION:
        if jurisdiction is None:
            errors["jurisdiction"] = _("Jurisdiction-specific content requires a jurisdiction.")
    elif visibility_scope == VisibilityScope.CABINET:
        if require_cabinet and cabinet is None:
            errors["cabinet"] = _("Cabinet content must belong to a cabinet.")
    else:
        errors["visibility_scope"] = _("Invalid visibility scope.")
    if errors:
        raise ValidationError(errors)


def documents_visible_to_cabinet_q(cabinet):
    """Library rows a cabinet may see: GLOBAL + its jurisdiction + its private docs."""
    if cabinet is None:
        return Q(pk__in=[])
    q = Q(visibility_scope=VisibilityScope.GLOBAL)
    jurisdiction_id = getattr(cabinet, "jurisdiction_id", None)
    if jurisdiction_id:
        q |= Q(
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction_id=jurisdiction_id,
        )
    q |= Q(visibility_scope=VisibilityScope.CABINET, cabinet=cabinet)
    return q


def announcements_visible_to_cabinet_q(cabinet):
    """Announcements a cabinet may see: GLOBAL + its jurisdiction + cabinet-targeted."""
    if cabinet is None:
        return Q(pk__in=[])
    q = Q(visibility_scope=VisibilityScope.GLOBAL)
    jurisdiction_id = getattr(cabinet, "jurisdiction_id", None)
    if jurisdiction_id:
        q |= Q(
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction_id=jurisdiction_id,
        )
    q |= Q(visibility_scope=VisibilityScope.CABINET, target_cabinets=cabinet)
    return q


def serialize_jurisdiction(jurisdiction) -> dict | None:
    if jurisdiction is None:
        return None
    return {
        "id": jurisdiction.id,
        "code": jurisdiction.code,
        "name": jurisdiction.name,
        "country_code": jurisdiction.country_code,
        "legal_system": jurisdiction.legal_system,
        "default_language": jurisdiction.default_language,
        "status": jurisdiction.status,
    }
