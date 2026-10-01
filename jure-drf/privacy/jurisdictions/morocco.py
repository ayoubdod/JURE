"""Morocco (MA) jurisdiction-specific PII patterns."""

from __future__ import annotations

import re

from privacy.constants import EntityType
from privacy.jurisdictions import DetectedSpan, JurisdictionRules
from privacy.jurisdictions.base import base_rules, merge_rules

# Moroccan CIN: typically 1–2 letters + 5–7 digits (e.g. AB123456, BK12345)
CIN_RE = re.compile(r"\b(?:CIN\s*[:#]?\s*)?([A-Z]{1,2}\d{5,7})\b", re.IGNORECASE)

# ICE (15 digits), IF (8 digits), RC (registre de commerce)
ICE_RE = re.compile(r"\b(?:ICE\s*[:#]?\s*)?(\d{15})\b", re.IGNORECASE)
IF_RE = re.compile(r"\b(?:IF|Identifiant\s+Fiscal)\s*[:#]?\s*(\d{7,9})\b", re.IGNORECASE)
RC_RE = re.compile(r"\b(?:RC|R\.C\.)\s*[:#]?\s*([A-Z0-9/\-]{3,20})\b", re.IGNORECASE)

# Moroccan mobile: 06/07 + 8 digits, with optional +212
MA_PHONE_RE = re.compile(
    r"(?:\+212|00212|0)\s*[5-7](?:[\s.\-]?\d{2}){4}",
)


def morocco_patterns() -> list[tuple[str, re.Pattern[str], float]]:
    return [
        (EntityType.IDENTIFIER, CIN_RE, 0.95),
        (EntityType.IDENTIFIER, ICE_RE, 0.95),
        (EntityType.IDENTIFIER, IF_RE, 0.9),
        (EntityType.IDENTIFIER, RC_RE, 0.85),
        (EntityType.PHONE, MA_PHONE_RE, 0.95),
    ]


def morocco_rules() -> JurisdictionRules:
    return merge_rules(
        JurisdictionRules(
            code="MA",
            name="Morocco",
            patterns=morocco_patterns(),
            contextual_hooks=[],
        ),
        base_rules(),
    )
