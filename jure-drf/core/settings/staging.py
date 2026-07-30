"""
Staging settings — production-like behavior on Railway.
"""

import os
from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False

# Railway Postgres lives on its own service. DATABASE_URL is NOT injected into
# this web service unless you add a Variable Reference, e.g.:
#   DATABASE_URL=${{Postgres.DATABASE_URL}}
# Prefer the private DATABASE_URL over DATABASE_PUBLIC_URL (no public egress).
_database_url = (
    os.environ.get("DATABASE_URL", "").strip()
    or os.environ.get("DATABASE_PUBLIC_URL", "").strip()
)
if not _database_url:
    raise ImproperlyConfigured(
        "DATABASE_URL is required when using core.settings.staging. "
        "PostgreSQL existing in the Railway project is not enough — add a "
        "Variable Reference on THIS service: "
        "DATABASE_URL=${{Postgres.DATABASE_URL}} "
        "(use your Postgres service name). Do not rely on a local .env."
    )

# Keep django-environ / env.db() in sync when only DATABASE_PUBLIC_URL was set.
os.environ["DATABASE_URL"] = _database_url

DATABASES = {
    "default": env.db("DATABASE_URL"),  # noqa: F405
}
# Persist connections across requests inside a worker (Railway-friendly).
DATABASES["default"]["CONN_MAX_AGE"] = env.int(  # noqa: F405
    "CONN_MAX_AGE",
    default=60,
)
# Public Railway proxies often need TLS; private *.railway.internal usually does not.
_sslmode = env.str("DB_SSLMODE", default="").strip()  # noqa: F405
if _sslmode:
    DATABASES["default"].setdefault("OPTIONS", {})["sslmode"] = _sslmode
elif "railway.internal" not in _database_url and "sslmode=" not in _database_url:
    DATABASES["default"].setdefault("OPTIONS", {})["sslmode"] = "require"

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

# Railway injects these automatically — keep DisallowedHost from breaking deploys
# even when ALLOWED_HOSTS / BACKEND_BASE_URL are misconfigured.
for _railway_host in (
    os.environ.get("RAILWAY_PUBLIC_DOMAIN"),
    os.environ.get("RAILWAY_PRIVATE_DOMAIN"),
):
    if _railway_host:
        _allowed_hosts.append(_railway_host)

# Leading-dot entries match the domain and all subdomains (Django ALLOWED_HOSTS).
_allowed_hosts.extend(
    [
        ".up.railway.app",
        ".railway.internal",
        "healthcheck.railway.app",
    ]
)

ALLOWED_HOSTS = list(dict.fromkeys(h for h in _allowed_hosts if h))

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Allow Railway HTTP healthchecks without a redirect loop.
SECURE_REDIRECT_EXEMPT = [r"^health/", r"^debug/settings/?$"]
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

USE_INMEMORY_CHANNEL_LAYER = True

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# WhiteNoise is already registered in base.MIDDLEWARE (immediately after SecurityMiddleware).
# Do not insert it again — duplicate middleware breaks static serving and wastes cycles.

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

# Temporary deployment diagnostics — see core.views.deployment_settings_debug
ENABLE_DEPLOYMENT_DEBUG = env.bool("ENABLE_DEPLOYMENT_DEBUG", default=False)  # noqa: F405
