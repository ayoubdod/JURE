"""
Django settings for core project.
"""

from pathlib import Path
import os
import environ
from datetime import timedelta
from urllib.parse import urlparse
from django.utils.translation import gettext_lazy as _
from corsheaders.defaults import default_headers, default_methods

# --------------------------------------------------------------------------------------
# Paths & env
# --------------------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))
env = environ.Env()

COMPANY_NAME = "Jure"
FRONTEND_BASE_URL = env.str("FRONTEND_BASE_URL", default="http://localhost:3000")
_frontend_parsed = urlparse(FRONTEND_BASE_URL)
FRONTEND_BASE_URL_NORMALIZED = FRONTEND_BASE_URL.rstrip("/")

# Build CORS allowed origins
_cors_origins = {FRONTEND_BASE_URL_NORMALIZED}

# Add localhost/127.0.0.1 variants
if _frontend_parsed.hostname in {"localhost", "127.0.0.1"}:
    alt_host = "127.0.0.1" if _frontend_parsed.hostname == "localhost" else "localhost"
    alt_origin = f"{_frontend_parsed.scheme}://{alt_host}"
    if _frontend_parsed.port:
        alt_origin = f"{alt_origin}:{_frontend_parsed.port}"
    _cors_origins.add(alt_origin)

# --------------------------------------------------------------------------------------
# Core
# --------------------------------------------------------------------------------------
SECRET_KEY = "django-insecure-w@te8c71m(f*r_yluy9t$)x9bt#@cx9w(0tx=rd(hm1=33ct(w"
DEBUG = True

# In development, also allow common Vite ports
if DEBUG:
    common_vite_ports = [3000, 5173, 4173]
    for port in common_vite_ports:
        if _frontend_parsed.port != port:
            _cors_origins.add(f"http://localhost:{port}")
            _cors_origins.add(f"http://127.0.0.1:{port}")
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]  # dev only, "*" is fine locally

# --------------------------------------------------------------------------------------
# Apps
# --------------------------------------------------------------------------------------
INSTALLED_APPS = [
    "modeltranslation",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",

    # libs
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "django_extensions",
    "phonenumber_field",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "debug_toolbar",

    # >>> realtime
    "channels",          # <<< ADDED
    "chat",              # <<< ADDED (your chat app)

    # apps
    "commons",
    "extra",
    "users",
    "clients",
    "cases",
    "cabinets",
    "lawyers",
    "subscriptions",
    "library",
    "tasks",
    "case_calendar",
    "dashboard",
    "finance",
    "notifications",
    "juria",
]

SITE_ID = 1

# --------------------------------------------------------------------------------------
# Middleware
# --------------------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "core.middleware.PDFHeadersMiddleware",  # Add PDF headers middleware
    "debug_toolbar.middleware.DebugToolbarMiddleware",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = list(_cors_origins)
CORS_ALLOW_HEADERS = list(default_headers)
CORS_ALLOW_METHODS = list(default_methods)
# Additional CORS settings for media files (PDFs)
CORS_EXPOSE_HEADERS = ['Content-Type', 'Content-Length', 'Content-Disposition']

CSRF_TRUSTED_ORIGINS = list(_cors_origins)

INTERNAL_IPS = ["127.0.0.1"]

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
                "django.template.context_processors.request",
            ],
        },
    },
]

# --------------------------------------------------------------------------------------
# WSGI/ASGI
# --------------------------------------------------------------------------------------
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"      # <<< ADDED (Channels entrypoint)

# --------------------------------------------------------------------------------------
# Database
# --------------------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    },
    # PostgreSQL example (commented)
    # "default": {
    #     "ENGINE": "django.db.backends.postgresql",
    #     "NAME": "jure_drf",
    #     "USER": "postgres",
    #     "PASSWORD": env.str("DB_PASSWORD"),
    #     "HOST": "localhost",
    #     "PORT": "5432",
    # },
}

# --------------------------------------------------------------------------------------
# Password validation
# --------------------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "users.User"

# --------------------------------------------------------------------------------------
# Accounts / Auth / REST
# --------------------------------------------------------------------------------------
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
# ACCOUNT_EMAIL_VERIFICATION = "optional"
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_SUBJECT_PREFIX = f"[{COMPANY_NAME}] "
ACCOUNT_ADAPTER = "users.adapters.CustomAccountAdapter"

AUTHENTICATION_BACKENDS = [
    "users.auth_backend.MultiFieldModelBackend",
    # "django.contrib.auth.backends.ModelBackend",  # uncomment if you want admin-site login via username
]

REST_AUTH = {
    "USE_JWT": True,
    "REGISTER_SERIALIZER": "users.serializers.CustomRegisterSerializer",
    "USER_DETAILS_SERIALIZER": "users.serializers.CustomUserDetailsSerializer",
    "LOGIN_SERIALIZER": "users.serializers.CustomLoginSerializer",
    "PASSWORD_RESET_SERIALIZER": "users.serializers.PasswordResetSerializer",
    "PASSWORD_RESET_CONFIRM_SERIALIZER": "users.serializers.PasswordResetConfirmSerializer",
    "JWT_AUTH_HTTPONLY": False,
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
        "rest_framework.permissions.DjangoModelPermissionsOrAnonReadOnly"
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ),
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
# Channels (Redis)
USE_INMEMORY_CHANNEL_LAYER = True  # flip to False when you run Redis

if USE_INMEMORY_CHANNEL_LAYER:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
else:
    REDIS_URL = env.str("REDIS_URL", default="redis://127.0.0.1:6379/0")
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        }
    }
# --------------------------------------------------------------------------------------

# --------------------------------------------------------------------------------------
# i18n / tz
# --------------------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
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
STATIC_ROOT = BASE_DIR / "static/"
STATIC_URL = "/static/"
MEDIA_ROOT = BASE_DIR / "media/"
MEDIA_URL = "/media/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------------------
# Email (console default; SMTP if creds exist)
# Supports both SMTP_* and EMAIL_* env vars (SMTP_* take precedence for robustness).
# --------------------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "webmaster@localhost"

_smtp_pass = (env.str("SMTP_PASS", default="") or env.str("EMAIL_HOST_PASSWORD", default="")).replace(" ", "")
if _smtp_pass:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    _user = env.str("SMTP_USER", default="") or env.str("EMAIL_HOST_USER", default="")
    _host = env.str("SMTP_HOST", default="") or env.str("EMAIL_HOST", default="")
    if not _host and "@gmail.com" in (_user or ""):
        _host = "smtp.gmail.com"
    EMAIL_HOST = _host or "smtp.hostinger.com"
    _port = env.str("SMTP_PORT", default="") or env.str("EMAIL_PORT", default="")
    if not _port and _host == "smtp.gmail.com":
        _port = "587"
    EMAIL_PORT = int(_port) if _port else 465
    # Gmail: port 587 uses STARTTLS; port 465 uses SSL
    if EMAIL_PORT == 587:
        EMAIL_USE_TLS = True
        EMAIL_USE_SSL = False
    else:
        EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
        EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=True)
    EMAIL_HOST_USER = _user
    EMAIL_HOST_PASSWORD = _smtp_pass
    DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default=EMAIL_HOST_USER or "webmaster@localhost")

# --------------------------------------------------------------------------------------
# WebRTC / TURN (optional; STUN is served via API without env)
# --------------------------------------------------------------------------------------
TURN_HOST = env.str("TURN_HOST", default="").strip()
TURN_PORT = env.int("TURN_PORT", default=3478)
TURN_USERNAME = env.str("TURN_USERNAME", default="")
TURN_CREDENTIAL = env.str("TURN_CREDENTIAL", default="")

# --------------------------------------------------------------------------------------
# Juria AI (external API proxy — key never exposed to clients)
# --------------------------------------------------------------------------------------
JURIA_API_URL = env.str("JURIA_API_URL", default="https://api.juria.ma/v1").rstrip("/")
JURIA_API_KEY = env.str("JURIA_API_KEY", default="")
JURIA_MAX_TOKENS = env.int("JURIA_MAX_TOKENS", default=4000)
JURIA_TIMEOUT_SECONDS = env.int("JURIA_TIMEOUT_SECONDS", default=60)
JURIA_ENABLED = env.bool("JURIA_ENABLED", default=True)

# --------------------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------------------
TEST_RUNNER = "xmlrunner.extra.djangotestrunner.XMLTestRunner"
TEST_OUTPUT_FILE_NAME = "results.xml"
