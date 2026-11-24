"""
Index local embeddings for READY case-attachment pages (Phase 5B).

Requires JURIA_EMBEDDINGS_ENABLED=True. Never calls external embedding APIs.

  python manage.py embed_case_attachment_pages
  python manage.py embed_case_attachment_pages --limit 50
  python manage.py embed_case_attachment_pages --force
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Q

from cases.models import CaseAttachmentIntelligence, CaseAttachmentPage
from juria.services.embeddings import embed_pages_for_intelligence, embeddings_enabled


class Command(BaseCommand):
    help = "Embed READY CaseAttachmentPage rows for hybrid retrieval (local models only)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-embed pages that already have vectors.",
        )

    def handle(self, *args, **options):
        if not embeddings_enabled():
            self.stderr.write(
                "JURIA_EMBEDDINGS_ENABLED is False — refusing to embed. "
                "Set the env var and install sentence-transformers for production vectors."
            )
            return

        limit = max(1, int(options["limit"]))
        force = bool(options["force"])
        qs = CaseAttachmentIntelligence.objects.filter(
            extraction_status=CaseAttachmentIntelligence.ExtractionStatus.READY,
        ).order_by("id")

        if not force:
            # Only rows with at least one page missing an embedding.
            missing = (
                CaseAttachmentPage.objects.filter(
                    Q(embedding__isnull=True) | Q(embedding=[]),
                    intelligence_id__in=qs.values_list("id", flat=True),
                )
                .values_list("intelligence_id", flat=True)
                .distinct()
            )
            qs = qs.filter(id__in=missing)

        done = 0
        pages = 0
        for intel_id in qs.values_list("id", flat=True)[:limit]:
            n = embed_pages_for_intelligence(intel_id)
            pages += n
            done += 1
            self.stdout.write(f"intelligence_id={intel_id} pages_embedded={n}")

        self.stdout.write(self.style.SUCCESS(f"Processed {done} document(s), {pages} page vector(s)."))
