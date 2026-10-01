"""Ephemeral redaction for non-mapped LLM side-calls (e.g. title generation).

Does not create PseudonymMapping rows. Used only when a full gateway session
is not yet available. Prefer sanitize_for_ai for primary AI egress.
"""

from __future__ import annotations

from privacy.constants import TOKEN_PREFIX
from privacy.services.detector import detect


def redact_ephemeral(text: str, *, jurisdiction: str | None = None) -> str:
    """Replace detected PII with opaque placeholders (no mapping stored)."""
    text = text or ""
    if not text.strip():
        return text
    result = detect(text, jurisdiction=jurisdiction)
    if not result.spans:
        return text
    counters: dict[str, int] = {}
    replacements: list[tuple[int, int, str]] = []
    seen: dict[tuple[str, str], str] = {}
    for span in result.spans:
        key = (span.entity_type, span.value.casefold().strip())
        token = seen.get(key)
        if not token:
            label = TOKEN_PREFIX.get(span.entity_type, "ID")
            counters[label] = counters.get(label, 0) + 1
            token = f"[{label}_{counters[label]:03d}]"
            seen[key] = token
        replacements.append((span.start, span.end, token))
    replacements.sort(key=lambda r: r[0], reverse=True)
    out = text
    for start, end, token in replacements:
        out = out[:start] + token + out[end:]
    return out
