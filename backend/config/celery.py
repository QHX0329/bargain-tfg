"""Configuración de Celery para el proyecto BargAIn."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("bargain")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Tarea de depuración para verificar que Celery funciona."""
    print(f"Request: {self.request!r}")
