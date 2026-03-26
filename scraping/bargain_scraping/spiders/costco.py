"""Spider de Costco con estrategia hibrida HTML + catalogos PDF.

Costco muestra promociones en paginas de contenido y enlaza catalogos PDF con
listados de productos/precios. Este spider combina ambas fuentes:

1. Descubre links de "seleccion" y PDF desde paginas publicas.
2. Extrae items directos de HTML cuando hay bloques con nombre/precio.
3. Parsea texto de PDF para obtener filas de producto con precio.
"""

from __future__ import annotations

import io
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin

import scrapy
import structlog

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.costco.es"
START_URLS = [
    "https://www.costco.es/catalogo-precios-promos",
    "https://www.costco.es/selecciones",
]

PDF_LINK_PATTERN = re.compile(r"https://link\.costco\.es/custloads/\d+/md_\d+\.pdf", re.I)
SELECTION_LINK_PATTERN = re.compile(r'href="(?P<href>/seleccion/[^"]+)"', re.I)
HTML_PRODUCT_PATTERN = re.compile(
    r'<a[^>]+href="(?P<href>/[^\"]+/p/[^\"]+)"[^>]*>\s*(?P<name>[^<]{6,200}?)\s*</a>'
    r"[\s\S]{0,450}?(?P<price>[0-9]+,[0-9]{2})\s*€",
    re.I,
)
PDF_LINE_PRICE_PATTERN = re.compile(
    r"(?P<name>[^\n]{8,220}?)\s+(?P<price>[0-9]{1,3}(?:[\.,][0-9]{2}))\s*€"
)


class CostcoSpider(scrapy.Spider):
    """Spider de Costco para obtener productos y precios desde promos/catalogos."""

    name = "costco"
    allowed_domains = ["www.costco.es", "costco.es", "link.costco.es"]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }

    def start_requests(self):
        """Arranca desde paginas publicas que exponen promociones y PDFs."""
        for url in START_URLS:
            yield scrapy.Request(
                url=url,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_page,
                errback=self.errback_handler,
            )

    def parse_page(self, response):
        """Descubre enlaces y extrae items directos cuando hay precio en HTML."""
        html_text = response.text

        for item in _extract_products_from_html(html_text, response.url):
            yield item

        for pdf_url in _extract_pdf_links(html_text):
            if pdf_url in self._seen_pdfs:
                continue
            self._seen_pdfs.add(pdf_url)
            yield scrapy.Request(
                url=pdf_url,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_pdf,
                errback=self.errback_handler,
                dont_filter=True,
            )

        for selection_url in _extract_selection_links(html_text, response.url):
            if selection_url in self._seen_pages:
                continue
            self._seen_pages.add(selection_url)
            yield scrapy.Request(
                url=selection_url,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_page,
                errback=self.errback_handler,
            )

    def parse_pdf(self, response):
        """Parsea un PDF de catalogo y extrae lineas producto/precio."""
        rows = _extract_rows_from_pdf_bytes(response.body, response.url)
        if not rows:
            logger.warning("Costco PDF sin filas parseables", url=response.url)
            return

        for row in rows:
            yield ProductPriceItem(
                product_name=row["name"],
                store_chain="Costco",
                price=row["price"],
                unit_price=None,
                offer_price=None,
                offer_end_date=None,
                barcode=None,
                category_name="Catalogo",
                url=response.url,
            )

    def errback_handler(self, failure):
        """Registra fallos de red sin frenar la ejecucion."""
        logger.error(
            "Error de red en Costco spider",
            url=failure.request.url,
            error=str(failure.value),
        )

    @property
    def _seen_pages(self) -> set[str]:
        if not hasattr(self, "__seen_pages"):
            self.__seen_pages: set[str] = set(START_URLS)
        return self.__seen_pages

    @property
    def _seen_pdfs(self) -> set[str]:
        if not hasattr(self, "__seen_pdfs"):
            self.__seen_pdfs: set[str] = set()
        return self.__seen_pdfs


def _extract_pdf_links(html_text: str) -> list[str]:
    """Devuelve enlaces PDF unicos de catalogo."""
    return sorted({match.group(0) for match in PDF_LINK_PATTERN.finditer(html_text)})


def _extract_selection_links(html_text: str, base_url: str) -> list[str]:
    """Devuelve enlaces unicos de paginas "seleccion"."""
    return sorted(
        {
            urljoin(base_url, match.group("href"))
            for match in SELECTION_LINK_PATTERN.finditer(html_text)
        }
    )


def _extract_products_from_html(html_text: str, base_url: str) -> list[ProductPriceItem]:
    """Extrae productos cuando la pagina trae nombre y precio en el HTML."""
    items: list[ProductPriceItem] = []
    seen_urls: set[str] = set()

    for match in HTML_PRODUCT_PATTERN.finditer(html_text):
        href = match.group("href").strip()
        name = _clean_text(match.group("name"))
        price = _parse_price(match.group("price"))
        if not href or not name or price is None:
            continue

        full_url = urljoin(base_url, href)
        if full_url in seen_urls:
            continue
        seen_urls.add(full_url)

        items.append(
            ProductPriceItem(
                product_name=name,
                store_chain="Costco",
                price=price,
                unit_price=None,
                offer_price=None,
                offer_end_date=None,
                barcode=None,
                category_name=None,
                url=full_url,
            )
        )

    return items


def _extract_rows_from_pdf_bytes(pdf_bytes: bytes, source_url: str) -> list[dict]:
    """Extrae filas producto/precio desde texto de un PDF."""
    try:
        from pypdf import PdfReader
    except Exception:
        logger.warning("pypdf no disponible, se omite parseo PDF", url=source_url)
        return []

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:
        logger.warning("No se pudo leer PDF de Costco", url=source_url, error=str(exc))
        return []

    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for raw_line in text.splitlines():
        line = _clean_text(raw_line)
        if not line:
            continue

        match = PDF_LINE_PRICE_PATTERN.search(line)
        if not match:
            continue

        name = _clean_text(match.group("name"))
        price = _parse_price(match.group("price"))
        if price is None or not _looks_like_product_name(name):
            continue

        key = (name.casefold(), str(price))
        if key in seen:
            continue
        seen.add(key)
        rows.append({"name": name, "price": price})

    return rows


def _looks_like_product_name(name: str) -> bool:
    """Filtra lineas de ruido que no parecen producto."""
    lowered = name.casefold()
    if len(name) < 8:
        return False
    if any(token in lowered for token in ("costco", "pagina", "valido", "oferta hasta")):
        return False
    alpha_count = sum(char.isalpha() for char in name)
    return alpha_count >= 4


def _clean_text(value: str) -> str:
    """Normaliza espacios para analisis textual."""
    return re.sub(r"\s+", " ", value).strip()


def _browser_user_agent() -> str:
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )


def _parse_price(text: str) -> Decimal | None:
    """Convierte texto de precio con coma o punto decimal a Decimal."""
    if not text:
        return None
    cleaned = text.strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None
