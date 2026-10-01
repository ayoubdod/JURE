"""Layered PII detection: deterministic rules + contextual heuristics + known entities."""

from __future__ import annotations

from dataclasses import dataclass

from privacy.constants import EntityType
from privacy.jurisdictions import DetectedSpan
from privacy.jurisdictions.base import apply_patterns
from privacy.jurisdictions.registry import get_rules


@dataclass
class DetectionResult:
    spans: list[DetectedSpan]
    entity_counts: dict[str, int]
    jurisdiction: str


def _overlaps(a: DetectedSpan, b: DetectedSpan) -> bool:
    return not (a.end <= b.start or b.end <= a.start)


def _merge_spans(spans: list[DetectedSpan]) -> list[DetectedSpan]:
    """Prefer longer / higher-confidence spans; drop overlaps."""
    if not spans:
        return []
    ordered = sorted(spans, key=lambda s: (-(s.end - s.start), -s.confidence, s.start))
    kept: list[DetectedSpan] = []
    for span in ordered:
        if any(_overlaps(span, k) for k in kept):
            continue
        kept.append(span)
    return sorted(kept, key=lambda s: s.start)


def _known_entity_spans(text: str, known: list[tuple[str, str]] | None) -> list[DetectedSpan]:
    """Boost detection with cabinet-scoped known values (name/email/phone). Never log values."""
    if not known or not text:
        return []
    spans: list[DetectedSpan] = []
    lower = text  # keep original for offsets; search case-insensitive
    for entity_type, value in known:
        val = (value or "").strip()
        if len(val) < 3:
            continue
        start = 0
        while True:
            idx = lower.lower().find(val.lower(), start)
            if idx < 0:
                break
            spans.append(
                DetectedSpan(
                    start=idx,
                    end=idx + len(val),
                    entity_type=entity_type,
                    value=text[idx : idx + len(val)],
                    confidence=0.99,
                )
            )
            start = idx + len(val)
    return spans


def detect(
    text: str,
    *,
    jurisdiction: str | None = None,
    known_entities: list[tuple[str, str]] | None = None,
) -> DetectionResult:
    """
    Detect PII/sensitive entities in text.

    known_entities: optional list of (entity_type, value) from case/client records.
    """
    text = text or ""
    rules = get_rules(jurisdiction)
    spans: list[DetectedSpan] = []
    spans.extend(apply_patterns(text, rules.patterns))
    for hook in rules.contextual_hooks:
        spans.extend(hook(text) or [])
    spans.extend(_known_entity_spans(text, known_entities))

    # Normalize COMPANY vs ORGANIZATION
    for s in spans:
        if s.entity_type == EntityType.COMPANY:
            s.entity_type = EntityType.ORGANIZATION

    merged = _merge_spans(spans)
    counts: dict[str, int] = {}
    for s in merged:
        counts[s.entity_type] = counts.get(s.entity_type, 0) + 1

    return DetectionResult(
        spans=merged,
        entity_counts=counts,
        jurisdiction=rules.code,
    )
