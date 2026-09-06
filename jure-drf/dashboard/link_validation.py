"""Validate optional announcement CTA URLs (internal paths or HTTPS)."""
from __future__ import annotations

import re
from urllib.parse import urlparse

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

UNSAFE_SCHEMES = ("javascript", "data", "vbscript", "file", "blob")
INTERNAL_PATH_RE = re.compile(r"^/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%\-]*$")


def normalize_link_url(value: str | None) -> str:
    return (value or "").strip()


def validate_announcement_link(value: str | None) -> str:
    """
    Accept:
      - empty / None (optional CTA)
      - internal app paths starting with a single /
      - https:// URLs
    Reject javascript:, data:, vbscript:, protocol-relative //, and http://.
    """
    raw = normalize_link_url(value)
    if not raw:
        return ""

    lowered = raw.lower()
    for scheme in UNSAFE_SCHEMES:
        if lowered.startswith(f"{scheme}:"):
            raise ValidationError(_("This link protocol is not allowed."))

    if raw.startswith("//"):
        raise ValidationError(_("Protocol-relative URLs are not allowed."))

    if raw.startswith("/"):
        if not INTERNAL_PATH_RE.match(raw) or "\\" in raw:
            raise ValidationError(_("Enter a valid internal path."))
        return raw

    parsed = urlparse(raw)
    if parsed.scheme.lower() != "https" or not parsed.netloc:
        raise ValidationError(
            _("Use an internal path (starting with /) or a valid HTTPS URL.")
        )
    if parsed.username or parsed.password:
        raise ValidationError(_("URLs with credentials are not allowed."))
    return raw
