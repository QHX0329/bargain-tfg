"""Tareas Celery relacionadas con scraping.

Cada spider se ejecuta en un proceso separado para aislar el reactor
de Twisted de Celery y evitar conflictos de event loop.
"""

import importlib
import multiprocessing
import os
import sys

import structlog
from celery import shared_task

logger = structlog.get_logger(__name__)

# ── Mapa de spiders disponibles ───────────────────────────────────────────────

SPIDER_MAP: dict[str, str] = {
    "mercadona": "bargain_scraping.spiders.mercadona.MercadonaSpider",
    "carrefour": "bargain_scraping.spiders.carrefour.CarrefourSpider",
    "lidl": "bargain_scraping.spiders.lidl.LidlSpider",
    "dia": "bargain_scraping.spiders.dia.DiaSpider",
}


# ── Función de proceso hijo ───────────────────────────────────────────────────


def _run_spider_process(spider_cls_path: str) -> None:
    """Ejecuta un spider de Scrapy en un proceso hijo aislado.

    Al ejecutarse en un proceso aparte, el reactor Twisted de Scrapy no
    interfiere con el event loop de Celery.

    Args:
        spider_cls_path: Ruta dotted al spider, ej.
            ``bargain_scraping.spiders.mercadona.MercadonaSpider``.
    """
    # Configurar Django en el proceso hijo
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

    # Añadir backend al path para que Django encuentre apps/ y config/
    _backend_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    if _backend_dir not in sys.path:
        sys.path.insert(0, _backend_dir)

    import django

    django.setup()

    from scrapy.crawler import CrawlerProcess
    from scrapy.utils.project import get_project_settings

    # Configurar settings de Scrapy (desde scraping/)
    _scraping_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "scraping")
    )
    if _scraping_dir not in sys.path:
        sys.path.insert(0, _scraping_dir)

    os.chdir(_scraping_dir)

    settings = get_project_settings()
    process = CrawlerProcess(settings)

    # Importar dinámicamente la clase del spider
    module_path, class_name = spider_cls_path.rsplit(".", 1)
    module = importlib.import_module(module_path)
    spider_cls = getattr(module, class_name)

    process.crawl(spider_cls)
    process.start()


# ── Tarea Celery principal ────────────────────────────────────────────────────


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def run_spider(self, spider_name: str) -> dict[str, str]:
    """Lanza un spider de Scrapy en un proceso hijo separado.

    Args:
        spider_name: Nombre del spider a lanzar (mercadona, carrefour, lidl, dia).

    Returns:
        Dict con ``{"status": "ok", "spider": spider_name}``.

    Raises:
        ValueError: Si el nombre del spider no existe en SPIDER_MAP.
        self.retry: Si el proceso hijo termina con código de error (!= 0).
    """
    if spider_name not in SPIDER_MAP:
        raise ValueError(
            f"Spider desconocido: '{spider_name}'. "
            f"Spiders disponibles: {list(SPIDER_MAP.keys())}"
        )

    spider_path = SPIDER_MAP[spider_name]

    logger.info("Iniciando spider", spider=spider_name, path=spider_path)

    p = multiprocessing.Process(target=_run_spider_process, args=(spider_path,))
    p.start()
    p.join(timeout=3600)  # Máximo 1 hora por ejecución

    if p.exitcode != 0:
        exit_code = p.exitcode
        error_msg = f"Spider '{spider_name}' terminó con código {exit_code}"
        logger.error("Spider falló", spider=spider_name, exit_code=exit_code)
        raise self.retry(exc=RuntimeError(error_msg))

    logger.info("Spider completado exitosamente", spider=spider_name)
    return {"status": "ok", "spider": spider_name}
