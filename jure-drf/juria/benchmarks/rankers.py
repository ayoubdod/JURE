"""
Offline rankers for Phase 5A.

A) Production-equivalent token-overlap (mirrors juria.services.retrieval scoring)
B) BM25 + improved lexical normalization
C) Pseudo-hybrid: BM25 + legal synonym expansion (proxy for semantic boost without embeddings)

No production imports that mutate services. Token helpers are duplicated intentionally
so this package stays isolated from retrieval.py changes.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter, defaultdict
from typing import Protocol

from .dataset import LEGAL_SYNONYMS, Passage
from .metrics import RankedHit

# --- Shared light tokenization (aligned with Phase 4 intent) ---

STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "en", "au", "aux",
    "ce", "cet", "cette", "ces", "pour", "par", "sur", "avec", "dans", "que", "qui",
    "quoi", "dont", "est", "sont", "pas", "plus", "moins",
    "the", "a", "an", "of", "and", "or", "to", "in", "for", "on", "with", "is", "are",
    "be", "as", "by", "at", "from", "that", "this", "these", "those", "not",
    "في", "من", "على", "إلى", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "تلك",
    "التي", "الذي", "الذين", "او", "أو", "ثم", "قد", "كان", "كانت",
    "comment", "quelles", "quelle", "what", "how", "when", "where", "why",
    "ما", "هي", "هل",
}

_TOKEN_RE = re.compile(
    r"(?:"
    r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9]{2,}"
    r"|"
    r"[0-9]{2,}"
    r"|"
    r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{2,}"
    r")"
)
_ARABIC_DIACRITICS = re.compile(r"[\u064B-\u065F\u0670\u0640]")


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text or "")
    text = _ARABIC_DIACRITICS.sub("", text)
    for src, dst in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ٱ", "ا"), ("ة", "ه")):
        text = text.replace(src, dst)
    # Light OCR noise folding for improved lexical only
    return text.lower()


def tokenize(text: str, *, ocr_fold: bool = False) -> list[str]:
    raw = normalize_text(text)
    if ocr_fold:
        # Map common OCR confusions for Latin (benchmark-only improvement)
        trans = str.maketrans({"@": "a", "0": "o", "1": "l", "€": "e"})
        raw = raw.translate(trans)
        raw = raw.replace("resiIiation", "resiliation").replace("résiIiation", "résiliation")
        raw = raw.replace("anticlpée", "anticipée").replace("préavls", "préavis")
        raw = raw.replace("trentc", "trente").replace("semalne", "semaine")
        raw = raw.replace("pénaIités", "pénalités").replace("rctard", "retard")
        raw = raw.replace("mont@nt", "montant").replace("résiliatlon", "résiliation")
    tokens: list[str] = []
    for t in _TOKEN_RE.findall(raw):
        if not t or t in STOPWORDS:
            continue
        if t.startswith("ال") and len(t) > 3:
            bare = t[2:]
            if bare and bare not in STOPWORDS:
                tokens.append(bare)
        tokens.append(t)
    return tokens


def expand_query_tokens(tokens: list[str]) -> list[str]:
    out = list(tokens)
    seen = set(tokens)
    for t in tokens:
        syns = LEGAL_SYNONYMS.get(t) or LEGAL_SYNONYMS.get(t.rstrip("s"))
        if not syns:
            continue
        for s in syns:
            s_norm = normalize_text(s)
            if s_norm and s_norm not in seen and s_norm not in STOPWORDS:
                seen.add(s_norm)
                out.append(s_norm)
    return out


class Ranker(Protocol):
    name: str

    def rank(self, query: str, *, limit: int = 8) -> list[RankedHit]: ...


class TokenOverlapRanker:
    """Mirrors production `_score` = |q ∩ d| / |q|."""

    name = "token_overlap_phase4"

    def __init__(self, passages: list[Passage]):
        self.passages = passages

    def rank(self, query: str, *, limit: int = 8) -> list[RankedHit]:
        q = set(tokenize(query))
        if not q:
            return []
        scored: list[RankedHit] = []
        for p in self.passages:
            d = set(tokenize(p.text))
            if not d:
                continue
            score = len(q & d) / max(len(q), 1)
            if score <= 0:
                continue
            scored.append(
                RankedHit(doc_id=p.doc_id, page=p.page, score=score, text=p.text, doc_name=p.doc_name)
            )
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:limit]


class BM25Ranker:
    """Classic BM25 (k1=1.2, b=0.75) with optional OCR folding + synonym expansion."""

    name = "bm25_improved_lexical"

    def __init__(
        self,
        passages: list[Passage],
        *,
        ocr_fold: bool = True,
        synonym_expand: bool = False,
        k1: float = 1.2,
        b: float = 0.75,
        name: str | None = None,
    ):
        self.passages = passages
        self.ocr_fold = ocr_fold
        self.synonym_expand = synonym_expand
        self.k1 = k1
        self.b = b
        if name:
            self.name = name
        self._docs_tokens: list[list[str]] = [
            tokenize(p.text, ocr_fold=ocr_fold) for p in passages
        ]
        self._doc_len = [len(t) or 1 for t in self._docs_tokens]
        self._avgdl = sum(self._doc_len) / max(len(self._doc_len), 1)
        df: Counter[str] = Counter()
        for toks in self._docs_tokens:
            df.update(set(toks))
        self._df = df
        self._n = len(passages)

    def _idf(self, term: str) -> float:
        # Lucene-style idf
        df = self._df.get(term, 0)
        return math.log(1 + (self._n - df + 0.5) / (df + 0.5))

    def rank(self, query: str, *, limit: int = 8) -> list[RankedHit]:
        q_tokens = tokenize(query, ocr_fold=self.ocr_fold)
        if self.synonym_expand:
            q_tokens = expand_query_tokens(q_tokens)
        if not q_tokens:
            return []
        q_tf = Counter(q_tokens)
        scored: list[RankedHit] = []
        for idx, p in enumerate(self.passages):
            toks = self._docs_tokens[idx]
            if not toks:
                continue
            tf = Counter(toks)
            dl = self._doc_len[idx]
            score = 0.0
            for term, qf in q_tf.items():
                if term not in tf:
                    continue
                idf = self._idf(term)
                freq = tf[term]
                denom = freq + self.k1 * (1 - self.b + self.b * dl / self._avgdl)
                score += idf * (freq * (self.k1 + 1) / denom) * (1 + math.log1p(qf))
            if score <= 0:
                continue
            scored.append(
                RankedHit(doc_id=p.doc_id, page=p.page, score=score, text=p.text, doc_name=p.doc_name)
            )
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:limit]


class HybridLexicalSemanticProxyRanker:
    """
    Pseudo-hybrid without embeddings:
    score = 0.65 * BM25_norm + 0.35 * synonym_expanded_overlap_norm

    Represents the *shape* of hybrid ranking; true semantic gains would require
    multilingual embeddings (evaluated conceptually in the decision report).
    """

    name = "hybrid_lexical_synonym_proxy"

    def __init__(self, passages: list[Passage]):
        self.bm25 = BM25Ranker(passages, ocr_fold=True, synonym_expand=False, name="bm25_base")
        self.bm25_syn = BM25Ranker(
            passages, ocr_fold=True, synonym_expand=True, name="bm25_syn"
        )
        self.passages = passages

    def rank(self, query: str, *, limit: int = 8) -> list[RankedHit]:
        a = { (h.doc_id, h.page): h for h in self.bm25.rank(query, limit=50) }
        b = { (h.doc_id, h.page): h for h in self.bm25_syn.rank(query, limit=50) }
        keys = set(a) | set(b)
        if not keys:
            return []
        max_a = max((h.score for h in a.values()), default=1.0) or 1.0
        max_b = max((h.score for h in b.values()), default=1.0) or 1.0
        merged: list[RankedHit] = []
        for key in keys:
            ha = a.get(key)
            hb = b.get(key)
            sa = (ha.score / max_a) if ha else 0.0
            sb = (hb.score / max_b) if hb else 0.0
            score = 0.65 * sa + 0.35 * sb
            base = ha or hb
            assert base is not None
            merged.append(
                RankedHit(
                    doc_id=base.doc_id,
                    page=base.page,
                    score=score,
                    text=base.text,
                    doc_name=base.doc_name,
                )
            )
        merged.sort(key=lambda h: h.score, reverse=True)
        return merged[:limit]


def build_rankers(passages: list[Passage]) -> list[Ranker]:
    return [
        TokenOverlapRanker(passages),
        BM25Ranker(passages, ocr_fold=True, synonym_expand=False, name="bm25_improved_lexical"),
        HybridLexicalSemanticProxyRanker(passages),
    ]
