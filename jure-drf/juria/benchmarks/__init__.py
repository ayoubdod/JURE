"""
Phase 5A — isolated retrieval quality assessment.

Does NOT modify production retrieval. Offline corpus + rankers only.
"""

from .runner import run_phase5a_benchmark

__all__ = ["run_phase5a_benchmark"]
