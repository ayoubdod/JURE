"""
Phase 3 — page-level text extraction & persistence tests (A–N).

Deterministic fixtures; NullOcrEngine with page_texts (no Tesseract).
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
    reprocess_attachment_intelligence,
    retry_attachment_intelligence,
)
from cases.attachment_intelligence.errors import TOO_MANY_CHARS
from cases.attachment_intelligence.locking import claim_for_processing
from cases.attachment_intelligence.ocr_engine import NullOcrEngine, set_ocr_engine_override
from cases.attachment_intelligence.processor import process_attachment_intelligence
from cases.models import Case, CaseAttachment, CaseAttachmentIntelligence, CaseAttachmentPage
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
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
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
    att = CaseAttachment(case=case, uploaded_by=user, original_name=name)
    att.file.save(name, ContentFile(content), save=True)
    return att


@override_settings(ATTACHMENT_OCR_RUNNER="sync", ATTACHMENT_OCR_KEEP_DERIVED=True)
class AttachmentExtractionPhase3Tests(TestCase):
    def setUp(self):
        self.user, self.cabinet = _make_owner("extract-owner@test.com")
        self.case = _make_case(self.cabinet, self.user)
        set_ocr_engine_override(NullOcrEngine(languages=["fra", "ara", "eng"]))
        self.addCleanup(lambda: set_ocr_engine_override(None))

    # A — Native digital PDF
    def test_a_native_digital_persists_page_text(self):
        pdf = _pdf_bytes_with_text(
            ["Contrat de prestation — objet", "Le présent contrat régit…"] * 6
        )
        att = _attach(self.case, self.user, pdf, "digital.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.NOT_NEEDED)
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.READY)
        pages = list(row.pages.order_by("page_number"))
        self.assertEqual(len(pages), 1)
        self.assertEqual(pages[0].extraction_method, CaseAttachmentPage.ExtractionMethod.NATIVE)
        self.assertGreater(pages[0].character_count, 40)
        self.assertIn("Contrat", pages[0].extracted_text)
        self.assertIsNone(pages[0].confidence_score)
        self.assertTrue(row.total_extracted_chars)
        self.assertEqual(row.extraction_version, "1")

    # B — Scanned French
    def test_b_scanned_french_persists_ocr_text(self):
        fr = "Jugement du tribunal de commerce de Casablanca"
        set_ocr_engine_override(NullOcrEngine(languages=["fra"], page_texts=[fr]))
        att = _attach(self.case, self.user, _pdf_bytes_blank_page(), "scan-fr.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.ocr_status, OcrStatus.COMPLETED)
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.READY)
        page = row.pages.get()
        self.assertEqual(page.extraction_method, CaseAttachmentPage.ExtractionMethod.OCR)
        self.assertEqual(page.extracted_text, fr)
        self.assertIn("fra", row.detected_languages)

    # C — Scanned Arabic Unicode
    def test_c_scanned_arabic_preserves_unicode(self):
        ar = "محكمة الاستئناف بالدار البيضاء — حكم عدد 123"
        set_ocr_engine_override(NullOcrEngine(languages=["ara"], page_texts=[ar]))
        att = _attach(self.case, self.user, _pdf_bytes_blank_page(), "scan-ar.pdf")
        row = enqueue_attachment_intelligence(att)
        page = row.pages.get()
        self.assertEqual(page.extracted_text, ar)
        self.assertIn("محكمة", page.extracted_text)

    # D — Mixed PDF methods
    def test_d_mixed_page_methods(self):
        digital = _pdf_bytes_with_text(["Page numérique avec texte légal suffisant."] * 8)
        scanned = _pdf_bytes_blank_page()
        mixed = _merge_pdfs(digital, scanned)
        set_ocr_engine_override(
            NullOcrEngine(
                languages=["fra"],
                page_texts=["ignored-native-page", "Texte OCR page scannée"],
            )
        )
        att = _attach(self.case, self.user, mixed, "mixed.pdf")
        row = enqueue_attachment_intelligence(att)
        pages = list(row.pages.order_by("page_number"))
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0].extraction_method, CaseAttachmentPage.ExtractionMethod.NATIVE)
        self.assertEqual(pages[1].extraction_method, CaseAttachmentPage.ExtractionMethod.OCR)
        self.assertEqual(pages[1].extracted_text, "Texte OCR page scannée")
        self.assertIn("numérique", pages[0].extracted_text)

    # E — Multipage order
    def test_e_multipage_order(self):
        blob = _merge_pdfs(
            _pdf_bytes_with_text(["PAGE-ONE-CONTENT"] * 8),
            _pdf_bytes_with_text(["PAGE-TWO-CONTENT"] * 8),
            _pdf_bytes_with_text(["PAGE-THREE-CONTENT"] * 8),
        )
        att = _attach(self.case, self.user, blob, "multi.pdf")
        row = enqueue_attachment_intelligence(att)
        nums = list(row.pages.order_by("page_number").values_list("page_number", flat=True))
        self.assertEqual(nums, [1, 2, 3])
        texts = list(row.pages.order_by("page_number").values_list("extracted_text", flat=True))
        self.assertIn("PAGE-ONE", texts[0])
        self.assertIn("PAGE-TWO", texts[1])
        self.assertIn("PAGE-THREE", texts[2])

    # F — Empty page
    def test_f_empty_page_handled(self):
        blob = _merge_pdfs(
            _pdf_bytes_with_text(["Has text content here for native extraction."] * 8),
            _pdf_bytes_blank_page(),
        )
        set_ocr_engine_override(NullOcrEngine(page_texts=["", ""]))
        att = _attach(self.case, self.user, blob, "empty-page.pdf")
        row = enqueue_attachment_intelligence(att)
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.READY)
        pages = list(row.pages.order_by("page_number"))
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[1].character_count, 0)
        self.assertEqual(pages[1].extracted_text, "")

    # G — Retry failed extraction
    def test_g_retry_failed_extraction(self):
        set_ocr_engine_override(NullOcrEngine(fail=True))
        att = _attach(self.case, self.user, _pdf_bytes_blank_page(), "retry.pdf")
        row = enqueue_attachment_intelligence(att)
        self.assertEqual(row.ocr_status, OcrStatus.FAILED)
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.FAILED)

        set_ocr_engine_override(
            NullOcrEngine(languages=["eng"], page_texts=["Recovered OCR text after retry"])
        )
        row = retry_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.READY)
        self.assertEqual(row.pages.get().extracted_text, "Recovered OCR text after retry")

    # H — Idempotency
    def test_h_idempotent_no_duplicate_pages(self):
        pdf = _pdf_bytes_with_text(["Stable document text for idempotency."] * 8)
        att = _attach(self.case, self.user, pdf, "idem.pdf")
        row = enqueue_attachment_intelligence(att)
        self.assertEqual(row.pages.count(), 1)
        # Second enqueue must not reschedule / duplicate
        row2 = enqueue_attachment_intelligence(att)
        self.assertEqual(row2.pk, row.pk)
        self.assertEqual(CaseAttachmentPage.objects.filter(intelligence=row).count(), 1)
        # Concurrent claim blocked
        again = process_attachment_intelligence(row.pk)
        self.assertEqual(again.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.READY)
        self.assertEqual(row.pages.count(), 1)

    # I — Content change triggers re-extraction
    def test_i_content_change_reextracts(self):
        att = _attach(
            self.case,
            self.user,
            _pdf_bytes_with_text(["Original version AAA"] * 8),
            "changing.pdf",
        )
        row = enqueue_attachment_intelligence(att)
        old_hash = row.content_hash
        old_text = row.pages.get().extracted_text

        att.file.save(
            "changing.pdf",
            ContentFile(_pdf_bytes_with_text(["Updated version BBB"] * 8)),
            save=True,
        )
        row = reprocess_attachment_intelligence(att, force=True)
        row.refresh_from_db()
        self.assertNotEqual(row.content_hash, old_hash)
        self.assertNotEqual(row.pages.get().extracted_text, old_text)
        self.assertIn("BBB", row.pages.get().extracted_text)
        self.assertEqual(row.pages.count(), 1)

    # J — Original unchanged
    def test_j_original_unchanged(self):
        pdf = _pdf_bytes_with_text(["Do not mutate original bytes"] * 8)
        att = _attach(self.case, self.user, pdf, "orig.pdf")
        before_name = att.file.name
        before = att.file.read()
        att.file.close()
        enqueue_attachment_intelligence(att)
        att.refresh_from_db()
        self.assertEqual(att.file.name, before_name)
        with att.file.open("rb") as fh:
            self.assertEqual(fh.read(), before)

    # K — Deletion cascades
    def test_k_deletion_removes_pages(self):
        att = _attach(
            self.case,
            self.user,
            _pdf_bytes_with_text(["To be deleted"] * 8),
            "delete-me.pdf",
        )
        row = enqueue_attachment_intelligence(att)
        intel_id = row.pk
        self.assertTrue(CaseAttachmentPage.objects.filter(intelligence_id=intel_id).exists())
        att.delete()
        self.assertFalse(CaseAttachmentIntelligence.objects.filter(pk=intel_id).exists())
        self.assertFalse(CaseAttachmentPage.objects.filter(intelligence_id=intel_id).exists())

    # L — No cross-cabinet access
    def test_l_no_cross_cabinet_pages(self):
        other_user, other_cab = _make_owner("other-extract@test.com")
        other_case = _make_case(other_cab, other_user, title="Other")
        att = _attach(
            other_case,
            other_user,
            _pdf_bytes_with_text(["Secret foreign cabinet text"] * 8),
            "secret.pdf",
        )
        enqueue_attachment_intelligence(att)
        api = APIClient()
        api.force_authenticate(user=self.user)
        url = reverse(
            "case-attachment-intelligence-pages",
            kwargs={"pk": other_case.pk, "attachment_id": att.pk},
        )
        resp = api.get(url)
        self.assertIn(resp.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))

    # M — Unauthorized cannot retrieve text
    def test_m_unauthorized_cannot_get_pages(self):
        att = _attach(
            self.case,
            self.user,
            _pdf_bytes_with_text(["Private matter text"] * 8),
            "private.pdf",
        )
        enqueue_attachment_intelligence(att)
        api = APIClient()  # anonymous
        url = reverse(
            "case-attachment-intelligence-pages",
            kwargs={"pk": self.case.pk, "attachment_id": att.pk},
        )
        resp = api.get(url)
        self.assertIn(
            resp.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        # Authenticated owner can read; list attachments still has no extracted_text
        api.force_authenticate(user=self.user)
        ok = api.get(url)
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertGreater(ok.data["count"], 0)
        self.assertIn("extracted_text", ok.data["results"][0])
        list_url = reverse("case-attachments", kwargs={"pk": self.case.pk})
        listing = api.get(list_url)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertTrue(listing.data)
        self.assertNotIn("extracted_text", listing.data[0])

    # N — Large document limits
    @override_settings(ATTACHMENT_EXTRACTION_MAX_TOTAL_CHARS=50)
    def test_n_large_document_respects_limits(self):
        pdf = _pdf_bytes_with_text(["X" * 20] * 10)
        att = _attach(self.case, self.user, pdf, "huge.pdf")
        row = enqueue_attachment_intelligence(att)
        row.refresh_from_db()
        self.assertEqual(row.extraction_status, CaseAttachmentIntelligence.ExtractionStatus.FAILED)
        self.assertEqual(row.processing_error_code, TOO_MANY_CHARS)
        # OCR may still be terminal success while extraction failed
        self.assertEqual(row.ocr_status, OcrStatus.NOT_NEEDED)
        self.assertFalse(row.pages.exists())

    def test_intelligence_metadata_api_excludes_full_text(self):
        att = _attach(
            self.case,
            self.user,
            _pdf_bytes_with_text(["Visible only via pages endpoint"] * 8),
            "meta.pdf",
        )
        enqueue_attachment_intelligence(att)
        api = APIClient()
        api.force_authenticate(user=self.user)
        url = reverse(
            "case-attachment-intelligence",
            kwargs={"pk": self.case.pk, "attachment_id": att.pk},
        )
        resp = api.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn("extracted_text", resp.data)
        self.assertIn("total_extracted_chars", resp.data)
        self.assertEqual(resp.data["extraction_status"], "READY")
