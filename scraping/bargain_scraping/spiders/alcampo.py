"""Spider de Alcampo basado en HTML SSR del supermercado online.

Alcampo expone tarjetas de producto renderizadas en el HTML inicial para
categorias de alimentacion, incluyendo enlace, nombre y precio en atributos
estables (`data-test`).
"""

from __future__ import annotations

import html
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin

import scrapy
import structlog

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.alcampo.es"
START_URL = "https://www.alcampo.es/compra-online/alimentacion/c/W1001"
MAX_CATEGORY_LINKS = 30

ALCAMPO_PRODUCT_PATTERN = re.compile(
    r'data-test="fop-product-link"[^>]*href="(?P<href>/products/[^"]+)"[^>]*>'
    r"\s*<span[^>]*>(?P<name>.*?)</span>[\s\S]*?"
    r'data-test="fop-price"[^>]*>(?P<price>[0-9]+,[0-9]{2})\s*€',
    re.IGNORECASE,
)
UNIT_PRICE_PATTERN = re.compile(
    r'data-test="fop-price-per-unit"[^>]*>\((?P<value>[0-9]+,[0-9]{2})\s*€',
    re.IGNORECASE,
)


class AlcampoSpider(scrapy.Spider):
    """Spider para extraer productos y precios de Alcampo."""

    name = "alcampo"
    allowed_domains = ["www.alcampo.es", "alcampo.es"]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.0,
    }

    def start_requests(self):
        """Comienza por una categoria raiz y expande hacia subcategorias."""
        yield scrapy.Request(
            url=START_URL,
            headers={"User-Agent": _browser_user_agent()},
            callback=self.parse_category,
            errback=self.errback_handler,
        )

    def parse_category(self, response):
        """Extrae productos y descubre nuevas categorias de alimentacion."""
        extracted = 0
        seen_urls: set[str] = set()

        for row in _extract_product_rows(response.text):
            product_url = urljoin(response.url, row["href"])
            if product_url in seen_urls:
                continue
            seen_urls.add(product_url)

            extracted += 1
            yield ProductPriceItem(
                product_name=row["name"],
                store_chain="Alcampo",
                price=row["price"],
                unit_price=row.get("unit_price"),
                offer_price=None,
                offer_end_date=None,
                barcode=_extract_barcode_from_url(row["href"]),
                category_name=None,
                url=product_url,
            )

        if extracted == 0:
            logger.warning("Alcampo sin productos en pagina", url=response.url)

        for link in _extract_category_links(response.text, response.url):
            if link in self._seen_links:
                continue
            if len(self._seen_links) >= MAX_CATEGORY_LINKS:
                break

            self._seen_links.add(link)
            yield scrapy.Request(
                url=link,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_category,
                errback=self.errback_handler,
            )

    def errback_handler(self, failure):
        """Registra errores de red sin interrumpir el spider."""
        logger.error(
            "Error de red en Alcampo spider",
            url=failure.request.url,
            error=str(failure.value),
        )

    @property
    def _seen_links(self) -> set[str]:
        """Estado interno para deduplicar expansion de categorias."""
        if not hasattr(self, "__seen_links"):
            self.__seen_links: set[str] = {START_URL}
        return self.__seen_links


def _extract_product_rows(html_text: str) -> list[dict]:
    """Extrae filas de producto con nombre, enlace y precio."""
    rows: list[dict] = []
    for match in ALCAMPO_PRODUCT_PATTERN.finditer(html_text):
        href = match.group("href").strip()
        name = _clean_html_text(match.group("name"))
        price = _parse_price(match.group("price"))
        if not href or not name or price is None:
            continue

        unit_window = html_text[match.end() : match.end() + 1200]
        unit_match = UNIT_PRICE_PATTERN.search(unit_window)
        unit_price = _parse_price(unit_match.group("value")) if unit_match else None

        rows.append(
            {
                "href": href,
                "name": name,
                "price": price,
                "unit_price": unit_price,
            }
        )
    return rows


def _extract_category_links(html_text: str, base_url: str) -> list[str]:
    """Descubre enlaces de categoria de alimentacion para ampliar cobertura."""
    links = {
        urljoin(base_url, match.group(1))
        for match in re.finditer(r'href="(/compra-online/alimentacion/c/W\d+)"', html_text)
    }
    return sorted(links)


def _extract_barcode_from_url(path: str) -> str | None:
    """Intenta inferir un identificador numerico desde el slug final."""
    match = re.search(r"/(\d+)$", path)
    return match.group(1) if match else None


def _clean_html_text(raw_value: str) -> str:
    """Limpia etiquetas y entidades HTML en texto inline."""
    without_tags = re.sub(r"<[^>]+>", " ", raw_value)
    unescaped = html.unescape(without_tags)
    return re.sub(r"\s+", " ", unescaped).strip()


def _browser_user_agent() -> str:
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )


def _parse_price(text: str) -> Decimal | None:
    """Convierte texto de precio europeo a Decimal."""
    if not text:
        return None
    cleaned = text.strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None
