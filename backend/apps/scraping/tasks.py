"""Tareas Celery relacionadas con scraping."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, ignore_result=True)
def run_spider(self, spider_name: str) -> str:
    """Lanza un spider de scraping por nombre.

    El scraper vive en un proyecto separado (carpeta /scraping), por lo que
    esta tarea actua como punto de integracion y se implementara mas adelante.
    """
    if not spider_name:
        logger.warning("run_spider called without spider_name; skipping.")
        return "skipped"

    logger.info("run_spider placeholder: requested spider '%s'.", spider_name)
    return spider_name
