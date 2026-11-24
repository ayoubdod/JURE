"""IR metrics for Phase 5A (offline)."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Iterable

from .dataset import BenchmarkQuery, GoldHit


@dataclass
class RankedHit:
    doc_id: str
    page: int
    score: float
    text: str = ""
    doc_name: str = ""


@dataclass
class QueryResult:
    qid: str
    query_type: str
    lang: str
    ranked: list[RankedHit]
    gold: tuple[GoldHit, ...]
    recall_at_5: float = 0.0
    recall_at_8: float = 0.0
    precision_at_5: float = 0.0
    mrr: float = 0.0
    ndcg_at_5: float = 0.0
    correct_doc: bool = False
    correct_page: bool = False
    irrelevant_in_top5: int = 0


@dataclass
class AggregateMetrics:
    recall_at_5: float
    recall_at_8: float
    precision_at_5: float
    mrr: float
    ndcg_at_5: float
    correct_doc_rate: float
    correct_page_rate: float
    avg_irrelevant_in_top5: float
    by_query_type: dict[str, dict[str, float]] = field(default_factory=dict)
    by_lang: dict[str, dict[str, float]] = field(default_factory=dict)
    n_queries: int = 0


def _gold_keys(gold: Iterable[GoldHit], *, min_rel: int = 1) -> set[tuple[str, int]]:
    return {(g.doc_id, g.page) for g in gold if g.relevance >= min_rel}


def _gold_docs(gold: Iterable[GoldHit]) -> set[str]:
    return {g.doc_id for g in gold}


def _relevance_map(gold: Iterable[GoldHit]) -> dict[tuple[str, int], int]:
    out: dict[tuple[str, int], int] = {}
    for g in gold:
        key = (g.doc_id, g.page)
        out[key] = max(out.get(key, 0), g.relevance)
    return out


def recall_at_k(ranked: list[RankedHit], gold: tuple[GoldHit, ...], k: int) -> float:
    keys = _gold_keys(gold, min_rel=1)
    if not keys:
        return 0.0
    top = {(h.doc_id, h.page) for h in ranked[:k]}
    return len(keys & top) / len(keys)


def precision_at_k(ranked: list[RankedHit], gold: tuple[GoldHit, ...], k: int) -> float:
    keys = _gold_keys(gold, min_rel=1)
    if k <= 0:
        return 0.0
    top = ranked[:k]
    if not top:
        return 0.0
    hits = sum(1 for h in top if (h.doc_id, h.page) in keys)
    return hits / len(top)


def mrr_score(ranked: list[RankedHit], gold: tuple[GoldHit, ...]) -> float:
    keys = _gold_keys(gold, min_rel=1)
    for i, h in enumerate(ranked, start=1):
        if (h.doc_id, h.page) in keys:
            return 1.0 / i
    return 0.0


def ndcg_at_k(ranked: list[RankedHit], gold: tuple[GoldHit, ...], k: int) -> float:
    rel_map = _relevance_map(gold)
    dcg = 0.0
    for i, h in enumerate(ranked[:k], start=1):
        rel = rel_map.get((h.doc_id, h.page), 0)
        if rel:
            dcg += (2**rel - 1) / math.log2(i + 1)
    # Ideal
    ideal_rels = sorted(rel_map.values(), reverse=True)[:k]
    idcg = 0.0
    for i, rel in enumerate(ideal_rels, start=1):
        idcg += (2**rel - 1) / math.log2(i + 1)
    if idcg <= 0:
        return 0.0
    return dcg / idcg


def evaluate_query(query: BenchmarkQuery, ranked: list[RankedHit]) -> QueryResult:
    gold_pages = _gold_keys(query.gold, min_rel=2) or _gold_keys(query.gold, min_rel=1)
    gold_docs = _gold_docs(query.gold)
    top5_keys = {(h.doc_id, h.page) for h in ranked[:5]}
    irrelevant = sum(1 for h in ranked[:5] if (h.doc_id, h.page) not in _gold_keys(query.gold, min_rel=1))

    return QueryResult(
        qid=query.qid,
        query_type=query.query_type,
        lang=query.lang,
        ranked=ranked,
        gold=query.gold,
        recall_at_5=recall_at_k(ranked, query.gold, 5),
        recall_at_8=recall_at_k(ranked, query.gold, 8),
        precision_at_5=precision_at_k(ranked, query.gold, 5),
        mrr=mrr_score(ranked, query.gold),
        ndcg_at_5=ndcg_at_k(ranked, query.gold, 5),
        correct_doc=any(h.doc_id in gold_docs for h in ranked[:5]),
        correct_page=any((h.doc_id, h.page) in gold_pages for h in ranked[:5]),
        irrelevant_in_top5=irrelevant,
    )


def aggregate(results: list[QueryResult]) -> AggregateMetrics:
    n = max(len(results), 1)

    def avg(attr: str) -> float:
        return sum(getattr(r, attr) for r in results) / n

    by_type: dict[str, list[QueryResult]] = {}
    by_lang: dict[str, list[QueryResult]] = {}
    for r in results:
        by_type.setdefault(r.query_type, []).append(r)
        by_lang.setdefault(r.lang, []).append(r)

    def slice_metrics(items: list[QueryResult]) -> dict[str, float]:
        m = max(len(items), 1)
        return {
            "recall@5": sum(x.recall_at_5 for x in items) / m,
            "recall@8": sum(x.recall_at_8 for x in items) / m,
            "precision@5": sum(x.precision_at_5 for x in items) / m,
            "mrr": sum(x.mrr for x in items) / m,
            "ndcg@5": sum(x.ndcg_at_5 for x in items) / m,
            "correct_doc": sum(1 for x in items if x.correct_doc) / m,
            "correct_page": sum(1 for x in items if x.correct_page) / m,
            "n": float(len(items)),
        }

    return AggregateMetrics(
        recall_at_5=avg("recall_at_5"),
        recall_at_8=avg("recall_at_8"),
        precision_at_5=avg("precision_at_5"),
        mrr=avg("mrr"),
        ndcg_at_5=avg("ndcg_at_5"),
        correct_doc_rate=sum(1 for r in results if r.correct_doc) / n,
        correct_page_rate=sum(1 for r in results if r.correct_page) / n,
        avg_irrelevant_in_top5=sum(r.irrelevant_in_top5 for r in results) / n,
        by_query_type={k: slice_metrics(v) for k, v in sorted(by_type.items())},
        by_lang={k: slice_metrics(v) for k, v in sorted(by_lang.items())},
        n_queries=len(results),
    )
