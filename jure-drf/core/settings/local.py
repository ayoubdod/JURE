"""
Local development settings.
"""

from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    },
}

CORS_ALLOWED_ORIGINS = build_cors_origins(  # noqa: F405
    FRONTEND_BASE_URL,  # noqa: F405
    include_localhost_variants=True,
    include_vite_ports=True,
)
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

INTERNAL_IPS = ["127.0.0.1"]

USE_INMEMORY_CHANNEL_LAYER = True
CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}

INSTALLED_APPS += [  # noqa: F405
    "debug_toolbar",
]
MIDDLEWARE += [  # noqa: F405
    "debug_toolbar.middleware.DebugToolbarMiddleware",
]

# Diagnostics endpoint is staging/production only.
ENABLE_DEPLOYMENT_DEBUG = False
