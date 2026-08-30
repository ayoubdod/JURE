"""Export artifacts to DOCX, PDF, TXT, Markdown, RTF, ODT."""

from __future__ import annotations

import html
import io
import re
import zipfile
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from juria.services.document_text import text_to_docx_base64


def _plain_from_html(value: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", value or "", flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"</h[1-6]>", "\n\n", text, flags=re.I)
    text = re.sub(r"<li>", "• ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()


def artifact_plain_text(artifact) -> str:
    if artifact.content_markdown:
        return artifact.content_markdown
    if artifact.content_html:
        return _plain_from_html(artifact.content_html)
    return ""


def export_bytes(artifact, fmt: str) -> tuple[bytes, str, str]:
    """Return (content, content_type, filename)."""
    title = re.sub(r"[^\w.\-]+", "_", artifact.title or "document", flags=re.UNICODE).strip("._") or "document"
    body = artifact_plain_text(artifact)
    fmt = (fmt or "docx").lower()

    if fmt in ("md", "markdown"):
        return (artifact.content_markdown or body).encode("utf-8"), "text/markdown", f"{title}.md"
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
    # default docx
    import base64

    raw = base64.b64decode(text_to_docx_base64(body))
    return raw, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", f"{title}.docx"


def _to_rtf(text: str) -> str:
    escaped = (
        (text or "")
        .replace("\\", "\\\\")
        .replace("{", "\\{")
        .replace("}", "\\}")
        .replace("\n", "\\par\n")
    )
    return r"{\rtf1\ansi\deff0{\fonttbl{\f0 Times New Roman;}}\f0\fs24 " + escaped + "}"


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


def _to_pdf(text: str, title: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=title or "document", leftMargin=18 * mm, rightMargin=18 * mm)
    styles = getSampleStyleSheet()
    story = [Paragraph(escape(title or "Document"), styles["Title"]), Spacer(1, 8 * mm)]
    for line in (text or "").splitlines() or [""]:
        story.append(Paragraph(escape(line) or "&nbsp;", styles["BodyText"]))
        story.append(Spacer(1, 2 * mm))
    doc.build(story)
    return buf.getvalue()
