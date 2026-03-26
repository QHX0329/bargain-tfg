"""Spider de Hipercor con estrategia defensiva ante interstitial anti-bot.

La ruta `/supermercado/` puede activar challenge interstitial. Como fallback,
se parte de la home publica y se siguen enlaces de ofertas relacionadas con
alimentacion/supermercado para extraer lineas con precio.
"""

from __future__ import annotations

import html
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin, urlparse

import scrapy
import structlog
from scrapy import Selector

from bargain_scraping.items import ProductPriceItem

logger = structlog.get_logger(__name__)

START_URLS = [
    "https://www.hipercor.es/",
    "https://www.hipercor.es/ofertas-supermercado/supermercado/",
    "https://www.hipercor.es/supermercado/bebidas/cervezas/",
]
MAX_DISCOVERED_LINKS = 40

PRICE_TOKEN_PATTERN = re.compile(r"([0-9]{1,3}(?:[\.,][0-9]{2}))\s*€")
OFFER_LINK_PATTERN = re.compile(
    r"https?://www\.hipercor\.es/(?:supermercado|ofertas-supermercado|alimentacion)/[^\"\s<>]+",
    re.IGNORECASE,
)


class HipercorSpider(scrapy.Spider):
    """Spider para extraer productos/promos con precio en Hipercor."""

    name = "hipercor"
    allowed_domains = ["www.hipercor.es", "hipercor.es"]
    handle_httpstatus_list = [403, 429]

    custom_settings = {
        "DOWNLOAD_DELAY": 1,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "DOWNLOAD_TIMEOUT": 20,
        "RETRY_TIMES": 0,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.0,
    }

    def start_requests(self):
        """Genera seeds iniciales para capturar ofertas navegables."""
        for url in START_URLS:
            yield scrapy.Request(
                url=url,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_page,
                errback=self.errback_handler,
                dont_filter=True,
            )

    def parse_page(self, response):
        """Extrae items con precio y descubre enlaces de oferta adicionales."""
        if response.status in {403, 429}:
            logger.warning("Hipercor bloqueado por anti-bot", url=response.url, status=response.status)
            return

        html_text = response.text
        selector = Selector(text=html_text)

        extracted = 0
        for item in _extract_items_from_anchor_text(selector, response.url):
            extracted += 1
            yield item

        for link in _extract_offer_links(html_text, response.url):
            if link in self._seen_links:
                continue
            if len(self._seen_links) >= MAX_DISCOVERED_LINKS:
                break

            self._seen_links.add(link)
            yield scrapy.Request(
                url=link,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_page,
                errback=self.errback_handler,
            )

        for noscript_link in _extract_noscript_iframe_links(selector, response.url):
            if noscript_link in self._seen_links:
                continue
            self._seen_links.add(noscript_link)
            yield scrapy.Request(
                url=noscript_link,
                headers={"User-Agent": _browser_user_agent()},
                callback=self.parse_page,
                errback=self.errback_handler,
                dont_filter=True,
            )

        if extracted == 0:
            logger.info("Hipercor pagina sin items con precio", url=response.url)

    def errback_handler(self, failure):
        """Registra errores de red sin detener el spider."""
        logger.warning(
            "Error de red en Hipercor spider",
            url=failure.request.url,
            error=str(failure.value),
        )

    @property
    def _seen_links(self) -> set[str]:
        if not hasattr(self, "__seen_links"):
            self.__seen_links: set[str] = set(START_URLS)
        return self.__seen_links


def _extract_offer_links(html_text: str, base_url: str) -> list[str]:
    """Encuentra enlaces relacionados con supermercado/alimentacion."""
    links = {
        _normalize_hipercor_url(urljoin(base_url, match.group(0)))
        for match in OFFER_LINK_PATTERN.finditer(html.unescape(html_text))
    }
    return sorted(link for link in links if _is_food_related_link(link))


def _extract_noscript_iframe_links(selector: Selector, base_url: str) -> list[str]:
    """Recupera enlaces de fallback de iframe noscript en paginas challenge."""
    links: list[str] = []
    for src in selector.css("iframe::attr(src)").getall():
        normalized = _normalize_hipercor_url(urljoin(base_url, src.strip()))
        if "/noscript" in normalized:
            links.append(normalized)
    return links


def _extract_items_from_anchor_text(selector: Selector, base_url: str) -> list[ProductPriceItem]:
    """Crea items a partir de anchors con texto que contenga precio."""
    items: list[ProductPriceItem] = []
    seen: set[tuple[str, str]] = set()

    for anchor in selector.css("a[href]"):
        href = (anchor.attrib.get("href") or "").strip()
        if not href:
            continue

        absolute_url = _normalize_hipercor_url(urljoin(base_url, href))
        if not _is_food_related_link(absolute_url):
            continue

        text = _clean_text(" ".join(anchor.css("::text").getall()))
        if not text:
            continue

        prices = PRICE_TOKEN_PATTERN.findall(text)
        if not prices:
            continue

        price = _parse_price(prices[0])
        if price is None:
            continue

        product_name = _strip_price_from_text(text)
        if len(product_name) < 6:
            continue

        key = (product_name.casefold(), str(price))
        if key in seen:
            continue
        seen.add(key)

        items.append(
            ProductPriceItem(
                product_name=product_name,
                store_chain="Hipercor",
                price=price,
                unit_price=None,
                offer_price=None,
                offer_end_date=None,
                barcode=None,
                category_name=None,
                url=absolute_url,
            )
        )

    return items


def _is_food_related_link(url: str) -> bool:
    path = urlparse(url).path.casefold()
    return any(token in path for token in ("/supermercado/", "/ofertas-supermercado/", "/alimentacion/"))


def _normalize_hipercor_url(url: str) -> str:
    return url.replace("https://www.hipercor.es./", "https://www.hipercor.es/")


def _strip_price_from_text(text: str) -> str:
    without_price = PRICE_TOKEN_PATTERN.sub("", text)
    without_discount = re.sub(r"-\s*\d+%", "", without_price)
    return _clean_text(without_discount)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def _browser_user_agent() -> str:
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )


def _parse_price(text: str) -> Decimal | None:
    if not text:
        return None
    cleaned = text.strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None
