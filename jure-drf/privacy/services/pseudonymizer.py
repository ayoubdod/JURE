"""Stable pseudonymization — preserve semantics, replace sensitive values with opaque tokens."""

from __future__ import annotations

from dataclasses import dataclass, field

from django.db import transaction

from privacy.constants import TOKEN_PREFIX, EntityType
from privacy.jurisdictions import DetectedSpan
from privacy.models import PseudonymMapping, PseudonymMappingSession
from privacy.services.crypto import PrivacyCryptoError, encrypt_value, value_hmac
from privacy.services.detector import DetectionResult, detect


class PseudonymizeError(Exception):
    """Raised when pseudonymization cannot complete safely."""


@dataclass
class PseudonymizeResult:
    sanitized_text: str
    session: PseudonymMappingSession
    entity_counts: dict[str, int] = field(default_factory=dict)
    tokens_used: list[str] = field(default_factory=list)


def _normalize(value: str) -> str:
    return " ".join((value or "").strip().split()).casefold()


def _token_label(entity_type: str) -> str:
    return TOKEN_PREFIX.get(entity_type, TOKEN_PREFIX.get(EntityType.IDENTIFIER, "ID"))


def _next_index(counters: dict[str, int], label: str) -> int:
    counters[label] = counters.get(label, 0) + 1
    return counters[label]


@transaction.atomic
def pseudonymize_text(
    text: str,
    *,
    session: PseudonymMappingSession,
    jurisdiction: str | None = None,
    known_entities: list[tuple[str, str]] | None = None,
    detection: DetectionResult | None = None,
) -> PseudonymizeResult:
    """
    Replace detected entities with stable [TYPE_NNN] tokens within the session.
    Original values are stored encrypted; never returned to the AI plane.
    """
    text = text or ""
    if detection is None:
        detection = detect(text, jurisdiction=jurisdiction, known_entities=known_entities)

    if not detection.spans:
        return PseudonymizeResult(
            sanitized_text=text,
            session=session,
            entity_counts={},
            tokens_used=[],
        )

    # Load existing counters / hash→token for stability across multiple fields in one session
    existing = list(
        PseudonymMapping.objects.filter(session=session).only(
            "token", "entity_type", "value_hash"
        )
    )
    hash_to_token: dict[tuple[str, str], str] = {
        (m.entity_type, m.value_hash): m.token for m in existing
    }
    counters: dict[str, int] = {}
    for m in existing:
        # Parse PERSON_001 → label PERSON, index 1
        inner = m.token.strip("[]")
        if "_" in inner:
            label, _, num = inner.rpartition("_")
            try:
                counters[label] = max(counters.get(label, 0), int(num))
            except ValueError:
                pass

    replacements: list[tuple[int, int, str]] = []
    tokens_used: list[str] = []

    for span in detection.spans:
        try:
            vh = value_hmac(_normalize(span.value), span.entity_type)
        except PrivacyCryptoError as exc:
            raise PseudonymizeError(str(exc)) from exc

        key = (span.entity_type, vh)
        token = hash_to_token.get(key)
        if not token:
            label = _token_label(span.entity_type)
            idx = _next_index(counters, label)
            token = f"[{label}_{idx:03d}]"
            try:
                ciphertext = encrypt_value(span.value)
            except PrivacyCryptoError as exc:
                raise PseudonymizeError(str(exc)) from exc
            PseudonymMapping.objects.create(
                session=session,
                cabinet_id=session.cabinet_id,
                token=token,
                entity_type=span.entity_type,
                value_hash=vh,
                encrypted_value=ciphertext,
            )
            hash_to_token[key] = token
        replacements.append((span.start, span.end, token))
        tokens_used.append(token)

    # Apply longest-first / reverse order by start so offsets stay valid
    replacements.sort(key=lambda r: r[0], reverse=True)
    out = text
    for start, end, token in replacements:
        out = out[:start] + token + out[end:]

    # Prefer authoritative counts from persisted mappings
    from django.db.models import Count

    agg = (
        PseudonymMapping.objects.filter(session=session)
        .values("entity_type")
        .annotate(c=Count("id"))
    )
    session.entity_counts = {row["entity_type"]: row["c"] for row in agg}
    session.save(update_fields=["entity_counts"])

    return PseudonymizeResult(
        sanitized_text=out,
        session=session,
        entity_counts=dict(session.entity_counts),
        tokens_used=tokens_used,
    )
