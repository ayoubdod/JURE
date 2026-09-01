"""Shared Unfold ModelAdmin defaults for the JURE staff admin."""

from __future__ import annotations

from unfold.admin import ModelAdmin, StackedInline, TabularInline


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
