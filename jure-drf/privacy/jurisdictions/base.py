"""Base / shared detection patterns and contextual NER heuristics."""

from __future__ import annotations

import re
from typing import Iterable

from privacy.constants import EntityType
from privacy.jurisdictions import (
    DOB_ISO_RE,
    DOB_RE,
    EMAIL_RE,
    IBAN_RE,
    PASSPORT_RE,
    PHONE_INTL_RE,
    URL_SENSITIVE_RE,
    DetectedSpan,
    JurisdictionRules,
)

# Company / org suffixes (FR / EN / AR-latin) — name tokens only, no role titles
_ORG_SUFFIX = r"(?:SARL|SA|SAS|S\.A\.|S\.A\.R\.L\.|LLC|LLP|Inc\.?|Ltd\.?|GmbH|PLC|EURL|SNC|SCOP)"
_ORG_RE = re.compile(
    rf"\b((?:(?!(?:Managing|Director|Gérant|Gérante|Président|Présidente|Avocat|Avocate|"
    rf"Attorney|CEO|CFO|Associé|Associée|Directeur|Directrice|Manager|Partner)\b)"
    rf"[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]{{1,40}}\s+){{1,4}}{_ORG_SUFFIX})\b",
    re.IGNORECASE,
)

# Person near role titles
_TITLE_WORDS = (
    r"(?:Managing\s+Director|Director|Gérant|Gérante|Président|Présidente|"
    r"Avocat|Avocate|Attorney|CEO|CFO|Associé|Associée|Associé\s+gérant|"
    r"Directeur|Directrice|Manager|Partner)"
)
_PERSON_AFTER_TITLE = re.compile(
    rf"(?:{_TITLE_WORDS})\s+(?:of\s+|de\s+|d['']\s*)?"
    rf"([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]+){{0,3}})",
    re.IGNORECASE,
)
_PERSON_BEFORE_TITLE = re.compile(
    rf"([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]+){{0,3}})"
    rf",?\s+(?:{_TITLE_WORDS})",
    re.IGNORECASE,
)

# Standalone capitalized full names (2–4 tokens) — conservative
_NAME_RE = re.compile(
    r"\b([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]+(?:\s+(?:[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ''\-]+|ben|ibn|el|al|de|du|des|van|von)){1,3})\b"
)

_ADDRESS_RE = re.compile(
    r"\b(?:\d{1,4}\s+(?:bis\s+|ter\s+)?)?(?:rue|avenue|av\.|boulevard|bd\.|quartier|hay|lotissement|"
    r"street|road|ave\.|blvd\.)\s+[\wÀ-ÿ''\-\s,]{3,80}",
    re.IGNORECASE,
)

_FINANCIAL_RE = re.compile(
    r"\b(?:RIB|BBAN|compte\s+(?:bancaire|n[°o]?))\s*[:#]?\s*[A-Z0-9\s\-]{8,40}\b",
    re.IGNORECASE,
)

# Words that look like names but are not (legal / common)
_NAME_STOPWORDS = frozenset(
    {
        "the",
        "and",
        "or",
        "of",
        "le",
        "la",
        "les",
        "des",
        "du",
        "de",
        "un",
        "une",
        "et",
        "ou",
        "pour",
        "avec",
        "dans",
        "sur",
        "contrat",
        "article",
        "clause",
        "partie",
        "parties",
        "tribunal",
        "cour",
        "law",
        "act",
        "code",
        "morocco",
        "maroc",
        "qatar",
        "france",
        "casablanca",
        "rabat",
        "paris",
        "doha",
        "managing",
        "director",
        "gérant",
        "gérante",
        "président",
        "présidente",
        "avocat",
        "avocate",
        "attorney",
        "ceo",
        "cfo",
        "associé",
        "associée",
        "directeur",
        "directrice",
        "manager",
        "partner",
        "sarl",
        "llc",
        "inc",
        "ltd",
    }
)


def shared_patterns() -> list[tuple[str, re.Pattern[str], float]]:
    return [
        (EntityType.EMAIL, re.compile(EMAIL_RE, re.IGNORECASE), 1.0),
        (EntityType.PHONE, re.compile(PHONE_INTL_RE), 0.9),
        (EntityType.FINANCIAL, re.compile(IBAN_RE), 1.0),
        (EntityType.IDENTIFIER, re.compile(PASSPORT_RE), 0.7),
        (EntityType.URL, re.compile(URL_SENSITIVE_RE, re.IGNORECASE), 0.9),
        (EntityType.DATE, re.compile(DOB_RE), 0.8),
        (EntityType.DATE, re.compile(DOB_ISO_RE), 0.85),
        (EntityType.FINANCIAL, _FINANCIAL_RE, 0.9),
        (EntityType.ADDRESS, _ADDRESS_RE, 0.85),
        (EntityType.ORGANIZATION, _ORG_RE, 0.9),
    ]


def _is_plausible_name(value: str) -> bool:
    parts = value.strip().split()
    if len(parts) < 2 or len(parts) > 4:
        return False
    lower_parts = [p.lower() for p in parts]
    if any(p in _NAME_STOPWORDS for p in lower_parts):
        return False
    # Reject if all tokens are stop-like short words
    if all(len(p) <= 2 for p in parts):
        return False
    return True


def contextual_person_spans(text: str) -> list[DetectedSpan]:
    spans: list[DetectedSpan] = []
    for rx in (_PERSON_AFTER_TITLE, _PERSON_BEFORE_TITLE):
        for m in rx.finditer(text):
            val = m.group(1).strip()
            if _is_plausible_name(val) or len(val.split()) >= 2:
                spans.append(
                    DetectedSpan(
                        start=m.start(1),
                        end=m.end(1),
                        entity_type=EntityType.PERSON,
                        value=val,
                        confidence=0.92,
                    )
                )
    # Conservative standalone names (only when looking like First Last)
    for m in _NAME_RE.finditer(text):
        val = m.group(1).strip()
        if not _is_plausible_name(val):
            continue
        # Skip if already covered by title-context or org match
        spans.append(
            DetectedSpan(
                start=m.start(1),
                end=m.end(1),
                entity_type=EntityType.PERSON,
                value=val,
                confidence=0.65,
            )
        )
    return spans


def base_rules() -> JurisdictionRules:
    return JurisdictionRules(
        code="BASE",
        name="Shared / international",
        patterns=shared_patterns(),
        contextual_hooks=[contextual_person_spans],
    )


def merge_rules(primary: JurisdictionRules, *extras: JurisdictionRules) -> JurisdictionRules:
    patterns = list(primary.patterns)
    hooks = list(primary.contextual_hooks)
    for extra in extras:
        patterns.extend(extra.patterns)
        hooks.extend(extra.contextual_hooks)
    return JurisdictionRules(
        code=primary.code,
        name=primary.name,
        patterns=patterns,
        contextual_hooks=hooks,
    )


def apply_patterns(
    text: str,
    patterns: Iterable[tuple[str, re.Pattern[str], float]],
) -> list[DetectedSpan]:
    out: list[DetectedSpan] = []
    for entity_type, rx, confidence in patterns:
        for m in rx.finditer(text):
            val = m.group(0)
            if not val or not val.strip():
                continue
            out.append(
                DetectedSpan(
                    start=m.start(),
                    end=m.end(),
                    entity_type=entity_type,
                    value=val.strip(),
                    confidence=confidence,
                )
            )
    return out
