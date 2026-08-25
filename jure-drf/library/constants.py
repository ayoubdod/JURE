from datetime import timedelta

from django.utils import timezone

from jurisdictions.constants import VisibilityScope

LAST_ADDED_DAYS = 7

# API-facing library scopes. Mapped from VisibilityScope, not a second database.
LIBRARY_SCOPE_PERSONAL = "PERSONAL"
LIBRARY_SCOPE_LOCAL = "LOCAL"
LIBRARY_SCOPE_INTERNATIONAL = "INTERNATIONAL"

VISIBILITY_TO_LIBRARY_SCOPE = {
    VisibilityScope.CABINET: LIBRARY_SCOPE_PERSONAL,
    VisibilityScope.JURISDICTION: LIBRARY_SCOPE_LOCAL,
    VisibilityScope.GLOBAL: LIBRARY_SCOPE_INTERNATIONAL,
}

LIBRARY_SCOPE_TO_VISIBILITY = {
    LIBRARY_SCOPE_PERSONAL: VisibilityScope.CABINET,
    LIBRARY_SCOPE_LOCAL: VisibilityScope.JURISDICTION,
    LIBRARY_SCOPE_INTERNATIONAL: VisibilityScope.GLOBAL,
}


def last_added_cutoff():
    return timezone.now() - timedelta(days=LAST_ADDED_DAYS)


def is_recent_timestamp(created) -> bool:
    if created is None:
        return False
    return created >= last_added_cutoff()


def days_since_added(created) -> int | None:
    if created is None:
        return None
    delta = timezone.now() - created
    return max(0, delta.days)


def days_remaining_as_new(created) -> int:
    if not is_recent_timestamp(created):
        return 0
    elapsed = days_since_added(created) or 0
    return max(0, LAST_ADDED_DAYS - elapsed)
