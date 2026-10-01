"""Qatar (QA) jurisdiction-specific PII patterns."""

from __future__ import annotations

import re

from privacy.constants import EntityType
from privacy.jurisdictions import JurisdictionRules
from privacy.jurisdictions.base import base_rules, merge_rules

# Qatar ID (QID): typically 11 digits
QID_RE = re.compile(r"\b(?:QID|Qatar\s+ID)\s*[:#]?\s*(\d{11})\b", re.IGNORECASE)
QID_BARE_RE = re.compile(r"\b([23]\d{10})\b")  # QIDs often start with 2 or 3

# Commercial registration / CR
CR_RE = re.compile(r"\b(?:CR|C\.R\.)\s*[:#]?\s*(\d{4,12})\b", re.IGNORECASE)

# Qatar phones: +974 / 974 + 8 digits
QA_PHONE_RE = re.compile(r"(?:\+974|00974|0)?\s*[3-7]\d{7}\b")


def qatar_patterns() -> list[tuple[str, re.Pattern[str], float]]:
    return [
        (EntityType.IDENTIFIER, QID_RE, 0.95),
        (EntityType.IDENTIFIER, QID_BARE_RE, 0.7),
        (EntityType.IDENTIFIER, CR_RE, 0.85),
        (EntityType.PHONE, QA_PHONE_RE, 0.9),
    ]


def qatar_rules() -> JurisdictionRules:
    return merge_rules(
        JurisdictionRules(
            code="QA",
            name="Qatar",
            patterns=qatar_patterns(),
            contextual_hooks=[],
        ),
        base_rules(),
    )
