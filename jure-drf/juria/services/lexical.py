"""
Phase 5B — production lexical retrieval (BM25 + OCR-aware tokenization).

Shared by retrieve_for_query. No embeddings here.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass

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

# Common OCR confusions seen on scanned French legal PDFs (Phase 5A).
_OCR_WORD_FIXES = (
    ("resiIiation", "resiliation"),
    ("résiIiation", "résiliation"),
    ("anticlpée", "anticipée"),
    ("préavls", "préavis"),
    ("preavls", "preavis"),
    ("trentc", "trente"),
    ("semalne", "semaine"),
    ("pénaIités", "pénalités"),
    ("penaIites", "penalites"),
    ("rctard", "retard"),
    ("mont@nt", "montant"),
    ("résiliatlon", "résiliation"),
    ("resiliatlon", "resiliation"),
    ("cl@use", "clause"),
    ("faute gr@ve", "faute grave"),
)


def normalize_text(text: str, *, ocr_fold: bool = True) -> str:
    text = unicodedata.normalize("NFC", text or "")
    text = _ARABIC_DIACRITICS.sub("", text)
    for src, dst in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ٱ", "ا"), ("ة", "ه")):
        text = text.replace(src, dst)
    text = text.lower()
    if ocr_fold:
        for bad, good in _OCR_WORD_FIXES:
            text = text.replace(bad, good)
        # Character-level OCR noise (keep digits that form legal amounts via token regex).
        text = text.replace("@", "a")
    return text


def tokenize(text: str, *, ocr_fold: bool = True) -> list[str]:
    normalized = normalize_text(text, ocr_fold=ocr_fold)
    tokens: list[str] = []
    for raw in _TOKEN_RE.findall(normalized):
        t = raw.strip()
        if not t or t in STOPWORDS:
            continue
        if t.startswith("ال") and len(t) > 3:
            bare = t[2:]
            if bare and bare not in STOPWORDS:
                tokens.append(bare)
        tokens.append(t)
    return tokens


def overlap_score(query_tokens: set[str], chunk_text: str, *, ocr_fold: bool = True) -> float:
    if not query_tokens:
        return 0.0
    chunk_tokens = set(tokenize(chunk_text, ocr_fold=ocr_fold))
    if not chunk_tokens:
        return 0.0
    return len(query_tokens & chunk_tokens) / max(len(query_tokens), 1)


@dataclass
class BM25Index:
    """In-memory BM25 over a list of document texts (candidate chunks)."""

    doc_tokens: list[list[str]]
    doc_len: list[int]
    avgdl: float
    df: Counter
    n: int
    k1: float = 1.2
    b: float = 0.75

    @classmethod
    def build(cls, texts: list[str], *, ocr_fold: bool = True, k1: float = 1.2, b: float = 0.75) -> "BM25Index":
        doc_tokens = [tokenize(t, ocr_fold=ocr_fold) for t in texts]
        doc_len = [len(toks) or 1 for toks in doc_tokens]
        avgdl = sum(doc_len) / max(len(doc_len), 1)
        df: Counter = Counter()
        for toks in doc_tokens:
            df.update(set(toks))
        return cls(
            doc_tokens=doc_tokens,
            doc_len=doc_len,
            avgdl=avgdl,
            df=df,
            n=len(texts),
            k1=k1,
            b=b,
        )

    def _idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))

    def scores(self, query: str, *, ocr_fold: bool = True) -> list[float]:
        q_tokens = tokenize(query, ocr_fold=ocr_fold)
        if not q_tokens:
            return [0.0] * self.n
        q_tf = Counter(q_tokens)
        out: list[float] = []
        for idx in range(self.n):
            toks = self.doc_tokens[idx]
            if not toks:
                out.append(0.0)
                continue
            tf = Counter(toks)
            dl = self.doc_len[idx]
            score = 0.0
            for term, qf in q_tf.items():
                if term not in tf:
                    continue
                idf = self._idf(term)
                freq = tf[term]
                denom = freq + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
                score += idf * (freq * (self.k1 + 1) / denom) * (1 + math.log1p(qf))
            out.append(score)
        return out


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 0 or nb <= 0:
        return 0.0
    return dot / math.sqrt(na * nb)
