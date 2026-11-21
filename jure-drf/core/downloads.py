"""Authenticated FileResponse helpers for private uploads."""

from __future__ import annotations

from pathlib import Path

from django.http import FileResponse, Http404

PREVIEWABLE_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt"}
BLOCKED_UPLOAD_EXTENSIONS = {
    ".svg",
    ".html",
    ".htm",
    ".xhtml",
    ".js",
    ".mjs",
    ".css",
    ".xml",
}


def safe_filename(name: str | None, fallback: str = "file") -> str:
    raw = (name or "").strip() or fallback
    base = Path(raw).name.replace("\\", "_").replace("/", "_")
    return base or fallback


def serve_file_field(
    request,
    file_field,
    *,
    filename: str | None = None,
    content_type: str | None = None,
    force_attachment: bool = False,
):
    """Stream a Django FileField after the caller has authorized access."""
    if not file_field:
        raise Http404()
    try:
        fh = file_field.open("rb")
    except Exception as exc:
        raise Http404() from exc

    display_name = safe_filename(filename or getattr(file_field, "name", None))
    inline = str(request.query_params.get("inline", "")).lower() in ("1", "true", "yes")
    suffix = Path(display_name).suffix.lower()
    as_attachment = force_attachment or not (inline and suffix in PREVIEWABLE_SUFFIXES)

    response = FileResponse(fh, as_attachment=as_attachment, filename=display_name)
    if content_type:
        response["Content-Type"] = content_type
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store"
    return response


def absolute_api_url(request, path: str) -> str:
    if not path:
        return path
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if request is None:
        return path
    return request.build_absolute_uri(path)
