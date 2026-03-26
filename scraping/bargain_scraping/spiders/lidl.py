"""Spider de Lidl basado en datos embebidos en HTML de búsqueda.

La SPA de Lidl cambia con frecuencia y las categorías antiguas devuelven 404.
Para estabilizar el scraping, esta versión consume los blobs de datos
estructurados que llegan embebidos en el HTML SSR de /q/search.
"""

import json
import re
from decimal import Decimal, InvalidOperation

import scrapy
import structlog

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

NUXT_DATA_PATTERN = re.compile(
    r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>',
    re.S,
)

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
        seen_ids: set[int] = set()
        extracted = 0

        for product in _extract_embedded_products(response.text):
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

    Lidl publica los resultados en un script `__NUXT_DATA__`. Parsearlo una
    sola vez evita recorrer y deserializar bloques gigantes repetidamente.
    Si el payload cambia, se conserva el escaneo balanceado como fallback.
    """
    nuxt_payload = _extract_nuxt_payload(decoded_html)
    if nuxt_payload:
        try:
            payload = json.loads(nuxt_payload)
            products = _find_products_in_tree(payload)
            if isinstance(payload, list):
                return [_resolve_product_payload(product, payload) for product in products]
            return products
        except json.JSONDecodeError:
            logger.warning("No se pudo parsear __NUXT_DATA__ de Lidl")

    return _extract_products_by_object_scan(decoded_html)


def _extract_nuxt_payload(decoded_html: str) -> str | None:
    match = NUXT_DATA_PATTERN.search(decoded_html)
    if not match:
        return None
    return match.group(1)


def _find_products_in_tree(root: object) -> list[dict]:
    products: list[dict] = []
    stack: list[object] = [root]

    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            if "productId" in current and "title" in current:
                products.append(current)
                continue
            stack.extend(current.values())
        elif isinstance(current, list):
            stack.extend(current)

    return products


def _resolve_nuxt_value(value: object, payload: list[object], max_hops: int = 20) -> object:
    """Sigue referencias enteras del payload de Nuxt sin expandir todo el árbol."""
    current = value
    hops = 0
    while (
        isinstance(current, int)
        and not isinstance(current, bool)
        and 0 <= current < len(payload)
        and hops < max_hops
    ):
        next_value = payload[current]
        if next_value is current:
            break
        current = next_value
        hops += 1

    return current


def _resolve_price_block(value: object, payload: list[object]) -> object:
    resolved = _resolve_nuxt_value(value, payload)
    if not isinstance(resolved, dict):
        return resolved

    return {
        "price": _resolve_nuxt_value(resolved.get("price"), payload),
        "oldPrice": _resolve_nuxt_value(resolved.get("oldPrice"), payload),
        "basePrice": _resolve_base_price_block(resolved.get("basePrice"), payload),
    }


def _resolve_base_price_block(value: object, payload: list[object]) -> object:
    resolved = _resolve_nuxt_value(value, payload)
    if not isinstance(resolved, dict):
        return resolved

    return {
        "price": _resolve_nuxt_value(resolved.get("price"), payload),
        "prefix": _resolve_nuxt_value(resolved.get("prefix"), payload),
        "text": _resolve_nuxt_value(resolved.get("text"), payload),
    }


def _resolve_regions_prices(value: object, payload: list[object]) -> dict[str, dict]:
    resolved = _resolve_nuxt_value(value, payload)
    if not isinstance(resolved, dict):
        return {}

    region_prices: dict[str, dict] = {}
    for region_key, region_value in resolved.items():
        region_data = _resolve_nuxt_value(region_value, payload)
        if not isinstance(region_data, dict):
            continue

        current_price = _resolve_price_block(
            region_data.get("currentPrice") or region_data.get("currentLidlPlusPrice"),
            payload,
        )
        if not current_price:
            continue

        region_prices[str(_resolve_nuxt_value(region_key, payload))] = {
            "currentPrice": current_price,
        }

    return region_prices


def _resolve_product_payload(product: dict, payload: list[object]) -> dict:
    return {
        "productId": _resolve_nuxt_value(product.get("productId"), payload),
        "title": _resolve_nuxt_value(product.get("title"), payload),
        "canonicalPath": _resolve_nuxt_value(product.get("canonicalPath"), payload),
        "price": _resolve_price_block(product.get("price"), payload),
        "regionsPrices": _resolve_regions_prices(product.get("regionsPrices"), payload),
    }


def _extract_products_by_object_scan(decoded_html: str) -> list[dict]:
    """Fallback conservador si desaparece el payload principal de Nuxt."""
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

    raw_price = product.get("price")
    price_info = raw_price if isinstance(raw_price, dict) else {}
    price = _to_decimal(price_info.get("price", raw_price))
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
