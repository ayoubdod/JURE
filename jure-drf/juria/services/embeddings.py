"""
Phase 5B — optional local embeddings for hybrid retrieval.

Default: disabled. Never calls external embedding APIs.
When enabled, uses an on-box sentence-transformers model (or a test double).
"""

from __future__ import annotations

import hashlib
import logging
import math
import struct
from typing import Protocol

from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "intfloat/multilingual-e5-base"
_DIM_FALLBACK = 384


class EmbeddingProvider(Protocol):
    model_id: str

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


class HashEmbeddingProvider:
    """Deterministic local stub for tests / CI without model downloads."""

    model_id = "hash-v1"

    def __init__(self, dim: int = _DIM_FALLBACK):
        self.dim = dim

    def _one(self, text: str, *, prefix: str) -> list[float]:
        raw = f"{prefix}:{text or ''}".encode("utf-8")
        digest = hashlib.sha256(raw).digest()
        # Expand digest into dim floats in [-1, 1]
        vals: list[float] = []
        seed = digest
        while len(vals) < self.dim:
            seed = hashlib.sha256(seed).digest()
            for i in range(0, len(seed) - 3, 4):
                if len(vals) >= self.dim:
                    break
                (n,) = struct.unpack(">I", seed[i : i + 4])
                vals.append((n / 0xFFFFFFFF) * 2.0 - 1.0)
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vals)) or 1.0
        return [v / norm for v in vals]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._one(t, prefix="doc") for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._one(text, prefix="query")


class SentenceTransformerProvider:
    """Local multilingual embeddings via sentence-transformers (optional dependency)."""

    def __init__(self, model_id: str | None = None):
        self.model_id = model_id or getattr(settings, "JURIA_EMBEDDING_MODEL", DEFAULT_MODEL)
        from sentence_transformers import SentenceTransformer  # type: ignore

        self._model = SentenceTransformer(self.model_id)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        # e5 models expect "passage: " prefix
        prefixed = [f"passage: {t}" for t in texts]
        vectors = self._model.encode(prefixed, normalize_embeddings=True)
        return [v.tolist() for v in vectors]

    def embed_query(self, text: str) -> list[float]:
        vector = self._model.encode([f"query: {text}"], normalize_embeddings=True)[0]
        return vector.tolist()


_provider: EmbeddingProvider | None = None
_provider_override: EmbeddingProvider | None = None


def embeddings_enabled() -> bool:
    return bool(getattr(settings, "JURIA_EMBEDDINGS_ENABLED", False))


def hybrid_enabled() -> bool:
    return bool(getattr(settings, "JURIA_HYBRID_RETRIEVAL", False)) and embeddings_enabled()


def set_embedding_provider_override(provider: EmbeddingProvider | None) -> None:
    global _provider_override, _provider
    _provider_override = provider
    _provider = None


def get_embedding_provider() -> EmbeddingProvider:
    global _provider
    if _provider_override is not None:
        return _provider_override
    if _provider is not None:
        return _provider
    backend = str(getattr(settings, "JURIA_EMBEDDING_BACKEND", "auto")).strip().lower()
    if backend == "hash":
        _provider = HashEmbeddingProvider()
        return _provider
    if backend in ("sentence_transformers", "auto"):
        try:
            _provider = SentenceTransformerProvider()
            return _provider
        except Exception:
            if backend == "sentence_transformers":
                raise
            logger.warning(
                "sentence-transformers unavailable; using HashEmbeddingProvider stub. "
                "Install sentence-transformers for real multilingual embeddings."
            )
            _provider = HashEmbeddingProvider()
            return _provider
    _provider = HashEmbeddingProvider()
    return _provider


def embed_pages_for_intelligence(intelligence_id: int) -> int:
    """Embed all pages for one intelligence row. Returns number of pages updated."""
    if not embeddings_enabled():
        return 0
    from django.utils import timezone

    from cases.models import CaseAttachmentPage

    pages = list(
        CaseAttachmentPage.objects.filter(intelligence_id=intelligence_id).order_by("page_number")
    )
    if not pages:
        return 0
    provider = get_embedding_provider()
    texts = [p.extracted_text or "" for p in pages]
    # Skip empty pages
    nonempty_idx = [i for i, t in enumerate(texts) if t.strip()]
    if not nonempty_idx:
        return 0
    vectors = provider.embed_documents([texts[i] for i in nonempty_idx])
    now = timezone.now()
    updated = 0
    for i, vec in zip(nonempty_idx, vectors):
        page = pages[i]
        page.embedding = vec
        page.embedding_model = provider.model_id[:128]
        page.embedded_at = now
        page.save(update_fields=["embedding", "embedding_model", "embedded_at"])
        updated += 1
    return updated
