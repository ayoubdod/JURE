"""Controlled re-identification — restore tokens inside JURE only."""

from __future__ import annotations

import re

from privacy.models import PseudonymMapping, PseudonymMappingSession
from privacy.services.crypto import PrivacyCryptoError, decrypt_value


class ReidentifyError(Exception):
    """Raised when re-identification cannot complete."""


_TOKEN_RE = re.compile(r"\[[A-Z]+_\d{3,}\]")


def reidentify_text(
    text: str,
    *,
    session: PseudonymMappingSession,
    cabinet_id: int,
) -> str:
    """
    Replace opaque tokens with original values for an authorized cabinet-scoped session.
    Mapping ciphertext never leaves this function's return as structured data — only
    substituted into the lawyer-facing text.
    """
    text = text or ""
    if session.cabinet_id != cabinet_id:
        raise ReidentifyError("Session does not belong to this cabinet.")

    tokens = set(_TOKEN_RE.findall(text))
    if not tokens:
        return text

    mappings = PseudonymMapping.objects.filter(
        session=session,
        cabinet_id=cabinet_id,
        token__in=tokens,
    )
    by_token = {m.token: m for m in mappings}
    out = text
    for token in sorted(tokens, key=len, reverse=True):
        mapping = by_token.get(token)
        if not mapping:
            continue
        try:
            original = decrypt_value(mapping.encrypted_value)
        except PrivacyCryptoError as exc:
            raise ReidentifyError("Unable to decrypt mapping.") from exc
        out = out.replace(token, original)
    return out
