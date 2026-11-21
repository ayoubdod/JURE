"""Allowlisted HTML cleaning for JURIA artifacts and similar rich text."""

from __future__ import annotations

import nh3

_ALLOWED_TAGS = frozenset(
    {
        "p",
        "br",
        "div",
        "span",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "pre",
        "code",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "a",
        "hr",
    }
)

# Do not list "rel" on anchors — nh3/ammonia manages rel itself and panics if set.
_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
    "span": {"class"},
    "div": {"class"},
    "p": {"class"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}

_ALLOWED_URL_SCHEMES = {"http", "https", "mailto"}


def sanitize_html(html: str | None) -> str:
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        url_schemes=_ALLOWED_URL_SCHEMES,
    )
