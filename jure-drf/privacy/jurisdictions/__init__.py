"""Jurisdiction rule packs for PII detection."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Pattern


@dataclass(frozen=True)
class DetectedSpan:
    start: int
    end: int
    entity_type: str
    value: str
    confidence: float = 1.0


@dataclass
class JurisdictionRules:
    code: str
    name: str
    patterns: list[tuple[str, Pattern[str], float]] = field(default_factory=list)
    contextual_hooks: list[Callable[[str], list[DetectedSpan]]] = field(default_factory=list)


# Shared international patterns (compiled in base module)
EMAIL_RE = r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
PHONE_INTL_RE = r"(?:\+|00)?(?:212|974|33|1)[\s.\-]?(?:\(?\d{1,4}\)?[\s.\-]?){2,5}\d{2,4}"
IBAN_RE = r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b"
PASSPORT_RE = r"\b[A-Z]{1,2}\d{6,9}\b"
URL_SENSITIVE_RE = r"https?://[^\s]+(?:[?&](?:id|cin|passport|email|phone|token)=[^\s&]+)"
DOB_RE = r"\b(?:0?[1-9]|[12]\d|3[01])[/\-.](?:0?[1-9]|1[0-2])[/\-.](?:19|20)\d{2}\b"
DOB_ISO_RE = r"\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b"
