"""
Phase 2 — Case attachment OCR / intelligence tests (A–I).

Uses deterministic PDF fixtures and a NullOcrEngine — no Tesseract downloads.
"""

from __future__ import annotations

import io
import uuid

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.urls import reverse
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import status
from rest_framework.test import APIClient

from cabinets.models import Cabinet
from cases.attachment_intelligence import (
    enqueue_attachment_intelligence,
    retry_attachment_intelligence,
)
from cases.attachment_intelligence.errors import CORRUPT_PDF, LOCKED, AttachmentIntelligenceError
from cases.attachment_intelligence.locking import claim_for_processing
from cases.attachment_intelligence.ocr_engine import NullOcrEngine, set_ocr_engine_override
from cases.attachment_intelligence.processor import process_attachment_intelligence
from cases.models import Case, CaseAttachment, CaseAttachmentIntelligence
from juria.constants import OcrStatus

User = get_user_model()


def _valid_phone():
    return f"+3361{uuid.uuid4().int % 10**7:07d}"


def _make_owner(email: str):
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=_valid_phone(),
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name="Test Cabinet",
        business_address="123 Test St",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = "OWNER"
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet


def _make_case(cabinet, user, *, title="Matter"):
    return Case.objects.create(
        cabinet=cabinet,
        created_by=user,
        assigned_to=user,
        title=title,
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


def _pdf_bytes_with_text(lines: list[str]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    for line in lines:
        c.drawString(72, y, line)
        y -= 18
    c.showPage()
    c.save()
    return buf.getvalue()


def _pdf_bytes_blank_page() -> bytes:
    """Image-only / empty text page (scanned stand-in)."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    # Draw a filled rectangle only — no text operators → extract_text() is empty.
    c.setFillGray(0.9)
    c.rect(50, 50, 400, 700, fill=1, stroke=0)
    c.showPage()
    c.save()
    return buf.getvalue()


def _merge_pdfs(*blobs: bytes) -> bytes:
    writer = PdfWriter()
    for blob in blobs:
        reader = PdfReader(io.BytesIO(blob))
        for page in reader.pages:
            writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _attach(case, user, content: bytes, name: str) -> CaseAttachment:
    att = CaseAttachment(
        case=case,
        uploaded_by=user,
        original_name=name,
    )
    att.file.save(name, ContentFile(content), save=True)
    return att


@override_settings(ATTACHMENT_OCR_RUNNER="sync", ATTACHMENT_OCR_KEEP_DERIVED=True)
class AttachmentIntelligenceTests(TestCase):
    def setUp(self):
        self.user, self.cabinet = _make_owner("ocr-owner@test.com")
        self.case = _make_case(self.cabinet, self.user)
        set_ocr_engine_override(NullOcrEngine(languages=["fra", "ara", "eng"]))
        self.addCleanup(lambda: set_ocr_engine_override(None))

    # A — Native digital PDF: OCR unnecessary
    def test_a_native_digital_pdf_not_needed(self):
        pdf = _pdf_bytes_with_text(
            ["Contrat de prestation", "Article 1 — Objet", "Le présent contrat…"] * 5
        )
        att = _attach(self.case, self.user, pdf, "digital-fr.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.NOT_NEEDED)
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.READY)
        self.assertFalse(row.is_scanned)
        self.assertEqual(row.scanned_page_count, 0)
        self.assertTrue(row.content_hash)
        self.assertFalse(row.derived_ocr_file)

    # B — Scanned French PDF
    def test_b_scanned_french_pdf_completes(self):
        set_ocr_engine_override(NullOcrEngine(languages=["fra"]))
        pdf = _pdf_bytes_blank_page()
        att = _attach(self.case, self.user, pdf, "scan-fr.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.COMPLETED)
        self.assertTrue(row.is_scanned)
        self.assertIn("fra", row.detected_languages)
        self.assertEqual(row.ocr_engine, "null")
        self.assertTrue(row.derived_ocr_file)

    # C — Scanned Arabic PDF
    def test_c_scanned_arabic_pdf_completes(self):
        set_ocr_engine_override(NullOcrEngine(languages=["ara"]))
        pdf = _pdf_bytes_blank_page()
        att = _attach(self.case, self.user, pdf, "scan-ar.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.COMPLETED)
        self.assertIn("ara", row.detected_languages)

    # D — Mixed digital/scanned: only scanned pages require OCR
    def test_d_mixed_pdf_only_scanned_pages_need_ocr(self):
        mixed = _merge_pdfs(
            _pdf_bytes_with_text(["Page numérique avec texte suffisant pour analyse."] * 8),
            _pdf_bytes_blank_page(),
        )
        att = _attach(self.case, self.user, mixed, "mixed.pdf")
        from cases.attachment_intelligence.pdf_analysis import analyze_pdf
        from cases.attachment_intelligence.files import materialize_upload, temporary_workdir

        with temporary_workdir() as d:
            path = materialize_upload(att.file, d / "x.pdf")
            analysis = analyze_pdf(str(path))
        self.assertTrue(analysis.is_mixed)
        self.assertEqual(analysis.scanned_page_count, 1)
        self.assertEqual(analysis.pages_needing_ocr, [2])
        self.assertTrue(analysis.needs_ocr)

        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.COMPLETED)
        self.assertEqual(row.scanned_page_count, 1)
        self.assertEqual(row.page_count, 2)

    # E — Corrupted PDF fails safely
    def test_e_corrupted_pdf_fails_safely(self):
        att = _attach(self.case, self.user, b"%PDF-1.4 not-a-real-pdf <<<", "bad.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.FAILED)
        self.assertEqual(row.processing_error_code, CORRUPT_PDF)
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.FAILED)

    # F — Duplicate concurrent processing: only one active job
    def test_f_duplicate_processing_only_one_active(self):
        pdf = _pdf_bytes_blank_page()
        att = _attach(self.case, self.user, pdf, "dup.pdf")
        row = CaseAttachmentIntelligence.objects.create(
            attachment=att,
            extraction_status=CaseAttachmentIntelligence.ExtractionStatus.PENDING,
            ocr_status=OcrStatus.PENDING,
        )
        claimed = claim_for_processing(row.pk)
        self.assertEqual(claimed.ocr_status, OcrStatus.RUNNING)
        with self.assertRaises(AttachmentIntelligenceError) as ctx:
            claim_for_processing(row.pk)
        self.assertEqual(ctx.exception.code, LOCKED)

        # process while RUNNING should no-op without double-complete chaos
        again = process_attachment_intelligence(row.pk)
        self.assertEqual(again.ocr_status, OcrStatus.RUNNING)

    # G — Failed processing can be retried
    def test_g_retry_failed_processing(self):
        set_ocr_engine_override(NullOcrEngine(fail=True))
        pdf = _pdf_bytes_blank_page()
        att = _attach(self.case, self.user, pdf, "retry.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.FAILED)

        set_ocr_engine_override(NullOcrEngine(languages=["eng"]))
        row = retry_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.COMPLETED)
        self.assertEqual(row.processing_error_code, "")

    # H — Original attachment remains unchanged
    def test_h_original_attachment_unchanged(self):
        pdf = _pdf_bytes_blank_page()
        att = _attach(self.case, self.user, pdf, "orig.pdf")
        before_name = att.file.name
        before_bytes = att.file.read()
        att.file.close()
        enqueue_attachment_intelligence(att)
        att.refresh_from_db()
        self.assertEqual(att.file.name, before_name)
        with att.file.open("rb") as fh:
            after_bytes = fh.read()
        self.assertEqual(before_bytes, after_bytes)

    # I — Tenant security: no cross-cabinet access
    def test_i_tenant_security_no_cross_cabinet(self):
        other_user, other_cab = _make_owner("other-ocr@test.com")
        other_case = _make_case(other_cab, other_user, title="Other")
        pdf = _pdf_bytes_with_text(["secret matter document text"] * 5)
        att = _attach(other_case, other_user, pdf, "secret.pdf")
        enqueue_attachment_intelligence(att)

        api = APIClient()
        api.force_authenticate(user=self.user)
        url = reverse(
            "case-attachment-intelligence",
            kwargs={"pk": other_case.pk, "attachment_id": att.pk},
        )
        # Case queryset is cabinet-scoped → 404 for foreign case
        resp = api.get(url)
        self.assertIn(resp.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))

        # Own cabinet can read intelligence
        own = _attach(self.case, self.user, pdf, "own.pdf")
        enqueue_attachment_intelligence(own)
        own_url = reverse(
            "case-attachment-intelligence",
            kwargs={"pk": self.case.pk, "attachment_id": own.pk},
        )
        own_resp = api.get(own_url)
        self.assertEqual(own_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(own_resp.data["ocr_status"], OcrStatus.NOT_NEEDED)
        self.assertNotIn("extracted_text", own_resp.data)
