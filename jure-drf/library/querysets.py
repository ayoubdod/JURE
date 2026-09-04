"""Shared library tab querysets. Keep Juria lookup/connect aligned with /library/{tab}/."""

from __future__ import annotations

from django.db.models import Q, QuerySet

from jurisdictions.constants import VisibilityScope
from jurisdictions.scoping import documents_visible_to_cabinet_q

from .constants import (
    LIBRARY_SCOPE_INTERNATIONAL,
    LIBRARY_SCOPE_LOCAL,
    LIBRARY_SCOPE_PERSONAL,
)
from .models import Document, LibraryFavorite, LibrarySave

SCOPE_TO_TAB = {
    LIBRARY_SCOPE_PERSONAL: "my",
    LIBRARY_SCOPE_LOCAL: "local",
    LIBRARY_SCOPE_INTERNATIONAL: "international",
}


def library_tab_queryset(cabinet, tab: str, *, user=None) -> QuerySet:
    """Same rules as the Library hub tabs (my / local / international / favorites)."""
    if cabinet is None:
        return Document.objects.none()

    tab = (tab or "").strip().lower()
    if tab == "personal":
        tab = "my"

    base = Document.objects.all()
    if tab == "my":
        saved_ids = LibrarySave.objects.filter(cabinet=cabinet).values_list("document_id", flat=True)
        visible_shared = documents_visible_to_cabinet_q(cabinet)
        return base.filter(
            Q(visibility_scope=VisibilityScope.CABINET, cabinet=cabinet)
            | (Q(pk__in=saved_ids) & visible_shared)
        ).distinct()
    if tab == "local":
        jurisdiction_id = getattr(cabinet, "jurisdiction_id", None)
        if not jurisdiction_id:
            return base.none()
        return base.filter(
            visibility_scope=VisibilityScope.JURISDICTION,
            jurisdiction_id=jurisdiction_id,
        )
    if tab == "international":
        return base.filter(visibility_scope=VisibilityScope.GLOBAL)
    if tab == "favorites":
        if not user or not getattr(user, "is_authenticated", False):
            return base.none()
        return (
            base.filter(pk__in=LibraryFavorite.objects.filter(user=user).values("document_id"))
            .filter(documents_visible_to_cabinet_q(cabinet))
            .distinct()
        )
    return Document.objects.none()


def library_scope_queryset(cabinet, scopes: list[str] | None = None) -> QuerySet:
    """Documents in one or more Library hub tabs.

    ``scopes=None`` (or including ``ALL``) is My + Local + International.
    """
    tabs: list[str]
    if scopes is None:
        tabs = ["my", "local", "international"]
    else:
        wanted = {str(s).upper() for s in scopes if s}
        if not wanted or "ALL" in wanted:
            tabs = ["my", "local", "international"]
        else:
            tabs = [SCOPE_TO_TAB[s] for s in wanted if s in SCOPE_TO_TAB]
            if not tabs:
                return Document.objects.none()

    ids: set[int] = set()
    for tab in tabs:
        ids.update(library_tab_queryset(cabinet, tab).values_list("pk", flat=True))
    return Document.objects.filter(pk__in=ids)
