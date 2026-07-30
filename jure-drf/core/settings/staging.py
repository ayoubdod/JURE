"""
Staging settings — production-like behavior on Railway.
"""

from urllib.parse import urlparse

from .base import *  # noqa: F403

DEBUG = False

DATABASES = {
    "default": env.db(),  # noqa: F405
}

_extra_cors = env.list("CORS_ALLOWED_ORIGINS", default=[])  # noqa: F405
if BACKEND_BASE_URL:  # noqa: F405
    _extra_cors.append(BACKEND_BASE_URL)  # noqa: F405

CORS_ALLOWED_ORIGINS = build_cors_origins(  # noqa: F405
    FRONTEND_BASE_URL,  # noqa: F405
    extra_origins=_extra_cors,
)
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

_allowed_hosts = env.list("ALLOWED_HOSTS", default=[])  # noqa: F405
if BACKEND_BASE_URL:  # noqa: F405
    _backend_host = urlparse(BACKEND_BASE_URL).hostname  # noqa: F405
    if _backend_host:
        _allowed_hosts.append(_backend_host)
ALLOWED_HOSTS = list(dict.fromkeys(_allowed_hosts))

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

USE_INMEMORY_CHANNEL_LAYER = False
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},  # noqa: F405
    },
}

MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

SECURE_HSTS_SECONDS = 31536000

SECURE_HSTS_INCLUDE_SUBDOMAINS = True

SECURE_HSTS_PRELOAD = True

SECURE_SSL_REDIRECT = True

SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SAMESITE = "Lax"