"""
Middleware so Library media (PDFs, DOCX) can be previewed by the SPA.

The frontend is a different origin (Vite / production app). Django's
XFrameOptionsMiddleware defaults to DENY, which blanks PDF iframes.
This middleware must run process_response *after* XFrameOptionsMiddleware,
i.e. it must appear *before* it in settings.MIDDLEWARE.
"""
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


PREVIEWABLE_SUFFIXES = (".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")


def _allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    allowed = getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []
    if origin in allowed:
        return True
    if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False):
        return True
    return bool(getattr(settings, "DEBUG", False))


def _frame_ancestors() -> str:
    origins = [
        origin
        for origin in (getattr(settings, "CORS_ALLOWED_ORIGINS", []) or [])
        if isinstance(origin, str) and origin.startswith("http")
    ]
    return " ".join(["'self'", *origins])


def _apply_cors(request, response):
    origin = request.META.get("HTTP_ORIGIN", "")
    if origin and _allowed_origin(origin):
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Vary"] = "Origin"
    response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"


class PDFHeadersMiddleware(MiddlewareMixin):
    """Allow the JURE frontend to fetch and embed library media files."""

    def process_request(self, request):
        if request.method != "OPTIONS":
            return None
        if not request.path.startswith(settings.MEDIA_URL):
            return None
        response = HttpResponse()
        _apply_cors(request, response)
        response["Access-Control-Max-Age"] = "86400"
        return response

    def process_response(self, request, response):
        if not request.path.startswith(settings.MEDIA_URL):
            return response

        _apply_cors(request, response)

        # Cross-origin SPA preview: DENY/SAMEORIGIN both block localhost:5173 → :8000.
        if "X-Frame-Options" in response:
            del response["X-Frame-Options"]

        ancestors = _frame_ancestors()
        existing = response.get("Content-Security-Policy", "")
        if "frame-ancestors" in existing:
            parts = [
                part
                for part in existing.split(";")
                if part.strip() and not part.strip().startswith("frame-ancestors")
            ]
            parts.append(f"frame-ancestors {ancestors}")
            response["Content-Security-Policy"] = "; ".join(p.strip() for p in parts if p.strip())
        elif existing:
            response["Content-Security-Policy"] = f"{existing}; frame-ancestors {ancestors}"
        else:
            response["Content-Security-Policy"] = f"frame-ancestors {ancestors}"

        path = request.path.lower()
        if path.endswith(".pdf") and not (response.get("Content-Type") or "").startswith("application/pdf"):
            response["Content-Type"] = "application/pdf"

        if path.endswith(PREVIEWABLE_SUFFIXES):
            response["X-Content-Type-Options"] = "nosniff"

        return response
