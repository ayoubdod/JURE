"""Shared Unfold ModelAdmin defaults for the JURE staff admin."""

from __future__ import annotations

from unfold.admin import ModelAdmin, StackedInline, TabularInline


def cabinet_cascade_delete_allowed(request) -> bool:
    """True only on the cabinet admin delete screen.

    Activity logs and credit rows stay immutable on their own pages, but they
    are removed when the cabinet that owns them is deleted.
    """
    path = getattr(request, "path", None)
    if not isinstance(path, str):
        return False
    return path.startswith("/admin/cabinets/cabinet")


class JureModelAdmin(ModelAdmin):
    """Visual defaults applied across JURE admin list/change pages."""

    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_horizontal_scrollbar_top = True


class JureTabularInline(TabularInline):
    extra = 0
    hide_title = False


class JureStackedInline(StackedInline):
    extra = 0
