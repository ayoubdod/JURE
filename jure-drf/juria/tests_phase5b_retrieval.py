"""Phase 5B — BM25 production scoring + optional hybrid embeddings (local stub)."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from cabinets.models import Cabinet
from cases.models import (
    Case,
    CaseAttachment,
    CaseAttachmentIntelligence,
    CaseAttachmentPage,
)
from juria.constants import OcrStatus, SourceKind
from juria.services.embeddings import (
    HashEmbeddingProvider,
    embed_pages_for_intelligence,
    set_embedding_provider_override,
)
from juria.services.retrieval import retrieve_for_query
from juria.services.sources import connect_case, connect_case_documents
from juria.services.workspace import create_project

User = get_user_model()


def _phone():
    return f"+3361{uuid.uuid4().int % 10**7:07d}"


def _owner(email: str):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=_phone(),
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user, trade_name="Cab", business_address="1 Rue Test"
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet


def _case(cabinet, user):
    return Case.objects.create(
        cabinet=cabinet,
        created_by=user,
        assigned_to=user,
        title="Matter",
        description="Desc",
        court="",
        reference=f"C-{uuid.uuid4().hex[:8].upper()}",
        case_type=Case.CaseType.CONSULTATION,
        status=Case.CaseStatus.OPEN,
        case_specific_data={
            "consultationType": "PREVENTIVE",
            "legalDomain": "CORPORATE",
            "consultationDate": "2026-08-26T10:00:00",
            "durationMinutes": 60,
            "format": "VIDEO",
            "legalQuestion": "Q?",
            "outcome": "SCHEDULED",
        },
    )


def _ready(att, pages, *, ocr=OcrStatus.NOT_NEEDED, scanned=False):
    intel, _ = CaseAttachmentIntelligence.objects.update_or_create(
        attachment=att,
        defaults={
            "extraction_status": CaseAttachmentIntelligence.ExtractionStatus.READY,
            "ocr_status": ocr,
            "is_scanned": scanned,
            "page_count": len(pages),
            "total_extracted_chars": sum(len(t) for _, t, _ in pages),
            "extraction_version": "1",
            "content_hash": uuid.uuid4().hex,
        },
    )
    CaseAttachmentPage.objects.filter(intelligence=intel).delete()
    CaseAttachmentPage.objects.bulk_create(
        [
            CaseAttachmentPage(
                intelligence=intel,
                page_number=n,
                extracted_text=t,
                extraction_method=m,
                character_count=len(t),
            )
            for n, t, m in pages
        ]
    )
    return intel


@override_settings(JURIA_RETRIEVAL_SCORER="bm25")
class Phase5BBm25RetrievalTests(TestCase):
    def setUp(self):
        self.user, self.cabinet = _owner("p5b@test.com")
        self.case = _case(self.cabinet, self.user)
        self.project = create_project(
            cabinet=self.cabinet,
            owner=self.user,
            name="P5B",
            linked_case=self.case,
        )
        connect_case(self.project, self.case, self.user)

    def test_bm25_retrieves_noisy_ocr_clause(self):
        att = CaseAttachment(case=self.case, uploaded_by=self.user, original_name="scan.pdf")
        att.file.save("scan.pdf", ContentFile(b"%PDF-1.4"), save=True)
        _ready(
            att,
            [
                (
                    1,
                    "Cl@use de résiIiation anticlpée — préavls de trentc (30) j0urs.",
                    CaseAttachmentPage.ExtractionMethod.OCR,
                )
            ],
            ocr=OcrStatus.COMPLETED,
            scanned=True,
        )
        connect_case_documents(self.project, [att.id], self.user)
        hits = retrieve_for_query(self.project, "résiliation anticipée préavis trente jours")
        self.assertTrue(hits)
        self.assertEqual(hits[0]["metadata"].get("scorer"), "bm25")
        self.assertEqual(hits[0]["document_id"], str(att.id))

    def test_bm25_exact_clause_still_works(self):
        att = CaseAttachment(case=self.case, uploaded_by=self.user, original_name="c.pdf")
        att.file.save("c.pdf", ContentFile(b"%PDF-1.4"), save=True)
        _ready(
            att,
            [
                (
                    4,
                    "Article 12 — Résiliation anticipée. Préavis écrit de trente jours.",
                    CaseAttachmentPage.ExtractionMethod.NATIVE,
                )
            ],
        )
        connect_case_documents(self.project, [att.id], self.user)
        hits = retrieve_for_query(self.project, "résiliation anticipée trente jours")
        self.assertTrue(hits)
        self.assertEqual(hits[0]["page"], 4)


@override_settings(
    JURIA_RETRIEVAL_SCORER="bm25",
    JURIA_EMBEDDINGS_ENABLED=True,
    JURIA_HYBRID_RETRIEVAL=True,
    JURIA_EMBEDDING_BACKEND="hash",
)
class Phase5BHybridPlumbingTests(TestCase):
    def setUp(self):
        set_embedding_provider_override(HashEmbeddingProvider(dim=32))
        self.addCleanup(lambda: set_embedding_provider_override(None))
        self.user, self.cabinet = _owner("p5b-hyb@test.com")
        self.case = _case(self.cabinet, self.user)
        self.project = create_project(
            cabinet=self.cabinet,
            owner=self.user,
            name="P5B Hybrid",
            linked_case=self.case,
        )
        connect_case(self.project, self.case, self.user)

    def test_hybrid_uses_stored_embeddings(self):
        att = CaseAttachment(case=self.case, uploaded_by=self.user, original_name="h.pdf")
        att.file.save("h.pdf", ContentFile(b"%PDF-1.4"), save=True)
        intel = _ready(
            att,
            [
                (
                    1,
                    "Liquidated damages apply for each week of delay.",
                    CaseAttachmentPage.ExtractionMethod.NATIVE,
                )
            ],
        )
        n = embed_pages_for_intelligence(intel.pk)
        self.assertEqual(n, 1)
        page = intel.pages.get()
        self.assertTrue(page.embedding)
        connect_case_documents(self.project, [att.id], self.user)
        hits = retrieve_for_query(self.project, "liquidated damages delay")
        self.assertTrue(hits)
        self.assertEqual(hits[0]["metadata"].get("scorer"), "hybrid_bm25_embedding")
        self.assertIn("bm25", hits[0]["metadata"])
