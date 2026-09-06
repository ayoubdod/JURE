"""Export artifacts to DOCX, PDF, TXT, Markdown, RTF, ODT."""

from __future__ import annotations

import html
import io
import os
import re
import zipfile
from functools import lru_cache
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from juria.services.document_text import text_to_docx_bytes


def _plain_from_html(value: str) -> str:
    text = re.sub(r"(?i)<br\s*/?>", "\n", value or "")
    text = re.sub(r"(?i)</p\s*>", "\n\n", text)
    text = re.sub(r"(?i)</div\s*>", "\n", text)
    text = re.sub(r"(?i)</h[1-6]\s*>", "\n\n", text)
    text = re.sub(r"(?i)</li\s*>", "\n", text)
    text = re.sub(r"(?i)<li[^>]*>", "• ", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def artifact_plain_text(artifact) -> str:
    # Prefer HTML from the editor canvas; markdown can be stale/empty after HTML-only saves.
    if artifact.content_html:
        return _plain_from_html(artifact.content_html)
    if artifact.content_markdown:
        return artifact.content_markdown
    return ""


def export_bytes(artifact, fmt: str) -> tuple[bytes, str, str]:
    """Return (content, content_type, filename)."""
    title = re.sub(r"[^\w.\-]+", "_", artifact.title or "document", flags=re.UNICODE).strip("._") or "document"
    body = artifact_plain_text(artifact)
    fmt = (fmt or "docx").lower()

    if fmt in ("md", "markdown"):
        return (artifact.content_markdown or body).encode("utf-8"), "text/markdown; charset=utf-8", f"{title}.md"
    if fmt == "txt":
        return body.encode("utf-8"), "text/plain; charset=utf-8", f"{title}.txt"
    if fmt == "html":
        html_doc = artifact.content_html or f"<pre>{escape(body)}</pre>"
        return html_doc.encode("utf-8"), "text/html; charset=utf-8", f"{title}.html"
    if fmt == "rtf":
        rtf = _to_rtf(body)
        return rtf.encode("utf-8"), "application/rtf", f"{title}.rtf"
    if fmt == "odt":
        return _to_odt(body, artifact.title), "application/vnd.oasis.opendocument.text", f"{title}.odt"
    if fmt == "pdf":
        return _to_pdf(body, artifact.title), "application/pdf", f"{title}.pdf"
    # default docx — complete OOXML package
    raw = text_to_docx_bytes(body)
    return raw, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", f"{title}.docx"


def _to_rtf(text: str) -> str:
    """RTF with Unicode escapes so French/Arabic survive."""
    parts = [r"{\rtf1\ansi\deff0\uc1{\fonttbl{\f0 Times New Roman;}}\f0\fs24 "]
    for ch in text or "":
        if ch == "\\":
            parts.append(r"\\")
        elif ch == "{":
            parts.append(r"\{")
        elif ch == "}":
            parts.append(r"\}")
        elif ch == "\n":
            parts.append(r"\par" "\n")
        elif ord(ch) < 128:
            parts.append(ch)
        else:
            parts.append(f"\\u{ord(ch)}?")
    parts.append("}")
    return "".join(parts)


def _to_odt(text: str, title: str) -> bytes:
    paragraphs = "".join(
        f'<text:p text:style-name="Standard">{escape(line)}</text:p>'
        for line in (text or "").splitlines() or [""]
    )
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body><office:text>{paragraphs}</office:text></office:body>
</office:document-content>"""
    meta = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:dc="http://purl.org/dc/elements/1.1/">
  <office:meta><dc:title>{escape(title or "document")}</dc:title></office:meta>
</office:document-meta>"""
    manifest = """<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("mimetype", "application/vnd.oasis.opendocument.text", compress_type=zipfile.ZIP_STORED)
        zf.writestr("content.xml", content)
        zf.writestr("meta.xml", meta)
        zf.writestr("META-INF/manifest.xml", manifest)
    return buf.getvalue()


@lru_cache(maxsize=1)
def _pdf_font_name() -> str:
    """Register a Unicode TTF so French accents (and Arabic when available) render."""
    candidates = [
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "arial.ttf"),
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "segoeui.ttf"),
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "times.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont("JuriaExport", path))
                return "JuriaExport"
            except Exception:
                continue
    return "Helvetica"


def _to_pdf(text: str, title: str) -> bytes:
    buf = io.BytesIO()
    font = _pdf_font_name()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "JuriaTitle",
        parent=styles["Title"],
        fontName=font,
        fontSize=16,
        leading=20,
        spaceAfter=12,
    )
    body_style = ParagraphStyle(
        "JuriaBody",
        parent=styles["BodyText"],
        fontName=font,
        fontSize=11,
        leading=15,
        spaceAfter=4,
    )
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        title=title or "document",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    story = [Paragraph(escape(title or "Document"), title_style), Spacer(1, 6 * mm)]
    for line in (text or "").splitlines() or [""]:
        story.append(Paragraph(escape(line) or "&nbsp;", body_style))
    doc.build(story)
    return buf.getvalue()
