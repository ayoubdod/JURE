from django.conf import settings
from django.http import JsonResponse
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
