import os

from django.conf import settings
from django.http import JsonResponse, HttpResponseNotFound
from django.views.decorators.http import require_GET


@require_GET
def root(request):
    """Public service discovery / readiness payload for the API root."""
    return JsonResponse(
        {
            "status": "ok",
            "application": "JURE API",
            "version": "1.0",
            "environment": "development" if settings.DEBUG else "production",
            "admin": "/admin/",
            "api": "/api/",
            "documentation": "/docs/",
        }
    )


@require_GET
def health(request):
    return JsonResponse({"status": "healthy"})


def deployment_settings_debug(request):
    """
    Temporary deployment diagnostics.

    Only available when DEBUG is False AND ENABLE_DEPLOYMENT_DEBUG=True.
    """
    enabled = getattr(settings, "ENABLE_DEPLOYMENT_DEBUG", False)
    if settings.DEBUG or not enabled:
        return HttpResponseNotFound()

    db = settings.DATABASES.get("default", {})
    return JsonResponse(
        {
            "DJANGO_SETTINGS_MODULE": getattr(settings, "SETTINGS_MODULE", None),
            "DEBUG": settings.DEBUG,
            "DATABASE_ENGINE": db.get("ENGINE"),
            "DATABASE_NAME": str(db.get("NAME", "")),
            "DATABASE_HOST": str(db.get("HOST", "")),
            "DATABASE_URL_SET": bool(os.environ.get("DATABASE_URL", "").strip()),
            "DATABASE_PUBLIC_URL_SET": bool(
                os.environ.get("DATABASE_PUBLIC_URL", "").strip()
            ),
            "ALLOWED_HOSTS": list(settings.ALLOWED_HOSTS),
            "BACKEND_BASE_URL": getattr(settings, "BACKEND_BASE_URL", ""),
            "FRONTEND_BASE_URL": getattr(settings, "FRONTEND_BASE_URL", ""),
            "RAILWAY_PUBLIC_DOMAIN": os.environ.get("RAILWAY_PUBLIC_DOMAIN", ""),
            "RAILWAY_PRIVATE_DOMAIN": os.environ.get("RAILWAY_PRIVATE_DOMAIN", ""),
        }
    )
