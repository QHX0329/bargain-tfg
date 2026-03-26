"""Tareas Celery relacionadas con scraping.

Cada spider se ejecuta en un proceso separado para aislar el reactor
de Twisted de Celery y evitar conflictos de event loop.
"""

import os
import subprocess
import sys

import structlog
from celery import shared_task

logger = structlog.get_logger(__name__)

DEFAULT_SPIDER_TIMEOUT_SECONDS = 1800


SPIDER_MAP: dict[str, str] = {
    "mercadona": "bargain_scraping.spiders.mercadona.MercadonaSpider",
    "carrefour": "bargain_scraping.spiders.carrefour.CarrefourSpider",
    "lidl": "bargain_scraping.spiders.lidl.LidlSpider",
    "dia": "bargain_scraping.spiders.dia.DiaSpider",
    "costco": "bargain_scraping.spiders.costco.CostcoSpider",
    "alcampo": "bargain_scraping.spiders.alcampo.AlcampoSpider",
    "hipercor": "bargain_scraping.spiders.hipercor.HipercorSpider",
}


def _resolve_spider_timeout_seconds(spider_name: str) -> int:
    """Permite ajustar timeout global o por spider sin tocar codigo."""
    env_keys = [
        f"SCRAPING_TIMEOUT_{spider_name.upper()}_SECONDS",
        "SCRAPING_SPIDER_TIMEOUT_SECONDS",
    ]

    for env_key in env_keys:
        raw_value = os.environ.get(env_key)
        if not raw_value:
            continue

        try:
            timeout = int(raw_value)
        except ValueError:
            logger.warning(
                "Timeout de scraping invalido; se usa valor por defecto",
                spider=spider_name,
                env_key=env_key,
                raw_value=raw_value,
            )
            break

        if timeout > 0:
            return timeout

        logger.warning(
            "Timeout de scraping no positivo; se usa valor por defecto",
            spider=spider_name,
            env_key=env_key,
            raw_value=raw_value,
        )
        break

    return DEFAULT_SPIDER_TIMEOUT_SECONDS


def _decode_output_tail(stdout: bytes | None, limit: int = 2000) -> str:
    """Recorta la cola del log para dejar contexto util en errores."""
    if not stdout:
        return ""
    return stdout.decode(errors="replace")[-limit:]


def _resolve_backend_dir() -> str:
    """Resuelve la raiz del proyecto Django dentro del contenedor."""
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _resolve_scraping_dir() -> str:
    """Localiza el proyecto Scrapy con validacion explicita.

    La busqueda por candidatos evita depender de una estructura de paths
    fragil entre entorno local y contenedores Docker.
    """
    backend_dir = _resolve_backend_dir()
    repo_root = os.path.abspath(os.path.join(backend_dir, ".."))

    candidates: list[str] = []
    env_dir = os.environ.get("SCRAPING_PROJECT_DIR")
    if env_dir:
        candidates.append(env_dir)

    candidates.extend(
        [
            os.path.join(repo_root, "scraping"),
            "/scraping",
        ]
    )

    for candidate in candidates:
        scrapy_cfg = os.path.join(candidate, "scrapy.cfg")
        package_dir = os.path.join(candidate, "bargain_scraping")
        if os.path.isfile(scrapy_cfg) and os.path.isdir(package_dir):
            return candidate

    checked = ", ".join(candidates)
    raise FileNotFoundError(
        "No se encontro el proyecto Scrapy. "
        f"Rutas comprobadas: {checked}. "
        "Monta ./scraping en el contenedor o define SCRAPING_PROJECT_DIR."
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def run_spider(self, spider_name: str) -> dict[str, str]:
    """Lanza un spider de Scrapy en un proceso hijo separado via subprocess.

    subprocess.Popen no tiene la restriccion de multiprocessing.Process
    sobre procesos daemonicos, lo que permite su uso desde workers Celery.
    """
    if spider_name not in SPIDER_MAP:
        raise ValueError(
            f"Spider desconocido: '{spider_name}'. "
            f"Spiders disponibles: {list(SPIDER_MAP.keys())}"
        )

    spider_path = SPIDER_MAP[spider_name]
    backend_dir = _resolve_backend_dir()
    scraping_dir = _resolve_scraping_dir()
    runner = os.path.join(os.path.dirname(__file__), "runner.py")
    timeout_seconds = _resolve_spider_timeout_seconds(spider_name)

    logger.info(
        "Iniciando spider",
        spider=spider_name,
        path=spider_path,
        timeout_seconds=timeout_seconds,
    )

    env = os.environ.copy()
    env.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

    proc = subprocess.Popen(
        [sys.executable, runner, spider_path, scraping_dir, backend_dir],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
    )
    try:
        stdout, _ = proc.communicate(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, _ = proc.communicate()
        output = _decode_output_tail(stdout)
        logger.error(
            "Spider timeout",
            spider=spider_name,
            timeout_seconds=timeout_seconds,
            output=output,
        )
        raise RuntimeError(
            f"Spider '{spider_name}' timeout tras {timeout_seconds}s. "
            f"Ultima salida: {output or 'sin salida'}"
        )

    if proc.returncode != 0:
        output = _decode_output_tail(stdout)
        error_msg = f"Spider '{spider_name}' termino con codigo {proc.returncode}"
        logger.error("Spider fallo", spider=spider_name, exit_code=proc.returncode, output=output)
        raise self.retry(exc=RuntimeError(error_msg))

    logger.info("Spider completado exitosamente", spider=spider_name)
    return {"status": "ok", "spider": spider_name}
