"""Spider de Lidl basado en datos embebidos en HTML de búsqueda.

La SPA de Lidl cambia con frecuencia y las categorías antiguas devuelven 404.
Para estabilizar el scraping, esta versión consume los blobs de datos
estructurados que llegan embebidos en el HTML SSR de /q/search.
"""

import html
import json
import re
from decimal import Decimal, InvalidOperation

import scrapy
import structlog

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

SEARCH_TERMS = [
    "leche",
    "huevos",
    "pan",
    "fruta",
    "carne",
    "pescado",
    "bebidas",
    "conservas",
]


class LidlSpider(scrapy.Spider):
    """Spider para Lidl usando el payload de búsqueda embebido en HTML."""

    name = "lidl"
    allowed_domains = ["www.lidl.es"]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
    }

    def start_requests(self):
        """Genera búsquedas representativas de alimentación."""
        for term in SEARCH_TERMS:
            yield scrapy.Request(
                url=f"https://www.lidl.es/q/search?q={term}",
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_search,
                errback=self.errback_handler,
            )

    def parse_search(self, response):
        """Extrae productos desde los objetos JSON embebidos en el HTML."""
        decoded = html.unescape(response.text)
        seen_ids: set[int] = set()
        extracted = 0

        for product in _extract_embedded_products(decoded):
            product_id = product.get("productId")
            if not isinstance(product_id, int) or product_id in seen_ids:
                continue

            seen_ids.add(product_id)
            item = _product_to_item(product, response.url)
            if item is None:
                continue

            extracted += 1
            yield item

        if extracted == 0:
            logger.warning("No se encontraron productos embebidos en Lidl", url=response.url)

    def errback_handler(self, failure):
        """Manejo de errores de red en Lidl."""
        status = getattr(failure.value, "response", None)
        if status and hasattr(status, "status") and status.status == 403:
            logger.warning(
                "Anti-bot 403 en Lidl — request omitida",
                url=failure.request.url,
            )
        else:
            logger.error(
                "Error de red en Lidl spider",
                url=failure.request.url,
                error=str(failure.value),
            )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _browser_user_agent() -> str:
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )


def _extract_embedded_products(decoded_html: str) -> list[dict]:
    """Extrae objetos de producto embebidos en HTML SSR de Lidl.

    El payload llega serializado con múltiples bloques JSON. Para evitar
    depender de claves de alto nivel inestables, se localizan objetos que
    contienen `productId` y luego se parsean de forma balanceada.
    """
    products: list[dict] = []
    marker = '"productId":'
    idx = 0

    while True:
        marker_pos = decoded_html.find(marker, idx)
        if marker_pos == -1:
            break

        obj_start = decoded_html.rfind("{", 0, marker_pos)
        if obj_start == -1:
            idx = marker_pos + len(marker)
            continue

        obj_end = _find_json_object_end(decoded_html, obj_start)
        if obj_end == -1:
            idx = marker_pos + len(marker)
            continue

        raw_obj = decoded_html[obj_start : obj_end + 1]
        try:
            parsed = json.loads(raw_obj)
            if isinstance(parsed, dict) and "productId" in parsed and "title" in parsed:
                products.append(parsed)
        except json.JSONDecodeError:
            pass

        idx = obj_end + 1

    return products


def _find_json_object_end(text: str, start_index: int) -> int:
    """Devuelve el índice de cierre de un objeto JSON balanceado."""
    depth = 0
    in_string = False
    escape = False

    for i in range(start_index, len(text)):
        char = text[i]

        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return i

    return -1


def _product_to_item(product: dict, fallback_url: str) -> ProductPriceItem | None:
    """Mapea un producto embebido de Lidl al item común del pipeline."""
    name = str(product.get("title") or "").strip()
    if not name:
        return None

    price_info = product.get("price") or {}
    price = _to_decimal(price_info.get("price"))
    if price is None:
        return None

    regions_prices = product.get("regionsPrices") or {}
    unit_price = None
    offer_price = None

    if isinstance(regions_prices, dict):
        first_region = next(iter(regions_prices.values()), None)
        if isinstance(first_region, dict):
            current_price = first_region.get("currentPrice") or {}
            base_price = current_price.get("basePrice") or {}
            unit_price = _to_decimal(base_price.get("price"))
            old_price = _to_decimal(current_price.get("oldPrice"))
            if old_price is not None and old_price > price:
                offer_price = price
                price = old_price

    canonical_path = str(product.get("canonicalPath") or "").strip()
    product_url = f"https://www.lidl.es{canonical_path}" if canonical_path else fallback_url

    return ProductPriceItem(
        product_name=name,
        store_chain="Lidl",
        price=price,
        unit_price=unit_price,
        offer_price=offer_price,
        offer_end_date=None,
        barcode=str(product.get("productId")) if product.get("productId") else None,
        category_name=None,
        url=product_url,
    )


def _to_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, (int, float, str)):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            return None
    return None

def _parse_price(text: str) -> Decimal | None:
    """Convierte texto de precio ('1,29 €') a Decimal o None."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d,\.]", "", text).replace(",", ".")
    try:
        return Decimal(cleaned) if cleaned else None
    except InvalidOperation:
        return None
