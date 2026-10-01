"""AES-256-GCM encryption for pseudonym mapping values.

Key is loaded from PRIVACY_MAPPING_KEY (base64-encoded 32-byte key).
Never store keys in source code.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
from functools import lru_cache

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


class PrivacyCryptoError(Exception):
    """Raised when encryption/decryption cannot proceed safely."""


@lru_cache(maxsize=1)
def _load_key() -> bytes:
    raw = (getattr(settings, "PRIVACY_MAPPING_KEY", "") or "").strip()
    if not raw:
        raise PrivacyCryptoError(
            "PRIVACY_MAPPING_KEY is not configured. "
            "Set a base64-encoded 32-byte key before using Pseudonymized mode."
        )
    try:
        key = base64.b64decode(raw)
    except Exception as exc:
        raise PrivacyCryptoError("PRIVACY_MAPPING_KEY must be valid base64.") from exc
    if len(key) != 32:
        raise PrivacyCryptoError(
            f"PRIVACY_MAPPING_KEY must decode to 32 bytes (got {len(key)})."
        )
    return key


def mapping_key_configured() -> bool:
    try:
        _load_key()
        return True
    except PrivacyCryptoError:
        return False


def clear_key_cache() -> None:
    """Test helper — reset cached key after settings override."""
    _load_key.cache_clear()


def encrypt_value(plaintext: str) -> str:
    """Return base64(nonce || ciphertext_with_tag)."""
    if plaintext is None:
        raise PrivacyCryptoError("Cannot encrypt empty mapping value.")
    key = _load_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("ascii")


def decrypt_value(blob: str) -> str:
    """Decrypt base64(nonce || ciphertext_with_tag)."""
    if not blob:
        raise PrivacyCryptoError("Cannot decrypt empty ciphertext.")
    key = _load_key()
    try:
        raw = base64.b64decode(blob)
    except Exception as exc:
        raise PrivacyCryptoError("Invalid ciphertext encoding.") from exc
    if len(raw) < 13:
        raise PrivacyCryptoError("Ciphertext too short.")
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    try:
        pt = aesgcm.decrypt(nonce, ct, None)
    except Exception as exc:
        raise PrivacyCryptoError("Decryption failed.") from exc
    return pt.decode("utf-8")


def value_hmac(normalized: str, entity_type: str) -> str:
    """Stable HMAC for session-scoped token lookup (not reversible to plaintext)."""
    key = _load_key()
    msg = f"{entity_type}|{normalized}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()
