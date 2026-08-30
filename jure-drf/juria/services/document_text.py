"""Extract text from uploaded files and build a minimal .docx for drafts."""

from __future__ import annotations

import base64
import io
import zipfile
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

MAX_EXTRACT_CHARS = 80_000
_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


class DocumentTextError(Exception):
    """Raised when a PDF/DOCX has no extractable text."""


def extract_document_pages(file_path: str, file_type: str) -> list[dict]:
    """Return [{page: int, text: str}, ...] without raising on empty scanned PDFs."""
    kind = (file_type or "").lower().strip()
    if kind == "pdf":
        return _extract_pdf_pages(file_path)
    if kind in ("docx", "doc"):
        text = _extract_docx(file_path)
        return [{"page": 1, "text": text or ""}]
    raise DocumentTextError("Unsupported file type. Use PDF or DOCX.")


def extract_document_text(file_path: str, file_type: str) -> str:
    kind = (file_type or "").lower().strip()
    if kind == "pdf":
        pages = _extract_pdf_pages(file_path)
        text = "\n".join(p.get("text") or "" for p in pages)
    elif kind in ("docx", "doc"):
        text = _extract_docx(file_path)
    else:
        raise DocumentTextError("Unsupported file type. Use PDF or DOCX.")

    text = (text or "").strip()
    if not text:
        raise DocumentTextError(
            "No extractable text in this file. If it is a scanned PDF, OCR is required."
        )
    if len(text) > MAX_EXTRACT_CHARS:
        text = text[:MAX_EXTRACT_CHARS] + "\n\n[Document tronqué pour l'analyse.]"
    return text


def text_to_docx_base64(text: str) -> str:
    """Build a minimal Word document from plain text (no extra dependency)."""
    lines = (text or "").splitlines() or [""]
    paragraphs = "".join(
        f'<w:p><w:r><w:t xml:space="preserve">{escape(line)}</w:t></w:r></w:p>'
        for line in lines
    )
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{_W_NS}">'
        f"<w:body>{paragraphs}<w:sectPr/></w:body></w:document>"
    )
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _extract_pdf_pages(file_path: str) -> list[dict]:
    from pypdf import PdfReader

    try:
        reader = PdfReader(file_path)
    except Exception as exc:
        raise DocumentTextError("Unable to read this PDF.") from exc
    if getattr(reader, "is_encrypted", False):
        try:
            reader.decrypt("")
        except Exception as exc:
            raise DocumentTextError("This PDF is password-protected.") from exc
    pages: list[dict] = []
    for index, page in enumerate(reader.pages, start=1):
        pages.append({"page": index, "text": page.extract_text() or ""})
    return pages


def _extract_pdf(file_path: str) -> str:
    return "\n".join(p.get("text") or "" for p in _extract_pdf_pages(file_path))


def _extract_docx(file_path: str) -> str:
    try:
        with zipfile.ZipFile(file_path) as zf:
            xml_bytes = zf.read("word/document.xml")
    except KeyError as exc:
        raise DocumentTextError("This Word file has no readable document.xml.") from exc
    except zipfile.BadZipFile as exc:
        raise DocumentTextError("This Word file could not be opened. Export as .docx.") from exc
    root = ET.fromstring(xml_bytes)
    texts = [node.text for node in root.iter(f"{{{_W_NS}}}t") if node.text]
    return "\n".join(texts)
