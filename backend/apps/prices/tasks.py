"""Tareas Celery relacionadas con precios."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, ignore_result=True)
def expire_stale_prices(self) -> dict[str, int]:
    """Marca precios expirados de scraping y crowdsourcing.

    Placeholder mientras no exista el modelo/servicio definitivo.
    """
    logger.info(
        "expire_stale_prices placeholder: no hay modelo de precios todavia."
    )
    return {"scraping": 0, "crowdsourcing": 0}
