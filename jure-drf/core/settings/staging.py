"""
Staging settings — production-like behavior on Railway.
"""

import os
from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False

# Fail closed if SECRET_KEY is missing, too short, or still a known insecure default.
_secret = os.environ.get("SECRET_KEY", "").strip()
_insecure_markers = (
    "django-insecure-",
    "change-me-to-a-long-random-string",
    "local-dev-only",
)
if (
    len(_secret) < 50
    or any(marker in _secret for marker in _insecure_markers)
):
    raise ImproperlyConfigured(
        "SECRET_KEY must be set to a unique random value (>=50 chars) in staging/"
        "production. Rotate any previously committed or default key immediately."
    )
SECRET_KEY = _secret  # noqa: F405 — override base default

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
# Fail fast when the database host is unreachable. The default TCP timeout
# is long enough to burn the whole Railway healthcheck window inside migrate.
DATABASES["default"].setdefault("OPTIONS", {})
DATABASES["default"]["OPTIONS"].setdefault("connect_timeout", 10)
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

# AllowedHostsOriginValidator checks the WebSocket Origin host against ALLOWED_HOSTS.
# Frontend origin must be listed or WS upgrades from the SPA are rejected.
if FRONTEND_BASE_URL:  # noqa: F405
    _frontend_host = urlparse(FRONTEND_BASE_URL).hostname  # noqa: F405
    if _frontend_host:
        _allowed_hosts.append(_frontend_host)

# Railway injects these automatically — keep DisallowedHost from breaking deploys
# even when ALLOWED_HOSTS / BACKEND_BASE_URL are misconfigured.
for _railway_host in (
    os.environ.get("RAILWAY_PUBLIC_DOMAIN"),
    os.environ.get("RAILWAY_PRIVATE_DOMAIN"),
):
    if _railway_host:
        _allowed_hosts.append(_railway_host)

# Prefer explicit RAILWAY_PUBLIC_DOMAIN injection above over a broad *.up.railway.app wildcard.
_allowed_hosts.extend(
    [
        ".railway.internal",
        "healthcheck.railway.app",
    ]
)

ALLOWED_HOSTS = list(dict.fromkeys(h for h in _allowed_hosts if h))

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Allow Railway HTTP healthchecks without a redirect loop.
SECURE_REDIRECT_EXEMPT = [r"^health/"]
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# Session id stays invisible to scripts. The CSRF token stays readable: the SPA
# must send it as X-CSRFToken. JWT cookies are HttpOnly via JWT_AUTH_HTTPONLY.
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# JWT cookies must only travel over HTTPS in staging/production.
# Frontend and API are different sites on Railway (railway.app is a public
# suffix). SameSite=Lax is not sent on those cross-site XHR calls, so login
# returns the user, the SPA navigates in, then the next request is 401 and
# the client logs itself out. None+Secure is required for credentialed
# cross-site cookies. Browsers drop SameSite=None without Secure.
JWT_AUTH_SECURE = True
REST_AUTH = {  # noqa: F405
    **REST_AUTH,  # noqa: F405
    "JWT_AUTH_SECURE": True,
    "JWT_AUTH_SAMESITE": "None",
}

# Channel layer: require Redis in staging (multi-replica safe).
USE_INMEMORY_CHANNEL_LAYER = env.bool(  # noqa: F405
    "USE_INMEMORY_CHANNEL_LAYER",
    default=False,
)
REDIS_URL = env.str("REDIS_URL", default="").strip()  # noqa: F405
if USE_INMEMORY_CHANNEL_LAYER:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
    }
elif not REDIS_URL:
    raise ImproperlyConfigured(
        "REDIS_URL is required when USE_INMEMORY_CHANNEL_LAYER is False "
        "(staging/production default)."
    )
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        },
    }

# Persistent uploads: refuse the ephemeral container path.
_media_root = str(MEDIA_ROOT)  # noqa: F405
if not _media_root or _media_root.rstrip("/").endswith("/app/media") or _media_root == "/app/media":
    _explicit_media = os.environ.get("MEDIA_ROOT", "").strip()
    if not _explicit_media or _explicit_media.rstrip("/") in ("/app/media", "media"):
        raise ImproperlyConfigured(
            "MEDIA_ROOT must be set to a persistent absolute path outside /app "
            "(e.g. a Railway Volume mount). Uploaded identity documents must not "
            "live in the ephemeral container filesystem."
        )
    MEDIA_ROOT = _explicit_media  # noqa: F405

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

# Match the JWT cookies: Lax is dropped on cross-site API calls from the SPA.
SESSION_COOKIE_SAMESITE = "None"

CSRF_COOKIE_SAMESITE = "None"
