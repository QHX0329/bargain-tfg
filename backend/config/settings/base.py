"""
Configuración base de Django para el proyecto BargAIn.
Configuraciones comunes a todos los entornos.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
import structlog
from celery.schedules import crontab

# ── Paths ────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Security ─────────────────────────────────────────

SECRET_KEY = os.environ.get("SECRET_KEY", "INSECURE-dev-key-change-me")
DEBUG = False
ALLOWED_HOSTS: list[str] = []

# ── Apps ─────────────────────────────────────────────

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",  # PostGIS
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # Requerido por BLACKLIST_AFTER_ROTATION
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.core",
    "apps.users",
    "apps.products",
    "apps.stores",
    "apps.prices",
    "apps.scraping",
    "apps.shopping_lists",
    "apps.optimizer",
    "apps.ocr",
    "apps.assistant",
    "apps.business",
    "apps.notifications",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ────────────────────────────────────────

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATE_DIR = BASE_DIR / "templates"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # Evita errores del autoreloader si el directorio no existe en contenedores.
        "DIRS": [TEMPLATE_DIR] if TEMPLATE_DIR.exists() else [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ── Database ─────────────────────────────────────────

DATABASES = {
    "default": dj_database_url.config(
        default="postgis://bargain_user:bargain_password@localhost:5432/bargain_db",
        engine="django.contrib.gis.db.backends.postgis",
    )
}

configured_gdal = os.environ.get("GDAL_LIBRARY_PATH")
configured_geos = os.environ.get("GEOS_LIBRARY_PATH")

if configured_gdal and Path(configured_gdal).exists():
    GDAL_LIBRARY_PATH = configured_gdal

if configured_geos and Path(configured_geos).exists():
    GEOS_LIBRARY_PATH = configured_geos

# ── Auth ─────────────────────────────────────────────

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalization ─────────────────────────────

LANGUAGE_CODE = "es"
TIME_ZONE = "Europe/Madrid"
USE_I18N = True
USE_TZ = True

# ── Static & Media ───────────────────────────────────

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# ── REST Framework ───────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.bargain_exception_handler",
}

# ── JWT ──────────────────────────────────────────────

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 60))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.environ.get("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 7))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── CORS ─────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8081"
).split(",")

# ── Celery ───────────────────────────────────────────

CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_BEAT_SCHEDULE = {
    "expire-stale-prices-hourly": {
        "task": "apps.prices.tasks.expire_stale_prices",
        "schedule": crontab(minute=0, hour="*"),
    },
    "scrape-mercadona-daily": {
        "task": "apps.scraping.tasks.run_spider",
        "schedule": crontab(minute=0, hour=6),
        "args": ("mercadona",),
    },
    "scrape-carrefour-daily": {
        "task": "apps.scraping.tasks.run_spider",
        "schedule": crontab(minute=30, hour=6),
        "args": ("carrefour",),
    },
}

# ── DRF Spectacular (OpenAPI) ────────────────────────

SPECTACULAR_SETTINGS = {
    "TITLE": "BargAIn API",
    "DESCRIPTION": "API del Asistente Unificado de Rutas y Ahorro",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ── Logging ──────────────────────────────────────────

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_JSON_FORMAT = os.environ.get("LOG_JSON_FORMAT", "true").lower() == "true"

SHARED_LOG_PROCESSORS = [
    structlog.contextvars.merge_contextvars,
    structlog.stdlib.add_logger_name,
    structlog.stdlib.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
]

LOG_RENDERER = (
    structlog.processors.JSONRenderer()
    if LOG_JSON_FORMAT
    else structlog.dev.ConsoleRenderer(colors=False)
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structlog": {
            "()": "structlog.stdlib.ProcessorFormatter",
            "processor": LOG_RENDERER,
            "foreign_pre_chain": SHARED_LOG_PROCESSORS,
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structlog",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    },
}

structlog.configure(
    processors=[
        *SHARED_LOG_PROCESSORS,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)
