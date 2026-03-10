"""Configuración para tests."""

from .base import *  # noqa: F401, F403

DEBUG = False
SECRET_KEY = "test-secret-key-not-for-production"

# BD en memoria más rápida para tests (fallback a PostGIS si se configura)
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "bargain_test",
        "USER": "bargain_test",
        "PASSWORD": "test_password",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

# Desactivar throttling en tests
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405

# Email en memoria
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Celery síncrono en tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Password hasher rápido para tests
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
