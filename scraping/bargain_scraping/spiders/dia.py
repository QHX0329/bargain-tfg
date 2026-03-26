"""Spider de DIA basado en estado embebido en el HTML (vike_pageContext)."""

import json
import re
from decimal import Decimal, InvalidOperation

import scrapy
import structlog

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

START_URLS = [
    "https://www.dia.es/",
    "https://www.dia.es/search?q=leche",
    "https://www.dia.es/search?q=pan",
    "https://www.dia.es/search?q=fruta",
]


class DiaSpider(scrapy.Spider):
    """Spider de DIA que extrae productos desde JSON SSR embebido."""

    name = "dia"
    allowed_domains = ["www.dia.es"]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
    }

    def start_requests(self):
        """Genera requests a home y búsquedas públicas de DIA."""
        for url in START_URLS:
            yield scrapy.Request(
                url=url,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_page,
                errback=self.errback_handler,
            )

    def parse_page(self, response):
        """Parsea el script vike_pageContext y mapea productos al item común."""
        page_context = _extract_page_context(response.text)
        if not page_context:
            logger.warning("No se pudo extraer vike_pageContext en DIA", url=response.url)
            return

        products = _extract_products_from_page_context(page_context)
        if not products:
            logger.warning("Sin productos en estado embebido de DIA", url=response.url)
            return

        seen_skus: set[str] = set()
        for product in products:
            item = _product_to_item(product, response.url)
            if item is None:
                continue

            sku = str(item.get("barcode") or "")
            if sku and sku in seen_skus:
                continue

            if sku:
                seen_skus.add(sku)
            yield item

    def errback_handler(self, failure):
        """Manejo de errores de red en DIA."""
        status = getattr(failure.value, "response", None)
        if status and hasattr(status, "status") and status.status == 403:
            logger.warning(
                "Anti-bot 403 en DIA — página omitida",
                url=failure.request.url,
            )
        else:
            logger.error(
                "Error de red en DIA spider",
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


def _extract_page_context(html_text: str) -> dict | None:
    """Extrae y parsea el JSON del script id='vike_pageContext'."""
    match = re.search(
        r'<script id="vike_pageContext" type="application/json">(.*?)</script>',
        html_text,
        flags=re.DOTALL,
    )
    if not match:
        return None

    raw_json = match.group(1).strip()
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _extract_products_from_page_context(page_context: dict) -> list[dict]:
    """Obtiene productos de carruseles embebidos en INITIAL_STATE.home."""
    initial_state = page_context.get("INITIAL_STATE")
    if not isinstance(initial_state, dict):
        return []

    home_state = initial_state.get("home")
    if not isinstance(home_state, dict):
        return []

    content = home_state.get("content")
    if not isinstance(content, dict):
        return []

    sections = content.get("sections")
    if not isinstance(sections, list):
        return []

    products: list[dict] = []
    for section in sections:
        if not isinstance(section, dict):
            continue
        section_content = section.get("content")
        if not isinstance(section_content, list):
            continue

        for entry in section_content:
            if not isinstance(entry, dict):
                continue
            entry_products = entry.get("products")
            if isinstance(entry_products, list):
                for product in entry_products:
                    if isinstance(product, dict):
                        products.append(product)

    return products


def _product_to_item(product: dict, fallback_url: str) -> ProductPriceItem | None:
    """Mapea el producto de DIA al item común del pipeline."""
    name = str(product.get("display_name") or "").strip()
    if not name:
        return None

    prices = product.get("prices")
    if not isinstance(prices, dict):
        return None

    current_price = _to_decimal(prices.get("price"))
    regular_price = _to_decimal(prices.get("strikethrough_price"))
    if current_price is None:
        return None

    is_promo = bool(prices.get("is_promo_price"))
    offer_price = current_price if is_promo else None
    base_price = regular_price if is_promo and regular_price is not None else current_price

    unit_price = _to_decimal(prices.get("price_per_unit"))
    sku = str(product.get("sku_id") or "").strip()
    product_path = str(product.get("url") or "").strip()
    product_url = response_urljoin(fallback_url, product_path)

    return ProductPriceItem(
        product_name=name,
        store_chain="DIA",
        price=base_price,
        unit_price=unit_price,
        offer_price=offer_price,
        offer_end_date=None,
        barcode=sku or None,
        category_name=None,
        url=product_url,
    )


def response_urljoin(base_url: str, path: str) -> str:
    if not path:
        return base_url
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"https://www.dia.es{path}" if path.startswith("/") else f"https://www.dia.es/{path}"


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
