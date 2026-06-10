"""Configuración de desarrollo."""

import structlog

from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Debug toolbar
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
INTERNAL_IPS = ["127.0.0.1"]

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# Rate limiting holgado en desarrollo (evita throttling al generar capturas/tests
# locales). En producción se mantienen los límites estrictos de base.py.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "100000/hour",
    "user": "100000/hour",
    "assistant": "1000/hour",
    "ocr": "1000/hour",
}

# Logging más verboso
LOGGING["loggers"]["apps"]["level"] = "DEBUG"  # noqa: F405
LOGGING["root"]["level"] = "DEBUG"  # noqa: F405
LOGGING["formatters"]["structlog"]["processor"] = structlog.dev.ConsoleRenderer(  # noqa: F405
    colors=False
)
