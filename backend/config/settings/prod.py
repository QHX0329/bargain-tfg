"""Configuración de producción."""

import logging
import os
import sys

import sentry_sdk
from django.core.exceptions import ImproperlyConfigured
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from .base import *  # noqa: F401, F403


def _split_env_list(key: str) -> list[str]:
    """Parsea variables de entorno separadas por coma eliminando espacios."""
    return [item.strip() for item in os.environ.get(key, "").split(",") if item.strip()]


DEBUG = False
ALLOWED_HOSTS = _split_env_list("ALLOWED_HOSTS")


def _is_web_server_process() -> bool:
    """Detecta procesos HTTP donde ALLOWED_HOSTS sí es obligatorio."""
    argv = [arg.lower() for arg in sys.argv]
    web_markers = ("gunicorn", "uvicorn", "daphne", "runserver")
    return any(any(marker in arg for marker in web_markers) for arg in argv)


if _is_web_server_process() and not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "ALLOWED_HOSTS debe definirse en producción (lista separada por comas)."
    )

if SECRET_KEY == "INSECURE-dev-key-change-me":  # noqa: F405
    raise ImproperlyConfigured("SECRET_KEY insegura en producción.")

CSRF_TRUSTED_ORIGINS = _split_env_list("CSRF_TRUSTED_ORIGINS")
if not CSRF_TRUSTED_ORIGINS:
    # Reutiliza CORS como fallback razonable para despliegues sencillos en staging/prod.
    CSRF_TRUSTED_ORIGINS = [
        origin
        for origin in CORS_ALLOWED_ORIGINS  # noqa: F405
        if origin.startswith("http://") or origin.startswith("https://")
    ]

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
# Render termina SSL en el load balancer y reenvía HTTP internamente.
# SECURE_PROXY_SSL_HEADER evita redirect loops al indicar que X-Forwarded-Proto
# es la fuente de verdad para el esquema HTTPS.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Static files
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Sentry
SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    sentry_logging = LoggingIntegration(level=logging.INFO, event_level=logging.ERROR)
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            sentry_logging,
        ],
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        release=os.environ.get("SENTRY_RELEASE"),
        send_default_pii=False,
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        profiles_sample_rate=float(os.environ.get("SENTRY_PROFILES_SAMPLE_RATE", "0.0")),
    )

# Rate limiting en producción: estricto para usuarios, pero con margen
# suficiente para demos públicas con cold starts y reintentos del cliente.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "300/hour",
    "user": "1000/hour",
    "assistant": "30/hour",
    "ocr": "60/hour",
}
