"""Extract text from uploaded files and build a minimal .docx for drafts."""

from __future__ import annotations

import base64
import io
import re
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


def text_to_docx_base64(text: str, *, rtl: bool = False) -> str:
    """Build a Word-compatible .docx (OOXML) and return it as base64."""
    return base64.b64encode(text_to_docx_bytes(text, rtl=rtl)).decode("ascii")


def text_to_docx_bytes(text: str, *, rtl: bool = False) -> bytes:
    """Build a complete OOXML package that Word / LibreOffice can open."""
    lines = (text or "").splitlines() or [""]
    paragraphs = "".join(_paragraph_xml(line, rtl=rtl) for line in lines)
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{_W_NS}" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<w:body>{paragraphs}"
        "<w:sectPr>"
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" '
        'w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
        "</w:body></w:document>"
    )
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    document_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""
    styles = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{_W_NS}">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
      <w:lang w:val="fr-FR" w:bidi="ar-MA"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>
"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/_rels/document.xml.rels", document_rels)
        zf.writestr("word/styles.xml", styles)
    return buf.getvalue()


_ILLEGAL_XML_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _paragraph_xml(line: str, *, rtl: bool = False) -> str:
    ppr = "<w:pPr><w:bidi/></w:pPr>" if rtl else ""
    return f"<w:p>{ppr}{_runs_xml(line)}</w:p>"


def _runs_xml(line: str) -> str:
    """Plain text runs for Word. Markdown markers are stripped (content is pre-cleaned)."""
    text = line or ""
    text = re.sub(r"^#{1,6}\s*", "", text)
    text = re.sub(r"\*\*(.+?)\*\*|__(.+?)__", lambda m: m.group(1) or m.group(2) or "", text)
    text = re.sub(r"[*#`~]+", "", text)
    text = _ILLEGAL_XML_CHARS.sub("", text)
    return f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


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
