"""
Shared Django settings for all environments.
"""

from datetime import timedelta
import os
from pathlib import Path
from urllib.parse import urlparse

import environ
from corsheaders.defaults import default_headers, default_methods
from django.utils.translation import gettext_lazy as _

# --------------------------------------------------------------------------------------
# Paths & environment
# --------------------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Never load a local .env file when running staging/production. Containers must
# rely on process environment (Railway variables / Docker ENV) only.
_settings_module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
_is_deployed_settings = any(
    marker in _settings_module for marker in ("staging", "production")
)
if not _is_deployed_settings:
    environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

env = environ.Env(
    DEBUG=(bool, False),
    USE_INMEMORY_CHANNEL_LAYER=(bool, True),
    JURIA_ENABLED=(bool, False),
    JURE_BILLING_WEBHOOK_SECRET=(str, ""),
)

DEBUG = env.bool("DEBUG", default=False)

# Local/dev may use a disposable default. Staging/production MUST set SECRET_KEY
# (see staging.py and docker-entrypoint.sh). Never reuse a committed key in prod.
_SECRET_KEY_DEFAULT = "django-insecure-local-dev-only-change-me"
SECRET_KEY = env.str("SECRET_KEY", default=_SECRET_KEY_DEFAULT)

COMPANY_NAME = env.str("COMPANY_NAME", default="Jure")
FRONTEND_BASE_URL = env.str("FRONTEND_BASE_URL", default="http://localhost:3000")
BACKEND_BASE_URL = env.str("BACKEND_BASE_URL", default="").rstrip("/")
FRONTEND_BASE_URL_NORMALIZED = FRONTEND_BASE_URL.rstrip("/")


def build_cors_origins(
    frontend_url: str,
    *,
    extra_origins: list[str] | None = None,
    include_localhost_variants: bool = False,
    include_vite_ports: bool = False,
) -> list[str]:
    """Build a deduplicated list of CORS/CSRF trusted origins."""
    normalized = frontend_url.rstrip("/")
    origins: set[str] = set()

    if normalized:
        origins.add(normalized)

    if extra_origins:
        origins.update(origin.rstrip("/") for origin in extra_origins if origin)

    parsed = urlparse(normalized)
    if include_localhost_variants and parsed.hostname in {"localhost", "127.0.0.1"}:
        alt_host = "127.0.0.1" if parsed.hostname == "localhost" else "localhost"
        alt_origin = f"{parsed.scheme}://{alt_host}"
        if parsed.port:
            alt_origin = f"{alt_origin}:{parsed.port}"
        origins.add(alt_origin)

    if include_vite_ports:
        for port in (3000, 5173, 4173):
            if parsed.port != port:
                origins.add(f"http://localhost:{port}")
                origins.add(f"http://127.0.0.1:{port}")

    return sorted(origins)


# --------------------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------------------
INSTALLED_APPS = [
    "modeltranslation",
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third-party
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "django_extensions",
    "phonenumber_field",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    # Realtime
    "channels",
    "chat",
    # Project apps
    "commons",
    "extra",
    "users",
    "clients",
    "cases",
    "cabinets",
    "jurisdictions",
    "lawyers",
    "subscriptions",
    "library",
    "tasks",
    "case_calendar",
    "dashboard",
    "finance",
    "notifications",
    "juria",
    "privacy",
    "cookie_consent",
    "legal_deadlines",
    "conflict_checks",
    "research_notes",
    "consultations",
]

SITE_ID = 1

# --------------------------------------------------------------------------------------
# Middleware
# --------------------------------------------------------------------------------------
MIDDLEWARE = [
    "core.middleware.PDFHeadersMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "subscriptions.middleware.SubscriptionWriteGuardMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.middleware.locale.LocaleMiddleware",
]

# --------------------------------------------------------------------------------------
# CORS defaults (origins are set per environment)
# --------------------------------------------------------------------------------------
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_HEADERS = list(default_headers)
CORS_ALLOW_METHODS = list(default_methods)
CORS_EXPOSE_HEADERS = ["Content-Type", "Content-Length", "Content-Disposition"]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# --------------------------------------------------------------------------------------
# Authentication
# --------------------------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
# Subjects are defined in templates (adapter.format_email_subject does not re-prefix).
ACCOUNT_EMAIL_SUBJECT_PREFIX = ""
ACCOUNT_ADAPTER = "users.adapters.CustomAccountAdapter"

AUTHENTICATION_BACKENDS = [
    "users.auth_backend.MultiFieldModelBackend",
]

REST_AUTH = {
    "USE_JWT": True,
    "REGISTER_SERIALIZER": "users.serializers.CustomRegisterSerializer",
    "USER_DETAILS_SERIALIZER": "users.serializers.CustomUserDetailsSerializer",
    "LOGIN_SERIALIZER": "users.serializers.CustomLoginSerializer",
    "PASSWORD_RESET_SERIALIZER": "users.serializers.PasswordResetSerializer",
    "PASSWORD_RESET_CONFIRM_SERIALIZER": "users.serializers.PasswordResetConfirmSerializer",
    "JWT_TOKEN_CLAIMS_SERIALIZER": "users.tokens.SessionTokenObtainPairSerializer",
    "JWT_AUTH_COOKIE": "jure-access",
    "JWT_AUTH_REFRESH_COOKIE": "jure-refresh",
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_SECURE": not DEBUG,
    "OLD_PASSWORD_FIELD_ENABLED": True,
    "LOGOUT_ON_PASSWORD_CHANGE": True,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=90),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=5),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
REST_USE_JWT = True

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.SessionJWTCookieAuthentication",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "600/minute",
        "auth_burst": "5/minute",
        "landing_inquiry": "8/hour",
        "cookie_consent": "30/minute",
    },
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Jure API",
    "DESCRIPTION": "API for Jure",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --------------------------------------------------------------------------------------
# Internationalization
# --------------------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
# Store and compare datetimes in UTC. API clients must send timezone-aware
# datetimes (ISO-8601 with offset/Z); naive local times are ambiguous.
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True

LOCALE_PATHS = [BASE_DIR / "locale"]

LANGUAGES = [
    ("fr", _("French")),
    ("en", _("English")),
    ("ar", _("Arabic")),
]
MODELTRANSLATION_DEFAULT_LANGUAGE = "en"
MODELTRANSLATION_LANGUAGES = ("fr", "en", "ar")

# --------------------------------------------------------------------------------------
# Static & media
# --------------------------------------------------------------------------------------
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
# Local default: repo /media. On Railway the container disk is wiped on every
# deploy — mount a Volume and set MEDIA_ROOT to that mount path (e.g. /data/media).
MEDIA_ROOT = Path(env.str("MEDIA_ROOT", default=str(BASE_DIR / "media")))
MEDIA_URL = "/media/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------------------
# Django admin (Unfold + JURE branding)
# --------------------------------------------------------------------------------------
from core.admin_branding import get_unfold_settings  # noqa: E402

UNFOLD = get_unfold_settings(frontend_url=FRONTEND_BASE_URL_NORMALIZED)

# --------------------------------------------------------------------------------------
# Email (SMTP when credentials are present)
# Supports both SMTP_* and EMAIL_* env vars (SMTP_* take precedence).
# --------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# Email configuration
# Priority:
# 1. Resend API
# 2. SMTP
# 3. Console backend (development)
# ------------------------------------------------------------------------------

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = env.str(
    "DEFAULT_FROM_EMAIL",
    default="JURE <contact@jure.ma>",
)

RESEND_API_KEY = env.str("RESEND_API_KEY", default="")

if RESEND_API_KEY:
    INSTALLED_APPS += ["anymail"]

    EMAIL_BACKEND = "anymail.backends.resend.EmailBackend"

    ANYMAIL = {
        "RESEND_API_KEY": RESEND_API_KEY,
    }

    DEFAULT_FROM_EMAIL = env.str(
        "DEFAULT_FROM_EMAIL",
        default="JURE <contact@jure.ma>",
    )

else:
    _smtp_pass = (
        env.str("SMTP_PASS", default="")
        or env.str("EMAIL_HOST_PASSWORD", default="")
    ).replace(" ", "")

    if _smtp_pass:
        EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

        _user = (
            env.str("SMTP_USER", default="")
            or env.str("EMAIL_HOST_USER", default="")
        )

        _host = (
            env.str("SMTP_HOST", default="")
            or env.str("EMAIL_HOST", default="")
        )

        if not _host and "@gmail.com" in (_user or ""):
            _host = "smtp.gmail.com"

        EMAIL_HOST = _host or "smtp.hostinger.com"

        _port = (
            env.str("SMTP_PORT", default="")
            or env.str("EMAIL_PORT", default="")
        )

        if not _port and EMAIL_HOST == "smtp.gmail.com":
            _port = "587"

        EMAIL_PORT = int(_port) if _port else 465

        if EMAIL_PORT == 587:
            EMAIL_USE_TLS = True
            EMAIL_USE_SSL = False
        else:
            EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
            EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=True)

        EMAIL_HOST_USER = _user
        EMAIL_HOST_PASSWORD = _smtp_pass

        DEFAULT_FROM_EMAIL = env.str(
            "DEFAULT_FROM_EMAIL",
            default=f"JURE <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "JURE <contact@jure.ma>",
        )

CONTACT_INBOX = env.str("CONTACT_INBOX", default="contact@jure.ma")

# --------------------------------------------------------------------------------------
# Redis / Channels
# --------------------------------------------------------------------------------------
REDIS_URL = env.str("REDIS_URL", default="redis://127.0.0.1:6379/0")
USE_INMEMORY_CHANNEL_LAYER = env.bool("USE_INMEMORY_CHANNEL_LAYER", default=True)
# P3.5: short-lived overview payload cache (seconds). 0 disables.
DASHBOARD_OVERVIEW_CACHE_TTL = env.int("DASHBOARD_OVERVIEW_CACHE_TTL", default=30)

if USE_INMEMORY_CHANNEL_LAYER:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        },
    }

# --------------------------------------------------------------------------------------
# WebRTC / TURN
# --------------------------------------------------------------------------------------
TURN_HOST = env.str("TURN_HOST", default="").strip()
TURN_PORT = env.int("TURN_PORT", default=3478)
TURN_TLS_PORT = env.int("TURN_TLS_PORT", default=0)
TURN_USERNAME = env.str("TURN_USERNAME", default="")
TURN_CREDENTIAL = env.str("TURN_CREDENTIAL", default="")
# Prefer TURN_SECRET for short-lived coturn HMAC credentials (never ship static creds to clients long-term).
TURN_SECRET = env.str("TURN_SECRET", default="")
TURN_CREDENTIAL_TTL = env.int("TURN_CREDENTIAL_TTL", default=86400)
# Full iceServers JSON from a hosted TURN provider (Metered / Twilio / ExpressTURN).
# Used as-is when set — the easiest production fix on Railway (UDP TURN cannot run there).
ICE_SERVERS_JSON = env.str("ICE_SERVERS_JSON", default="").strip()
# Metered.ca: GET https://{METERED_TURN_DOMAIN}/api/v1/turn/credentials?apiKey=...
METERED_TURN_DOMAIN = env.str("METERED_TURN_DOMAIN", default="").strip()
METERED_TURN_API_KEY = env.str("METERED_TURN_API_KEY", default="").strip()

# --------------------------------------------------------------------------------------
# Juria AI
# --------------------------------------------------------------------------------------
# Provider: "deepseek" (OpenAI-compatible chat) or "juria" (legacy custom API).
JURIA_PROVIDER = env.str("JURIA_PROVIDER", default="deepseek").strip().lower()
JURIA_API_URL = env.str("JURIA_API_URL", default="https://api.juria.ma/v1").rstrip("/")
JURIA_API_KEY = env.str("JURIA_API_KEY", default="")
JURIA_MAX_TOKENS = env.int("JURIA_MAX_TOKENS", default=4000)
JURIA_TIMEOUT_SECONDS = env.int("JURIA_TIMEOUT_SECONDS", default=90)
JURIA_ENABLED = env.bool("JURIA_ENABLED", default=False)
JURE_BILLING_WEBHOOK_SECRET = env.str("JURE_BILLING_WEBHOOK_SECRET", default="")
DEEPSEEK_API_URL = env.str("DEEPSEEK_API_URL", default="https://api.deepseek.com").rstrip("/")
DEEPSEEK_API_KEY = env.str("DEEPSEEK_API_KEY", default="")
DEEPSEEK_MODEL = env.str("DEEPSEEK_MODEL", default="deepseek-chat")

# --------------------------------------------------------------------------------------
# Privacy Gateway (JURIA AI egress)
# --------------------------------------------------------------------------------------
# Base64-encoded 32-byte AES-256-GCM key for PseudonymMapping encryption.
PRIVACY_MAPPING_KEY = env.str("PRIVACY_MAPPING_KEY", default="")
PRIVACY_DEFAULT_MODE = env.str("PRIVACY_DEFAULT_MODE", default="PSEUDONYMIZED").strip().upper()
# Phase 4 stub — set True only when private/on-prem AI is wired.
PRIVACY_PRIVATE_AI_CONFIGURED = env.bool("PRIVACY_PRIVATE_AI_CONFIGURED", default=False)
# When True, _deepseek_chat / _juria_post refuse calls without a Privacy Gateway egress ticket.
PRIVACY_ENFORCE_EGRESS_TICKET = env.bool("PRIVACY_ENFORCE_EGRESS_TICKET", default=True)

# --------------------------------------------------------------------------------------
# Cookie consent
# --------------------------------------------------------------------------------------
# Bump COOKIE_CONSENT_POLICY_VERSION when the published cookie policy changes.
# Optional categories granted under an older version are treated as stale.
COOKIE_CONSENT_POLICY_VERSION = env.str("COOKIE_CONSENT_POLICY_VERSION", default="1.0")
COOKIE_CONSENT_COOKIE_NAME = "jure-consent"
COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 365
# True only when a browser analytics provider is actually deployed.
COOKIE_ANALYTICS_CONFIGURED = env.bool("COOKIE_ANALYTICS_CONFIGURED", default=False)

# --------------------------------------------------------------------------------------
# Case attachment OCR (Phase 2 — OCRmyPDF + Tesseract, local only)
# --------------------------------------------------------------------------------------
# Runner: "thread" (default), "sync" (tests), "poll_only" (web + separate worker process).
ATTACHMENT_OCR_RUNNER = env.str("ATTACHMENT_OCR_RUNNER", default="thread").strip().lower()
ATTACHMENT_OCR_LANGUAGES = env.str("ATTACHMENT_OCR_LANGUAGES", default="fra+ara+eng")
ATTACHMENT_OCR_MAX_BYTES = env.int("ATTACHMENT_OCR_MAX_BYTES", default=50 * 1024 * 1024)
ATTACHMENT_OCR_MAX_PAGES = env.int("ATTACHMENT_OCR_MAX_PAGES", default=200)
ATTACHMENT_OCR_TIMEOUT_SECONDS = env.int("ATTACHMENT_OCR_TIMEOUT_SECONDS", default=300)
ATTACHMENT_OCR_MIN_CHARS_PER_PAGE = env.int("ATTACHMENT_OCR_MIN_CHARS_PER_PAGE", default=40)
ATTACHMENT_OCR_KEEP_DERIVED = env.bool("ATTACHMENT_OCR_KEEP_DERIVED", default=True)
# Phase 3 — page text persistence limits (PostgreSQL TextField storage).
ATTACHMENT_EXTRACTION_MAX_CHARS_PER_PAGE = env.int(
    "ATTACHMENT_EXTRACTION_MAX_CHARS_PER_PAGE", default=200_000
)
ATTACHMENT_EXTRACTION_MAX_TOTAL_CHARS = env.int(
    "ATTACHMENT_EXTRACTION_MAX_TOTAL_CHARS", default=2_000_000
)

# --------------------------------------------------------------------------------------
# Juria retrieval / context (Phase 4 — keyword retrieval, no embeddings)
# --------------------------------------------------------------------------------------
JURIA_RETRIEVAL_MAX_CHUNK_CHARS = env.int("JURIA_RETRIEVAL_MAX_CHUNK_CHARS", default=1200)
JURIA_RETRIEVAL_PAGE_SUBCHUNK_CHARS = env.int("JURIA_RETRIEVAL_PAGE_SUBCHUNK_CHARS", default=2500)
JURIA_CONTEXT_MAX_RETRIEVED_CHARS = env.int("JURIA_CONTEXT_MAX_RETRIEVED_CHARS", default=24_000)
# Phase 5B — lexical default BM25; hybrid embeddings optional (local only).
JURIA_RETRIEVAL_SCORER = env.str("JURIA_RETRIEVAL_SCORER", default="bm25").strip().lower()
JURIA_EMBEDDINGS_ENABLED = env.bool("JURIA_EMBEDDINGS_ENABLED", default=False)
JURIA_HYBRID_RETRIEVAL = env.bool("JURIA_HYBRID_RETRIEVAL", default=False)
# auto | sentence_transformers | hash (hash = deterministic stub for tests/CI)
JURIA_EMBEDDING_BACKEND = env.str("JURIA_EMBEDDING_BACKEND", default="auto").strip().lower()
JURIA_EMBEDDING_MODEL = env.str(
    "JURIA_EMBEDDING_MODEL", default="intfloat/multilingual-e5-base"
).strip()

# --------------------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": env.str("LOG_LEVEL", default="INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": env.str("DJANGO_LOG_LEVEL", default="INFO"),
            "propagate": False,
        },
    },
}

# --------------------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------------------
TEST_RUNNER = "xmlrunner.extra.djangotestrunner.XMLTestRunner"
TEST_OUTPUT_FILE_NAME = "results.xml"
