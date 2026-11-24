"""Run Phase 5A offline benchmark and return structured results."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .dataset import build_dataset
from .metrics import AggregateMetrics, aggregate, evaluate_query
from .rankers import build_rankers


@dataclass
class RankerReport:
    name: str
    metrics: AggregateMetrics
    weak_query_types: list[str]
    failing_qids: list[str]


@dataclass
class Phase5AReport:
    dataset_name: str
    n_passages: int
    n_queries: int
    phase4_style: RankerReport
    bm25_lexical: RankerReport
    hybrid_proxy: RankerReport
    recommendation: str
    recommendation_detail: str
    embedding_cost_notes: dict[str, Any]
    comparison_vs_phase4_fixture: dict[str, Any]


def _weak_types(agg: AggregateMetrics, threshold: float = 0.55) -> list[str]:
    weak = []
    for qt, m in agg.by_query_type.items():
        if m.get("recall@5", 0) < threshold:
            weak.append(qt)
    return weak


def _failing(results) -> list[str]:
    return [r.qid for r in results if r.recall_at_5 < 1.0 and r.correct_page is False]


def run_phase5a_benchmark(*, limit: int = 8) -> Phase5AReport:
    ds = build_dataset()
    passages = list(ds.passages)
    rankers = build_rankers(passages)
    reports: dict[str, RankerReport] = {}
    raw_results: dict[str, list] = {}

    for ranker in rankers:
        results = []
        for q in ds.queries:
            ranked = ranker.rank(q.query, limit=limit)
            results.append(evaluate_query(q, ranked))
        agg = aggregate(results)
        reports[ranker.name] = RankerReport(
            name=ranker.name,
            metrics=agg,
            weak_query_types=_weak_types(agg),
            failing_qids=_failing(results),
        )
        raw_results[ranker.name] = results

    phase4 = reports["token_overlap_phase4"]
    bm25 = reports["bm25_improved_lexical"]
    hybrid = reports["hybrid_lexical_synonym_proxy"]

    # Decision logic (evidence-based)
    syn_gap = phase4.metrics.by_query_type.get("synonym", {}).get("recall@5", 0)
    para_gap = phase4.metrics.by_query_type.get("paraphrase", {}).get("recall@5", 0)
    exact_ok = phase4.metrics.by_query_type.get("exact", {}).get("recall@5", 0)
    bm25_lift = bm25.metrics.recall_at_5 - phase4.metrics.recall_at_5
    hybrid_lift = hybrid.metrics.recall_at_5 - phase4.metrics.recall_at_5

    if exact_ok >= 0.8 and syn_gap < 0.5 and para_gap < 0.5 and hybrid_lift < 0.15:
        # Strong exact, weak synonym/paraphrase, synonym-proxy hybrid cannot close gap
        recommendation = "CONDITIONAL_GO"
        detail = (
            "Exact keyword retrieval is strong, but synonym/paraphrase recall is weak. "
            "BM25/OCR-folding helps noisy OCR and ranking; synonym expansion only partially "
            "closes the semantic gap. Multilingual embeddings (local-first) are justified "
            "for a hybrid layer — implement only after a controlled pilot (Phase 5B)."
        )
    elif phase4.metrics.recall_at_5 >= 0.85 and syn_gap >= 0.6:
        recommendation = "NO_GO"
        detail = (
            "Keyword/BM25 performance is already high across query types on this corpus. "
            "Defer embeddings; ship improved lexical (BM25) first if production OCR noise warrants it."
        )
    else:
        recommendation = "CONDITIONAL_GO"
        detail = (
            "Material gaps remain on paraphrased and cross-lingual synonym queries. "
            "Recommend Phase 5B hybrid pilot with local multilingual embeddings, "
            "keeping keyword/BM25 as the primary filter for citations and exact terms."
        )

    # Soften if BM25 alone nearly matches hybrid and closes most of OCR gap
    if bm25_lift >= 0.1 and hybrid_lift - bm25_lift < 0.05 and syn_gap >= 0.45:
        recommendation = "NO_GO_EMBEDDINGS_YES_BM25"
        detail = (
            "Improved lexical BM25 captures most available gains on this synthetic set. "
            "Do not introduce embeddings yet; land BM25 in production first, then re-benchmark "
            "on real anonymized firm queries before approving vector search."
        )

    embedding_cost_notes = {
        "models_considered": [
            {
                "name": "intfloat/multilingual-e5-base (local)",
                "langs": "fr/ar/en",
                "dims": 768,
                "privacy": "on-prem / VPC — documents never leave infrastructure",
                "approx_index_bytes_per_1k_pages": "768*4*2k chunks ≈ 6 MB raw + index overhead",
            },
            {
                "name": "BAAI/bge-m3 (local)",
                "langs": "fr/ar/en multilingual",
                "dims": 1024,
                "privacy": "local",
                "notes": "Strong multilingual; heavier GPU/CPU",
            },
            {
                "name": "External API embeddings (OpenAI/Voyage/etc.)",
                "privacy": "NOT recommended for client case files without DPA + residency controls",
                "notes": "Conflicts with Privacy Gateway posture unless Private mode + approved vendor",
            },
        ],
        "storage": "pgvector or separate ANN optional later; ~1–4 KB/chunk + HNSW overhead",
        "indexing": "One-time embed of READY CaseAttachmentPage (+ library) on connect/reprocess",
        "query_cost_local": "CPU/GPU inference per query (~10–50 ms local e5-base) + BM25 merge",
        "query_cost_external": "Avoid for confidential docs; per-1k-token fees + egress risk",
        "reindex": "Required on extraction_version change, synonym model upgrade, or embedding model bump",
        "data_residency": "Prefer local models colocated with MEDIA/Postgres; no raw text to third parties",
    }

    comparison_vs_phase4_fixture = {
        "note": (
            "Phase 4 Django fixture used 5 exact-ish queries and reported Recall@5≥0.8. "
            "Phase 5A expands to synonym/paraphrase/OCR/multi-doc — expect lower overall recall "
            "for token_overlap; that drop is the signal for architecture choice."
        ),
        "phase4_fixture_floor": {"recall@5": 0.8, "precision@5": 0.4},
        "phase5a_token_overlap_recall@5": round(phase4.metrics.recall_at_5, 4),
        "phase5a_bm25_recall@5": round(bm25.metrics.recall_at_5, 4),
        "phase5a_hybrid_proxy_recall@5": round(hybrid.metrics.recall_at_5, 4),
    }

    return Phase5AReport(
        dataset_name=ds.name,
        n_passages=len(ds.passages),
        n_queries=len(ds.queries),
        phase4_style=phase4,
        bm25_lexical=bm25,
        hybrid_proxy=hybrid,
        recommendation=recommendation,
        recommendation_detail=detail,
        embedding_cost_notes=embedding_cost_notes,
        comparison_vs_phase4_fixture=comparison_vs_phase4_fixture,
    )


def report_to_dict(report: Phase5AReport) -> dict[str, Any]:
    def metrics_dict(m: AggregateMetrics) -> dict[str, Any]:
        return {
            "recall@5": round(m.recall_at_5, 4),
            "recall@8": round(m.recall_at_8, 4),
            "precision@5": round(m.precision_at_5, 4),
            "mrr": round(m.mrr, 4),
            "ndcg@5": round(m.ndcg_at_5, 4),
            "correct_doc_rate": round(m.correct_doc_rate, 4),
            "correct_page_rate": round(m.correct_page_rate, 4),
            "avg_irrelevant_in_top5": round(m.avg_irrelevant_in_top5, 4),
            "by_query_type": {
                k: {sk: round(sv, 4) if isinstance(sv, float) else sv for sk, sv in v.items()}
                for k, v in m.by_query_type.items()
            },
            "by_lang": {
                k: {sk: round(sv, 4) if isinstance(sv, float) else sv for sk, sv in v.items()}
                for k, v in m.by_lang.items()
            },
            "n_queries": m.n_queries,
        }

    def ranker_dict(r: RankerReport) -> dict[str, Any]:
        return {
            "name": r.name,
            "metrics": metrics_dict(r.metrics),
            "weak_query_types": r.weak_query_types,
            "failing_qids_sample": r.failing_qids[:12],
        }

    return {
        "dataset_name": report.dataset_name,
        "n_passages": report.n_passages,
        "n_queries": report.n_queries,
        "rankers": {
            "token_overlap_phase4": ranker_dict(report.phase4_style),
            "bm25_improved_lexical": ranker_dict(report.bm25_lexical),
            "hybrid_lexical_synonym_proxy": ranker_dict(report.hybrid_proxy),
        },
        "recommendation": report.recommendation,
        "recommendation_detail": report.recommendation_detail,
        "embedding_cost_notes": report.embedding_cost_notes,
        "comparison_vs_phase4_fixture": report.comparison_vs_phase4_fixture,
    }
