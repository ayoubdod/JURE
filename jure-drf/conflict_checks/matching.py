"""
Reusable name-matching engine for conflict checks.

Classifications (never a legal determination):
  EXACT    — identical after casefold/strip
  HIGH     — normalized equality, token reorder, or near-identical
  POSSIBLE — careful partial / controlled fuzzy similarity
"""
from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher
from enum import Enum
from typing import NamedTuple


class MatchType(str, Enum):
    EXACT = "EXACT"
    HIGH = "HIGH"
    POSSIBLE = "POSSIBLE"


# Common org suffixes stripped only for HIGH/POSSIBLE comparison (not EXACT).
_ORG_SUFFIXES = (
    "corporation",
    "corp",
    "incorporated",
    "inc",
    "limited",
    "ltd",
    "llc",
    "plc",
    "sa",
    "sarl",
    "sas",
    "gmbh",
    "bv",
    "nv",
    "co",
    "company",
)


class MatchResult(NamedTuple):
    match_type: MatchType
    confidence: float
    reason: str


def normalize_name(value: str) -> str:
    """Lowercase, strip accents, drop punctuation, collapse whitespace."""
    if not value:
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.casefold().strip()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _strip_org_suffixes(normalized: str) -> str:
    tokens = normalized.split()
    while tokens and tokens[-1] in _ORG_SUFFIXES:
        tokens.pop()
    return " ".join(tokens)


def _token_set(normalized: str) -> frozenset[str]:
    return frozenset(t for t in normalized.split() if t)


def _token_matches(a: str, b: str) -> bool:
    """Exact or meaningful prefix match (min 3 chars) between tokens."""
    if a == b:
        return True
    if len(a) >= 3 and len(b) >= 3 and (b.startswith(a) or a.startswith(b)):
        return True
    return False


def _tokens_covered(needles: frozenset[str], haystack: frozenset[str]) -> bool:
    """True when every needle token is covered by some haystack token."""
    if not needles:
        return False
    for needle in needles:
        if not any(_token_matches(needle, h) for h in haystack):
            return False
    return True


def classify_match(query: str, candidate: str) -> MatchResult | None:
    """
    Compare query to a candidate display name.
    Returns None when similarity is too weak to surface as a potential match.
    """
    q_raw = (query or "").strip()
    c_raw = (candidate or "").strip()
    if not q_raw or not c_raw:
        return None

    if q_raw.casefold() == c_raw.casefold():
        return MatchResult(MatchType.EXACT, 1.0, "Exact name match")

    q_norm = normalize_name(q_raw)
    c_norm = normalize_name(c_raw)
    if not q_norm or not c_norm:
        return None

    if q_norm == c_norm:
        return MatchResult(MatchType.HIGH, 0.98, "Normalized name match")

    q_tokens = _token_set(q_norm)
    c_tokens = _token_set(c_norm)
    if q_tokens and q_tokens == c_tokens:
        return MatchResult(MatchType.HIGH, 0.96, "Same name tokens (order-independent)")

    q_core = _strip_org_suffixes(q_norm)
    c_core = _strip_org_suffixes(c_norm)
    if q_core and c_core and q_core == c_core:
        return MatchResult(MatchType.HIGH, 0.94, "Normalized organization-name match")

    # Controlled partial: one contains the other with enough substance (≥ 3 chars).
    if len(q_norm) >= 3 and len(c_norm) >= 3:
        if q_norm in c_norm or c_norm in q_norm:
            shorter = min(len(q_norm), len(c_norm))
            longer = max(len(q_norm), len(c_norm))
            ratio = shorter / longer if longer else 0.0
            if ratio >= 0.55:
                return MatchResult(
                    MatchType.POSSIBLE,
                    round(0.75 + 0.2 * ratio, 3),
                    "Partial name match",
                )

    # Token coverage: every query token is covered by a candidate token (exact/prefix).
    # Handles "ABC Corp" vs "ABC Corporation Holdings".
    if q_tokens and c_tokens and _tokens_covered(q_tokens, c_tokens):
        coverage = len(q_tokens) / max(len(c_tokens), 1)
        return MatchResult(
            MatchType.POSSIBLE,
            round(0.78 + 0.12 * min(coverage, 1.0), 3),
            "Partial name match",
        )
    if q_tokens and c_tokens and _tokens_covered(c_tokens, q_tokens):
        coverage = len(c_tokens) / max(len(q_tokens), 1)
        return MatchResult(
            MatchType.POSSIBLE,
            round(0.78 + 0.12 * min(coverage, 1.0), 3),
            "Partial name match",
        )

    # Token overlap for multi-word names (e.g. shared surname + given name).
    if len(q_tokens) >= 2 and len(c_tokens) >= 2:
        overlap = q_tokens & c_tokens
        if len(overlap) >= 2 and overlap == q_tokens | c_tokens:
            return MatchResult(MatchType.HIGH, 0.95, "Same name tokens (order-independent)")
        if len(overlap) >= 2 and (q_tokens <= c_tokens or c_tokens <= q_tokens):
            return MatchResult(
                MatchType.POSSIBLE,
                0.82,
                "Shared name tokens",
            )

    # Carefully controlled fuzzy (SequenceMatcher). Threshold avoids noisy false positives.
    ratio = SequenceMatcher(None, q_norm, c_norm).ratio()
    if ratio >= 0.92:
        return MatchResult(
            MatchType.HIGH,
            round(ratio, 3),
            f"Name similarity: {round(ratio * 100)}%",
        )
    if ratio >= 0.85:
        return MatchResult(
            MatchType.POSSIBLE,
            round(ratio, 3),
            f"Name similarity: {round(ratio * 100)}%",
        )

    # Core fuzzy after stripping org suffixes
    if q_core and c_core and (q_core != q_norm or c_core != c_norm):
        core_ratio = SequenceMatcher(None, q_core, c_core).ratio()
        if core_ratio >= 0.92:
            return MatchResult(
                MatchType.HIGH,
                round(core_ratio, 3),
                f"Organization-name similarity: {round(core_ratio * 100)}%",
            )
        if core_ratio >= 0.85:
            return MatchResult(
                MatchType.POSSIBLE,
                round(core_ratio, 3),
                f"Organization-name similarity: {round(core_ratio * 100)}%",
            )

    return None


def broad_contains_filter(query: str) -> str:
    """Token suitable for DB icontains prefilter (first significant chunk)."""
    norm = normalize_name(query)
    if not norm:
        return (query or "").strip()[:40]
    # Prefer longest token ≥ 3 chars for prefilter breadth.
    tokens = sorted((t for t in norm.split() if len(t) >= 3), key=len, reverse=True)
    return tokens[0] if tokens else norm[:40]
