"""
Tests unitarios para el pipeline de scraping y la tarea Celery run_spider.
"""

from decimal import Decimal
import os
import sys
from unittest.mock import patch

import pytest
from asgiref.sync import async_to_sync

SCRAPING_DIR = os.environ.get("SCRAPING_PROJECT_DIR", "/scraping")
if SCRAPING_DIR not in sys.path:
    sys.path.insert(0, SCRAPING_DIR)


def test_spider_map_contains_all_four():
    from apps.scraping.tasks import SPIDER_MAP

    assert set(SPIDER_MAP.keys()) == {"mercadona", "carrefour", "lidl", "dia"}


def test_run_spider_rejects_unknown_name():
    from apps.scraping.tasks import run_spider

    with pytest.raises(ValueError, match="Spider desconocido"):
        run_spider("unknown_spider_xyz")


def test_resolve_scraping_dir_uses_env_override(monkeypatch):
    from apps.scraping.tasks import _resolve_scraping_dir

    monkeypatch.setenv("SCRAPING_PROJECT_DIR", "/custom-scraping")

    def fake_isfile(path):
        return path == "/custom-scraping/scrapy.cfg"

    def fake_isdir(path):
        return path == "/custom-scraping/bargain_scraping"

    monkeypatch.setattr("apps.scraping.tasks.os.path.isfile", fake_isfile)
    monkeypatch.setattr("apps.scraping.tasks.os.path.isdir", fake_isdir)

    assert _resolve_scraping_dir() == "/custom-scraping"


class FakeSpider:
    name = "test_spider"


def _make_item(**kwargs):
    from bargain_scraping.items import ProductPriceItem

    defaults = {
        "product_name": "Leche Entera 1L",
        "store_chain": "Mercadona",
        "price": Decimal("1.29"),
        "unit_price": Decimal("1.29"),
        "offer_price": None,
        "offer_end_date": None,
        "barcode": "8480000123456",
        "category_name": "Lacteos",
        "image_url": "https://example.com/leche.png",
        "url": "https://tienda.mercadona.es/api/categories/1/",
    }
    defaults.update(kwargs)
    return ProductPriceItem(**defaults)


@pytest.mark.django_db
class TestPipelineUpsert:
    def _load_pipeline(self):
        import sys

        if "bargain_scraping.pipelines" in sys.modules:
            del sys.modules["bargain_scraping.pipelines"]

        with patch("django.setup"):
            from bargain_scraping.pipelines import PriceUpsertPipeline

            return PriceUpsertPipeline()

    def test_pipeline_creates_product_and_upserts_price(self, db):
        from django.contrib.gis.geos import Point
        from django.utils import timezone

        from apps.prices.models import Price
        from apps.products.models import Product
        from apps.stores.models import Store, StoreChain

        chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
        store = Store.objects.create(
            name="Mercadona Test",
            chain=chain,
            address="Calle Test 1",
            location=Point(-5.9845, 37.3891, srid=4326),
            is_active=True,
        )

        pipeline = self._load_pipeline()
        spider = FakeSpider()
        item = _make_item()

        pipeline.open_spider(spider)
        result = async_to_sync(pipeline.process_item)(item, spider)

        product = Product.objects.get(barcode="8480000123456")
        assert product.name == "Leche Entera 1L"
        assert product.image_url == "https://example.com/leche.png"
        assert product.category.name == "Lacteos"

        price = Price.objects.get(product=product, store=store)
        assert price.source == "scraping"
        assert price.price == Decimal("1.29")
        delta = abs((timezone.now() - price.verified_at).total_seconds())
        assert delta < 60
        assert result == item

    def test_pipeline_updates_existing_scraped_product(self, db):
        from django.contrib.gis.geos import Point

        from apps.products.models import Product
        from apps.stores.models import Store, StoreChain

        chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
        Store.objects.create(
            name="Mercadona Test",
            chain=chain,
            address="Calle Test 1",
            location=Point(-5.9845, 37.3891, srid=4326),
            is_active=True,
        )
        product = Product.objects.create(
            name="seed_leche antigua",
            normalized_name="leche entera 1l",
            barcode=None,
            image_url="",
        )

        pipeline = self._load_pipeline()
        spider = FakeSpider()
        item = _make_item(barcode=None)

        pipeline.open_spider(spider)
        async_to_sync(pipeline.process_item)(item, spider)

        product.refresh_from_db()
        assert product.name == "Leche Entera 1L"
        assert product.image_url == "https://example.com/leche.png"

    def test_pipeline_drops_item_when_store_is_missing(self, db):
        from scrapy.exceptions import DropItem

        pipeline = self._load_pipeline()
        spider = FakeSpider()
        item = _make_item(store_chain="Cadena Inexistente")

        pipeline.open_spider(spider)
        with pytest.raises(DropItem, match="Tienda no encontrada"):
            async_to_sync(pipeline.process_item)(item, spider)
