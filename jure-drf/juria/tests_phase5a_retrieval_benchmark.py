"""
Phase 5A — offline retrieval quality assessment tests.

Does not modify production retrieval. Asserts benchmark runs and records metrics.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.test import SimpleTestCase

from juria.benchmarks.dataset import build_dataset
from juria.benchmarks.runner import report_to_dict, run_phase5a_benchmark


class Phase5ABenchmarkTests(SimpleTestCase):
    def test_dataset_covers_required_query_types_and_langs(self):
        ds = build_dataset()
        types = {q.query_type for q in ds.queries}
        for required in (
            "exact",
            "synonym",
            "paraphrase",
            "natural",
            "incomplete",
            "multi_doc",
            "noisy_ocr",
            "multi_page",
        ):
            self.assertIn(required, types)
        langs = {q.lang for q in ds.queries}
        self.assertTrue({"fr", "ar", "en"}.issubset(langs))
        domains = {p.domain for p in ds.passages}
        self.assertTrue(
            {"contract", "litigation", "employment", "corporate", "regulatory"}.issubset(domains)
        )
        self.assertGreaterEqual(len(ds.queries), 20)
        self.assertGreaterEqual(len(ds.passages), 15)

    def test_run_benchmark_and_persist_json(self):
        report = run_phase5a_benchmark()
        data = report_to_dict(report)

        # Sanity: all rankers produce metrics
        for key in (
            "token_overlap_phase4",
            "bm25_improved_lexical",
            "hybrid_lexical_synonym_proxy",
        ):
            m = data["rankers"][key]["metrics"]
            self.assertIn("recall@5", m)
            self.assertIn("mrr", m)
            self.assertIn("ndcg@5", m)
            self.assertGreaterEqual(m["n_queries"], 20)

        # Exact queries should remain relatively strong for lexical methods
        exact_r = data["rankers"]["token_overlap_phase4"]["metrics"]["by_query_type"]["exact"][
            "recall@5"
        ]
        self.assertGreaterEqual(exact_r, 0.5)

        # Persist artifact for the decision report / canvas
        out = Path(__file__).resolve().parent / "benchmarks" / "phase5a_results.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        self.assertTrue(out.is_file())

        # Recommendation must be one of the allowed decisions
        self.assertIn(
            data["recommendation"],
            {
                "GO",
                "NO_GO",
                "CONDITIONAL_GO",
                "NO_GO_EMBEDDINGS_YES_BM25",
            },
        )
