"""Spider de DIA basado en estado embebido en el HTML (vike_pageContext)."""

import json
import re
from decimal import Decimal, InvalidOperation

import scrapy
import structlog
from playwright.async_api import async_playwright

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

DIA_HOME_URL = "https://www.dia.es/"


class DiaSpider(scrapy.Spider):
    """Spider de DIA que extrae productos desde el JSON SSR embebido.

    DIA está protegido por Akamai Bot Manager, que responde 403 a las descargas
    HTTP planas desde IPs de centro de datos. Por eso la home se renderiza con un
    navegador real (Playwright): el motor ejecuta el sensor de Akamai, obtiene la
    cookie de validación y recibe el HTML con el estado embebido
    (``vike_pageContext``), del que se extraen los productos como antes.
    """

    name = "dia"
    allowed_domains = ["www.dia.es"]
    handle_httpstatus_list = [403]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
    }

    def start_requests(self):
        """Dispara una única petición a la home; Playwright toma el relevo."""
        yield scrapy.Request(
            url=DIA_HOME_URL,
            headers=_browser_headers(),
            callback=self.parse_page,
            errback=self.errback_handler,
        )

    async def parse_page(self, response):
        """Renderiza la home con Playwright y extrae el estado embebido."""
        try:
            html = await _render_home_html()
        except Exception as exc:
            logger.error("Error renderizando la home de DIA", error=str(exc))
            return

        page_context = _extract_page_context(html)
        if not page_context:
            logger.warning(
                "No se pudo extraer vike_pageContext en DIA (posible reto Akamai)",
                url=response.url,
            )
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
        "Chrome/127.0.0.0 Safari/537.36"
    )


def _browser_headers() -> dict[str, str]:
    return {
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,"
            "image/webp,image/apng,*/*;q=0.8"
        ),
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": _browser_user_agent(),
    }


async def _dismiss_cookie_banner(page) -> None:
    for selector in [
        "#onetrust-accept-btn-handler",
        "#onetrust-reject-all-handler",
        "button[aria-label*='aceptar' i]",
    ]:
        try:
            await page.locator(selector).click(timeout=1500)
            await page.wait_for_timeout(500)
            return
        except Exception:
            continue


async def _render_home_html() -> str:
    """Renderiza la home de DIA con un navegador real para sortear Akamai.

    El navegador ejecuta el sensor anti-bot y obtiene el HTML con el estado
    embebido. Si Akamai sirviera un reto, la espera por ``vike_pageContext``
    agota su tiempo y el contenido devuelto no contendrá ese script, lo que se
    refleja en el aviso de ``parse_page``.
    """
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = await browser.new_context(
            user_agent=_browser_user_agent(),
            locale="es-ES",
            timezone_id="Europe/Madrid",
            viewport={"width": 1366, "height": 2200},
        )
        page = await context.new_page()
        try:
            await page.goto(DIA_HOME_URL, wait_until="domcontentloaded", timeout=60000)
            await _dismiss_cookie_banner(page)
            try:
                await page.wait_for_selector("script#vike_pageContext", timeout=20000)
            except Exception:
                pass
            # Margen para que el sensor de Akamai valide la sesión.
            await page.wait_for_timeout(2500)
            return await page.content()
        finally:
            await browser.close()


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
