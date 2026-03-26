"""
Unit tests for MercadonaSpider — validates JSON API parsing, ProductPriceItem
extraction, error handling for HTTP failures, and category filtering logic.

No live HTTP requests are made. All responses are faked using Scrapy's
TextResponse with in-memory JSON payloads.

Run from the scraping/ directory:
    pytest tests/unit/test_spider_mercadona.py -v

Requirements covered: SCRAP-01 (Mercadona JSON API spider, PLAN 05-01)
"""

import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
import scrapy.http

from bargain_scraping.items import ProductPriceItem
from bargain_scraping.spiders.mercadona import MercadonaSpider, _to_decimal

# ── Helpers ───────────────────────────────────────────────────────────────────


def _fake_response(url: str, body) -> scrapy.http.TextResponse:
    """Create an in-memory Scrapy TextResponse carrying a JSON payload."""
    raw = json.dumps(body).encode("utf-8")
    return scrapy.http.TextResponse(
        url=url,
        body=raw,
        encoding="utf-8",
        headers={"Content-Type": "application/json"},
    )


def _fake_failure(url: str) -> MagicMock:
    """Create a mock Scrapy Failure (network error) for errback testing."""
    failure = MagicMock()
    failure.request = MagicMock()
    failure.request.url = url
    failure.value = ConnectionError("Connection refused")
    return failure


# ── Fixtures ──────────────────────────────────────────────────────────────────

CATEGORIES_RESPONSE = [
    {"id": 1, "name": "Lácteos y huevos"},
    {"id": 2, "name": "Panadería"},
]

PRODUCTS_NESTED_RESPONSE = {
    "categories": [
        {
            "name": "Leches",
            "products": [
                {
                    "display": {"name": "Leche Entera Hacendado 1L"},
                    "price_instructions": {
                        "unit_price": "1.29",
                        "reference_price": "1.29",
                    },
                    "ean": "8480000123456",
                },
                {
                    # Missing price — should be skipped
                    "display": {"name": "Leche Sin Precio"},
                    "price_instructions": {},
                    "ean": "8480000000001",
                },
            ],
        }
    ]
}

PRODUCTS_FLAT_RESPONSE = {
    "products": [
        {
            "display": {"name": "Pan de Molde"},
            "price_instructions": {"bulk_price": "1.05", "reference_price": "2.10"},
            "ean": None,
        },
        {
            "display": {"name": "Baguette"},
            "price_instructions": {"unit_price": "0.75"},
            "ean": "8480000654321",
        },
    ]
}

EMPTY_RESPONSE = {"categories": [], "products": []}


# ── Tests: parse_categories ───────────────────────────────────────────────────


class TestMercadonaSpiderParsesCategories:
    """MercadonaSpider.parse_categories yields one Request per category."""

    def setup_method(self):
        self.spider = MercadonaSpider()

    def test_yields_one_request_per_category_with_id(self):
        """Each category with an 'id' field produces exactly one products request."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/",
            CATEGORIES_RESPONSE,
        )
        requests = list(self.spider.parse_categories(response))

        assert len(requests) == 2

    def test_request_urls_point_to_products_endpoint(self):
        """Generated URLs follow the pattern /api/categories/{id}/."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/",
            CATEGORIES_RESPONSE,
        )
        requests = list(self.spider.parse_categories(response))
        urls = [r.url for r in requests]

        assert "https://tienda.mercadona.es/api/categories/1/" in urls
        assert "https://tienda.mercadona.es/api/categories/2/" in urls

    def test_category_name_passed_as_cb_kwargs(self):
        """Each request carries the category name in cb_kwargs for context."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/",
            [{"id": 10, "name": "Frescos"}],
        )
        requests = list(self.spider.parse_categories(response))

        assert len(requests) == 1
        assert requests[0].cb_kwargs.get("category_name") == "Frescos"

    def test_skips_categories_without_id(self):
        """Categories missing an 'id' key are silently skipped."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/",
            [{"name": "Sin ID"}, {"id": 5, "name": "Con ID"}],
        )
        requests = list(self.spider.parse_categories(response))

        assert len(requests) == 1
        assert requests[0].cb_kwargs["category_name"] == "Con ID"

    def test_handles_results_wrapper_structure(self):
        """When categories are wrapped in a 'results' key the spider adapts."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/",
            {"results": [{"id": 7, "name": "Bebidas"}]},
        )
        requests = list(self.spider.parse_categories(response))

        assert len(requests) == 1

    def test_handles_malformed_json_gracefully(self):
        """A truncated/invalid JSON body does not raise an uncaught exception."""
        response = scrapy.http.TextResponse(
            url="https://tienda.mercadona.es/api/categories/",
            body=b"INVALID JSON {{{{",
            encoding="utf-8",
        )
        results = list(self.spider.parse_categories(response))
        assert results == []


# ── Tests: parse_products ─────────────────────────────────────────────────────


class TestMercadonaSpiderParsesProducts:
    """MercadonaSpider.parse_products yields ProductPriceItem instances."""

    def setup_method(self):
        self.spider = MercadonaSpider()

    def test_extracts_items_from_nested_category_structure(self):
        """Items are yielded from categories[].products[] nesting."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/1/",
            PRODUCTS_NESTED_RESPONSE,
        )
        items = list(self.spider.parse_products(response, category_name="Lácteos"))

        # One valid product (the one without price is skipped)
        assert len(items) == 1
        item = items[0]
        assert item["product_name"] == "Leche Entera Hacendado 1L"
        assert item["price"] == Decimal("1.29")
        assert item["barcode"] == "8480000123456"

    def test_extracts_items_from_flat_products_structure(self):
        """Items are yielded from top-level products[] when no nested categories."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/2/",
            PRODUCTS_FLAT_RESPONSE,
        )
        items = list(self.spider.parse_products(response, category_name="Panadería"))

        assert len(items) == 2

    def test_skips_product_with_missing_price(self):
        """Products with no price_instructions entry are silently dropped."""
        payload = {
            "products": [
                {
                    "display": {"name": "Producto Fantasma"},
                    "price_instructions": {},
                    "ean": "0000000000001",
                }
            ]
        }
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/3/", payload
        )
        items = list(self.spider.parse_products(response, category_name="Test"))

        assert items == []

    def test_store_chain_is_always_mercadona(self):
        """Every yielded item has store_chain='Mercadona' regardless of category."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/2/",
            PRODUCTS_FLAT_RESPONSE,
        )
        items = list(self.spider.parse_products(response, category_name="Panadería"))

        for item in items:
            assert item["store_chain"] == "Mercadona"

    def test_empty_response_yields_nothing(self):
        """No items yielded when both categories and products lists are empty."""
        response = _fake_response(
            "https://tienda.mercadona.es/api/categories/5/", EMPTY_RESPONSE
        )
        items = list(self.spider.parse_products(response, category_name="Vacío"))

        assert items == []

    def test_handles_malformed_products_json_gracefully(self):
        """Malformed JSON in products endpoint does not raise uncaught exception."""
        response = scrapy.http.TextResponse(
            url="https://tienda.mercadona.es/api/categories/1/",
            body=b"NOT JSON",
            encoding="utf-8",
        )
        results = list(self.spider.parse_products(response, category_name="Test"))
        assert results == []


# ── Tests: _extract_product ───────────────────────────────────────────────────


class TestExtractProductHelper:
    """MercadonaSpider._extract_product builds correct ProductPriceItem fields."""

    def setup_method(self):
        self.spider = MercadonaSpider()

    def test_extracts_price_from_unit_price_field(self):
        """unit_price field in price_instructions maps to item['price']."""
        product = {
            "display": {"name": "Yogur Natural"},
            "price_instructions": {"unit_price": "0.55", "reference_price": "0.55"},
            "ean": "8480000111111",
        }
        item = self.spider._extract_product(product, "Lácteos")

        assert item is not None
        assert item["price"] == Decimal("0.55")

    def test_extracts_price_from_bulk_price_fallback(self):
        """bulk_price is used when unit_price is absent."""
        product = {
            "display": {"name": "Aceite de Oliva"},
            "price_instructions": {"bulk_price": "3.99"},
            "ean": "8480000222222",
        }
        item = self.spider._extract_product(product, "Aceites")

        assert item is not None
        assert item["price"] == Decimal("3.99")

    def test_returns_none_when_price_is_missing(self):
        """_extract_product returns None when neither unit_price nor bulk_price exists."""
        product = {
            "display": {"name": "Producto Sin Precio"},
            "price_instructions": {},
            "ean": "8480000333333",
        }
        result = self.spider._extract_product(product, "Test")

        assert result is None

    def test_unit_price_field_from_reference_price(self):
        """reference_price maps to item['unit_price'] (price per kg/l)."""
        product = {
            "display": {"name": "Jamón Serrano 100g"},
            "price_instructions": {"unit_price": "1.79", "reference_price": "17.90"},
            "ean": "8480000444444",
        }
        item = self.spider._extract_product(product, "Charcutería")

        assert item["unit_price"] == Decimal("17.90")

    def test_barcode_is_set_from_ean_field(self):
        """EAN value from product dict maps to item['barcode'] as string."""
        product = {
            "display": {"name": "Leche"},
            "price_instructions": {"unit_price": "1.00"},
            "ean": 8480000123456,  # integer EAN
        }
        item = self.spider._extract_product(product, "Lácteos")

        assert item["barcode"] == "8480000123456"

    def test_barcode_is_none_when_ean_missing(self):
        """item['barcode'] is None when the product has no EAN."""
        product = {
            "display": {"name": "Producto Sin EAN"},
            "price_instructions": {"unit_price": "2.50"},
            "ean": None,
        }
        item = self.spider._extract_product(product, "Otros")

        assert item["barcode"] is None

    def test_category_name_propagated_to_item(self):
        """category_name parameter is stored in item['category_name']."""
        product = {
            "display": {"name": "Cerveza Voll-Damm"},
            "price_instructions": {"unit_price": "1.45"},
            "ean": "8480000555555",
        }
        item = self.spider._extract_product(product, "Bebidas alcohólicas")

        assert item["category_name"] == "Bebidas alcohólicas"

    def test_offer_price_and_offer_end_date_are_none(self):
        """Mercadona API doesn't expose offers — both fields default to None."""
        product = {
            "display": {"name": "Agua Mineral"},
            "price_instructions": {"unit_price": "0.49"},
            "ean": "8480000666666",
        }
        item = self.spider._extract_product(product, "Bebidas")

        assert item["offer_price"] is None
        assert item["offer_end_date"] is None

    def test_handles_completely_empty_product_dict(self):
        """Completely unexpected product structure returns None, does not raise."""
        result = self.spider._extract_product({}, "Test")
        assert result is None

    def test_display_name_used_for_product_name(self):
        """'display.name' is preferred over 'display_name' at product root."""
        product = {
            "display": {"name": "Tomate Triturado"},
            "display_name": "Should NOT be used",
            "price_instructions": {"unit_price": "0.79"},
            "ean": "8480000777777",
        }
        item = self.spider._extract_product(product, "Conservas")

        assert item["product_name"] == "Tomate Triturado"

    def test_returned_item_is_product_price_item_instance(self):
        """_extract_product returns a ProductPriceItem (not just a dict)."""
        product = {
            "display": {"name": "Mantequilla"},
            "price_instructions": {"unit_price": "1.99"},
            "ean": "8480000888888",
        }
        item = self.spider._extract_product(product, "Lácteos")

        assert isinstance(item, ProductPriceItem)


# ── Tests: _to_decimal helper ─────────────────────────────────────────────────


class TestToDecimalHelper:
    """_to_decimal converts various value types to Decimal or None."""

    def test_converts_string_float(self):
        assert _to_decimal("1.99") == Decimal("1.99")

    def test_converts_integer(self):
        assert _to_decimal(3) == Decimal("3")

    def test_converts_float(self):
        result = _to_decimal(1.5)
        assert result == Decimal("1.5")

    def test_returns_none_for_none_input(self):
        assert _to_decimal(None) is None

    def test_returns_none_for_non_numeric_string(self):
        assert _to_decimal("not-a-number") is None

    def test_returns_none_for_empty_string(self):
        assert _to_decimal("") is None

    def test_handles_zero(self):
        assert _to_decimal("0.00") == Decimal("0.00")

    def test_handles_large_price(self):
        assert _to_decimal("999.99") == Decimal("999.99")


# ── Tests: errback_handler ────────────────────────────────────────────────────


class TestErrbackHandler:
    """MercadonaSpider.errback_handler logs errors without raising."""

    def setup_method(self):
        self.spider = MercadonaSpider()

    def test_errback_does_not_raise_on_network_failure(self):
        """errback_handler accepts a Scrapy Failure and returns without exception."""
        failure = _fake_failure("https://tienda.mercadona.es/api/categories/999/")
        # Must not raise
        result = self.spider.errback_handler(failure)
        assert result is None  # Handler returns nothing — side-effect only

    def test_errback_logs_request_url(self):
        """errback_handler logs the failing URL for diagnostics."""
        failure = _fake_failure("https://tienda.mercadona.es/api/categories/42/")

        with patch("bargain_scraping.spiders.mercadona.logger") as mock_logger:
            self.spider.errback_handler(failure)
            mock_logger.error.assert_called_once()
            call_args_str = str(mock_logger.error.call_args)
            assert "tienda.mercadona.es" in call_args_str


# ── Tests: class metadata ─────────────────────────────────────────────────────


class TestMercadonaSpiderMetadata:
    """MercadonaSpider has correct class-level metadata."""

    def setup_method(self):
        self.spider_cls = MercadonaSpider

    def test_spider_name_is_mercadona(self):
        """Spider name must be 'mercadona' for Celery task SPIDER_MAP lookup."""
        assert self.spider_cls.name == "mercadona"

    def test_allowed_domains_restricts_to_mercadona(self):
        """Spider is constrained to tienda.mercadona.es domain."""
        assert "tienda.mercadona.es" in self.spider_cls.allowed_domains

    def test_custom_settings_apply_rate_limiting(self):
        """DOWNLOAD_DELAY and CONCURRENT_REQUESTS enforce courtesy limits."""
        settings = self.spider_cls.custom_settings
        assert settings.get("DOWNLOAD_DELAY") == 2
        assert settings.get("CONCURRENT_REQUESTS") == 1

    def test_start_requests_yields_categories_url(self):
        """start_requests yields exactly one Request pointing at the categories API."""
        spider = self.spider_cls()
        requests = list(spider.start_requests())

        assert len(requests) == 1
        assert requests[0].url == "https://tienda.mercadona.es/api/categories/"

    def test_start_requests_uses_errback_handler(self):
        """start_requests attaches the errback so network failures are handled."""
        spider = self.spider_cls()
        request = list(spider.start_requests())[0]

        assert request.errback is not None
        assert request.errback.__func__.__name__ == "errback_handler"
