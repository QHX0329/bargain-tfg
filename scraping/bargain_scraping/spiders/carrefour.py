"""Spider de Carrefour apoyado en la landing accesible del supermercado.

Las categorías internas del supermercado devuelven 403 de Cloudflare incluso
cuando se inicializa una sesión Playwright válida. La portada de
`/supermercado`, en cambio, sí renderiza tarjetas reales de producto con
precio. El spider se apoya en esa landing para obtener un conjunto estable de
productos visibles sin dejar procesos bloqueados contra páginas vetadas.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin

import scrapy
import structlog
from playwright.async_api import async_playwright

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

CARREFOUR_HOME_URL = "https://www.carrefour.es/supermercado"


class CarrefourSpider(scrapy.Spider):
    """Spider para Carrefour basado en la landing pública del supermercado."""

    name = "carrefour"
    allowed_domains = ["www.carrefour.es", "carrefour.es"]
    handle_httpstatus_list = [403]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }

    def start_requests(self):
        """Arranca desde la landing; si Scrapy recibe 403, Playwright toma el relevo."""
        yield scrapy.Request(
            url=CARREFOUR_HOME_URL,
            headers=_browser_headers(),
            callback=self.parse_home,
            errback=self.errback_handler,
        )

    async def parse_home(self, response):
        """Extrae las tarjetas visibles de producto usando Playwright directo."""
        try:
            page_url, page_title, html, product_count = await _render_home_html()
            if product_count == 0:
                logger.warning(
                    "No se encontraron tarjetas de producto en Carrefour",
                    url=page_url,
                    title=page_title,
                    upstream_status=response.status,
                )
                return
        except Exception as exc:
            logger.error(
                "Error renderizando landing de Carrefour",
                url=response.url,
                upstream_status=response.status,
                error=str(exc),
            )
            return

        from scrapy import Selector

        sel = Selector(text=html)
        extracted = 0
        seen_urls: set[str] = set()

        for item in self._extract_products(sel, response.url):
            item_url = str(item.get("url") or "")
            if item_url and item_url in seen_urls:
                continue
            if item_url:
                seen_urls.add(item_url)

            extracted += 1
            yield item

        if extracted == 0:
            logger.warning("Carrefour sin productos extraídos tras render", url=response.url)

    def _extract_products(self, sel, base_url: str):
        """Extrae las tarjetas visibles de producto del HTML renderizado."""
        for card in sel.css(_product_card_selector()):
            try:
                name = _extract_name(card)
                if not name:
                    continue

                price = _parse_price(_extract_price_text(card))
                if price is None:
                    continue

                unit_price = _parse_price(_extract_unit_price_text(card))
                offer_price = _extract_offer_price(card, price)
                product_url = _extract_product_url(card, base_url)
                barcode = _extract_barcode_from_url(product_url)

                yield ProductPriceItem(
                    product_name=name,
                    store_chain="Carrefour",
                    price=price,
                    unit_price=unit_price,
                    offer_price=offer_price,
                    offer_end_date=None,
                    barcode=barcode,
                    category_name=None,
                    url=product_url,
                )
            except Exception as exc:
                logger.warning("Error extrayendo producto de Carrefour", error=str(exc))

    def errback_handler(self, failure):
        """Registra fallos de red o antibot sin bloquear la ejecución."""
        status = getattr(failure.value, "response", None)
        if status and hasattr(status, "status"):
            logger.warning(
                "Respuesta fallida en Carrefour",
                url=failure.request.url,
                status=status.status,
            )
        else:
            logger.error(
                "Error de red en Carrefour spider",
                url=failure.request.url,
                error=str(failure.value),
            )


async def _dismiss_cookie_banner(page) -> None:
    for selector in [
        "#onetrust-accept-btn-handler",
        "#onetrust-reject-all-handler",
    ]:
        try:
            await page.locator(selector).click(timeout=1500)
            await page.wait_for_timeout(500)
            return
        except Exception:
            continue


async def _render_home_html() -> tuple[str, str, str, int]:
    """Renderiza la landing de Carrefour fuera de Scrapy para evitar 403 del handler."""
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
            await page.goto(CARREFOUR_HOME_URL, wait_until="domcontentloaded", timeout=60000)
            await _dismiss_cookie_banner(page)
            await page.wait_for_timeout(5000)

            product_count = await page.locator(_product_card_selector()).count()
            html = await page.content()
            return page.url, await page.title(), html, product_count
        finally:
            await browser.close()


def _product_card_selector() -> str:
    return "[data-testid='product-card'], .product-card, .eb-product, .product-card-container"


def _extract_name(card) -> str:
    selectors = [
        "[data-testid='product-name']::text",
        ".eb-product__title::text",
        ".product-card__title::text",
        ".product-card__title-link::text",
        ".product-card__title a::text",
        "h3::text",
        "a[title]::attr(title)",
    ]
    for selector in selectors:
        value = (card.css(selector).get("") or "").strip()
        if value:
            return value
    return ""


def _extract_price_text(card) -> str:
    selectors = [
        "[data-testid='product-price'] .value::text",
        "[data-testid='product-price']::text",
        ".eb-price__value::text",
        ".price-current::text",
        ".c-price__amount::text",
        ".product-card__price::text",
    ]
    return _first_non_empty(card, selectors)


def _extract_unit_price_text(card) -> str:
    selectors = [
        "[data-testid='product-unit-price']::text",
        ".eb-price__unit::text",
        ".price-per-unit::text",
        ".product-card__price-per-unit::text",
    ]
    return _first_non_empty(card, selectors)


def _extract_offer_price(card, price: Decimal) -> Decimal | None:
    selectors = [
        "[data-testid='product-offer-price'] .value::text",
        ".price-offer::text",
        ".price-previous::text",
        ".product-card__price-old::text",
    ]
    candidate = _parse_price(_first_non_empty(card, selectors))
    if candidate is not None and candidate > price:
        return price
    return None


def _extract_product_url(card, base_url: str) -> str:
    href = (
        card.css("a[href*='/supermercado/']::attr(href)").get("")
        or card.css("a::attr(href)").get("")
    ).strip()
    if not href:
        return base_url
    return urljoin(base_url, href)


def _extract_barcode_from_url(url: str) -> str | None:
    if not url:
        return None
    match = re.search(r"/R-([^/]+)/p$", url)
    return match.group(1) if match else None


def _first_non_empty(card, selectors: list[str]) -> str:
    for selector in selectors:
        value = (card.css(selector).get("") or "").strip()
        if value:
            return value
    return ""


def _browser_user_agent() -> str:
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )


def _browser_headers() -> dict[str, str]:
    return {
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,"
            "image/webp,image/apng,*/*;q=0.8"
        ),
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": _browser_user_agent(),
    }


def _parse_price(text: str) -> Decimal | None:
    """Convierte texto de precio ('1,29 €') a Decimal o None."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d,\.]", "", text).replace(",", ".")
    try:
        return Decimal(cleaned) if cleaned else None
    except InvalidOperation:
        return None
