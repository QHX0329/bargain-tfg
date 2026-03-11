"""
Paquete de configuración de BargAIn.

Importa la app de Celery para que las tareas se autodescubran
cuando Django arranca (necesario para `celery -A config`).
"""

from .celery import app as celery_app

__all__ = ["celery_app"]
