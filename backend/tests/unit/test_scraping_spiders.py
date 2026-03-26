"""Tests unitarios de helpers de spiders de scraping."""

from __future__ import annotations

import os
import sys

from scrapy import Selector

SCRAPING_DIR = os.environ.get("SCRAPING_PROJECT_DIR", "/scraping")
if SCRAPING_DIR not in sys.path:
    sys.path.insert(0, SCRAPING_DIR)


def test_lidl_extract_embedded_products_from_nuxt_payload():
    from bargain_scraping.spiders.lidl import _extract_embedded_products

    html = """
    <html>
      <body>
        <script id="__NUXT_DATA__" type="application/json">
          [1, {"items": [{"productId": 10, "title": "Leche entera", "canonicalPath": "/p/leche", "price": {"price": 1.2}}]}]
        </script>
      </body>
    </html>
    """

    products = _extract_embedded_products(html)

    assert len(products) == 1
    assert products[0]["productId"] == 10
    assert products[0]["title"] == "Leche entera"
    assert products[0]["price"]["price"] == 1.2


def test_lidl_extract_embedded_products_resolves_nuxt_references():
    from bargain_scraping.spiders.lidl import _extract_embedded_products

    html = """
    <html>
      <body>
        <script id="__NUXT_DATA__" type="application/json">
          [
            1,
            {"items": 2},
            [3],
            {"productId": 4, "title": 5, "canonicalPath": 6, "price": 7, "regionsPrices": 8},
            100398928,
            "Leche fresca",
            "/p/leche-fresca",
            {"price": 9},
            {},
            1.39
          ]
        </script>
      </body>
    </html>
    """

    products = _extract_embedded_products(html)

    assert len(products) == 1
    assert products[0]["productId"] == 100398928
    assert products[0]["title"] == "Leche fresca"
    assert products[0]["canonicalPath"] == "/p/leche-fresca"
    assert products[0]["price"]["price"] == 1.39


def test_lidl_extract_embedded_products_falls_back_to_object_scan():
    from bargain_scraping.spiders.lidl import _extract_embedded_products

    html = """
    <html>
      <body>
        <script>
          {"outer": {"productId": 11, "title": "Pan rustico", "canonicalPath": "/p/pan", "price": {"price": 0.99}}}
        </script>
      </body>
    </html>
    """

    products = _extract_embedded_products(html)

    assert len(products) == 1
    assert products[0]["productId"] == 11
    assert products[0]["title"] == "Pan rustico"


def test_carrefour_extract_products_from_home_card():
    from bargain_scraping.spiders.carrefour import CarrefourSpider

    spider = CarrefourSpider()
    selector = Selector(
        text="""
        <div class="product-card">
          <a href="/supermercado/leche-semidesnatada/R-VC4AECOMM-700248/p" title="Leche semidesnatada La Cantara brik 1 l.">
            <span class="product-card__title">Leche semidesnatada La Cántara brik 1 l.</span>
          </a>
          <div class="product-card__price">0,86 €</div>
          <div class="product-card__price-per-unit">0,86 €/l</div>
        </div>
        """
    )

    items = list(spider._extract_products(selector, "https://www.carrefour.es/supermercado"))

    assert len(items) == 1
    item = items[0]
    assert item["product_name"] == "Leche semidesnatada La Cántara brik 1 l."
    assert str(item["price"]) == "0.86"
    assert str(item["unit_price"]) == "0.86"
    assert item["barcode"] == "VC4AECOMM-700248"
    assert item["url"] == "https://www.carrefour.es/supermercado/leche-semidesnatada/R-VC4AECOMM-700248/p"


def test_alcampo_extract_product_rows_from_ssr_html():
    from bargain_scraping.spiders.alcampo import _extract_product_rows

    html = """
    <div>
      <a data-test="fop-product-link" href="/products/producto-alcampo-vinagre/206839">
        <span>PRODUCTO ALCAMPO Vinagre de manzana 1 l.</span>
      </a>
      <span data-test="fop-price">0,84 €</span>
      <span data-test="fop-price-per-unit">(0,84 € por litro)</span>
    </div>
    """

    rows = _extract_product_rows(html)

    assert len(rows) == 1
    row = rows[0]
    assert row["href"] == "/products/producto-alcampo-vinagre/206839"
    assert row["name"] == "PRODUCTO ALCAMPO Vinagre de manzana 1 l."
    assert str(row["price"]) == "0.84"
    assert str(row["unit_price"]) == "0.84"


def test_costco_extract_pdf_links_from_catalog_page():
    from bargain_scraping.spiders.costco import _extract_pdf_links

    html = """
    <a href="https://link.costco.es/custloads/1058744162/md_67973.pdf">Descargar PDF</a>
    <a href="https://link.costco.es/custloads/1058744162/md_53204.pdf">Descargar PDF</a>
    """

    links = _extract_pdf_links(html)

    assert links == [
        "https://link.costco.es/custloads/1058744162/md_53204.pdf",
        "https://link.costco.es/custloads/1058744162/md_67973.pdf",
    ]


def test_costco_extract_rows_from_pdf_bytes_without_pypdf(monkeypatch):
    import bargain_scraping.spiders.costco as costco_spider

    real_import = __import__

    def fake_import(name, *args, **kwargs):
        if name == "pypdf":
            raise ImportError("missing pypdf")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", fake_import)
    rows = costco_spider._extract_rows_from_pdf_bytes(b"%PDF-1.5", "https://example.com/cat.pdf")
    assert rows == []


def test_hipercor_extract_offer_links_and_price_items():
    from bargain_scraping.spiders.hipercor import (
        _extract_items_from_anchor_text,
        _extract_offer_links,
    )

    html = """
    <html>
      <body>
        <a href="https://www.hipercor.es/supermercado/bebidas/cervezas/">
          Cerveza rubia pack 6 5,49 € Ver oferta
        </a>
        <a href="https://www.hipercor.es/alimentacion/minisite/011012660867-/">
          2x1 en cajas de vino
        </a>
      </body>
    </html>
    """

    links = _extract_offer_links(html, "https://www.hipercor.es/")
    assert "https://www.hipercor.es/alimentacion/minisite/011012660867-/" in links
    assert "https://www.hipercor.es/supermercado/bebidas/cervezas/" in links

    selector = Selector(text=html)
    items = _extract_items_from_anchor_text(selector, "https://www.hipercor.es/")
    assert len(items) == 1
    assert items[0]["product_name"].startswith("Cerveza rubia")
    assert str(items[0]["price"]) == "5.49"
