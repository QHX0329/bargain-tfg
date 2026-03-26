"""
Spider de Carrefour — extrae precios usando Playwright para rendering JS.

Carrefour utiliza una SPA React que requiere renderizado JavaScript completo.
Se integra con scrapy-playwright para gestionar el navegador headless.

URL base: https://www.carrefour.es/supermercado/
"""

import re
from decimal import Decimal, InvalidOperation

import scrapy
import structlog
from scrapy import signals

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

# Categorías de alimentación que nos interesan
CATEGORY_URLS = [
    "https://www.carrefour.es/supermercado/lacteos-huevos-y-mantequilla/cat21450791/c",
    "https://www.carrefour.es/supermercado/bebidas/cat21450792/c",
    "https://www.carrefour.es/supermercado/frutas-y-verduras/cat21450793/c",
    "https://www.carrefour.es/supermercado/carnes-y-aves/cat21450794/c",
    "https://www.carrefour.es/supermercado/pescados-y-mariscos/cat21450795/c",
    "https://www.carrefour.es/supermercado/panaderia-y-bolleria/cat21450796/c",
    "https://www.carrefour.es/supermercado/aceites-y-condimentos/cat21450797/c",
    "https://www.carrefour.es/supermercado/conservas-y-aperitivos/cat21450798/c",
]


class CarrefourSpider(scrapy.Spider):
    """Spider para el supermercado online de Carrefour con soporte Playwright."""

    name = "carrefour"
    allowed_domains = ["www.carrefour.es"]

    custom_settings = {
        "DOWNLOAD_HANDLERS": {
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        },
        "TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
        "DOWNLOAD_DELAY": 3,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "PLAYWRIGHT_BROWSER_TYPE": "chromium",
        "PLAYWRIGHT_LAUNCH_OPTIONS": {
            "headless": True,
            "args": ["--no-sandbox", "--disable-setuid-sandbox"],
        },
    }

    def start_requests(self):
        """Genera requests a las categorías usando Playwright."""
        for url in CATEGORY_URLS:
            yield scrapy.Request(
                url=url,
                meta={
                    "playwright": True,
                    "playwright_include_page": True,
                    "playwright_page_goto_kwargs": {"wait_until": "networkidle"},
                },
                callback=self.parse_category,
                errback=self.errback_handler,
            )

    async def parse_category(self, response):
        """Parsea la página de categoría — extrae productos y sigue paginación."""
        page = response.meta.get("playwright_page")

        try:
            # Cerrar cookies banner si aparece
            try:
                await page.click("button[id='onetrust-accept-btn-handler']", timeout=3000)
            except Exception:
                pass

            # Esperar a que carguen los productos
            try:
                await page.wait_for_selector("[data-testid='product-card']", timeout=10000)
            except Exception:
                logger.warning(
                    "No se encontraron productos en la página",
                    url=response.url,
                )
                return

            html = await page.content()

        except Exception as exc:
            logger.error(
                "Error renderizando página con Playwright",
                url=response.url,
                error=str(exc),
            )
            return
        finally:
            if page:
                await page.close()

        # Re-parsear con Scrapy el HTML renderizado
        from scrapy import Selector

        sel = Selector(text=html)
        for item in self._extract_products(sel, response.url):
            yield item

        # Paginación — buscar botón "siguiente"
        next_url = sel.css("[data-testid='next-page-link']::attr(href)").get()
        if next_url:
            yield scrapy.Request(
                url=response.urljoin(next_url),
                meta={
                    "playwright": True,
                    "playwright_include_page": True,
                    "playwright_page_goto_kwargs": {"wait_until": "networkidle"},
                },
                callback=self.parse_category,
                errback=self.errback_handler,
            )

    def _extract_products(self, sel, url: str):
        """Extrae los items de producto del HTML renderizado."""
        for card in sel.css("[data-testid='product-card'], .product-card, .eb-product"):
            try:
                name = (
                    card.css("[data-testid='product-name']::text, .eb-product__title::text").get("")
                    or card.css("h3::text, .product-name::text").get("")
                ).strip()

                if not name:
                    continue

                price_text = (
                    card.css("[data-testid='product-price'] .value::text").get("")
                    or card.css(".eb-price__value::text, .price-current::text").get("")
                ).strip()

                price = _parse_price(price_text)
                if price is None:
                    continue

                unit_price_text = card.css(
                    "[data-testid='product-unit-price']::text, .eb-price__unit::text"
                ).get("")
                unit_price = _parse_price(unit_price_text)

                offer_price_text = card.css(
                    "[data-testid='product-offer-price'] .value::text, .price-offer::text"
                ).get("")
                offer_price = _parse_price(offer_price_text)

                product_url = card.css("a::attr(href)").get("")

                yield ProductPriceItem(
                    product_name=name,
                    store_chain="Carrefour",
                    price=price,
                    unit_price=unit_price,
                    offer_price=offer_price,
                    offer_end_date=None,
                    barcode=None,
                    category_name=None,
                    url=response.urljoin(product_url) if product_url else url,
                )
            except Exception as exc:
                logger.warning(
                    "Error extrayendo producto de Carrefour",
                    error=str(exc),
                )

    def errback_handler(self, failure):
        """Manejo de errores — anti-bot 403 y errores de red se loguan y se omiten."""
        status = getattr(failure.value, "response", None)
        if status and hasattr(status, "status") and status.status == 403:
            logger.warning(
                "Anti-bot 403 en Carrefour — página omitida",
                url=failure.request.url,
            )
        else:
            logger.error(
                "Error de red en Carrefour spider",
                url=failure.request.url,
                error=str(failure.value),
            )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_price(text: str) -> Decimal | None:
    """Convierte texto de precio ('1,29 €') a Decimal o None."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d,\.]", "", text).replace(",", ".")
    try:
        return Decimal(cleaned) if cleaned else None
    except InvalidOperation:
        return None
