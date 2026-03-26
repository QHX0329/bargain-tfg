"""
Tests unitarios para el pipeline de scraping y la tarea Celery run_spider.
"""

from decimal import Decimal
import os
import subprocess
import sys
from unittest.mock import patch

import pytest
from asgiref.sync import async_to_sync

SCRAPING_DIR = os.environ.get("SCRAPING_PROJECT_DIR", "/scraping")
if SCRAPING_DIR not in sys.path:
    sys.path.insert(0, SCRAPING_DIR)


def test_spider_map_contains_all_supported_spiders():
    from apps.scraping.tasks import SPIDER_MAP

    assert set(SPIDER_MAP.keys()) == {
        "mercadona",
        "carrefour",
        "lidl",
        "dia",
        "costco",
        "alcampo",
        "hipercor",
    }


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


def test_resolve_spider_timeout_uses_specific_env(monkeypatch):
    from apps.scraping.tasks import _resolve_spider_timeout_seconds

    monkeypatch.setenv("SCRAPING_TIMEOUT_LIDL_SECONDS", "120")
    monkeypatch.setenv("SCRAPING_SPIDER_TIMEOUT_SECONDS", "900")

    assert _resolve_spider_timeout_seconds("lidl") == 120


def test_resolve_spider_timeout_falls_back_to_default(monkeypatch):
    from apps.scraping.tasks import DEFAULT_SPIDER_TIMEOUT_SECONDS, _resolve_spider_timeout_seconds

    monkeypatch.setenv("SCRAPING_TIMEOUT_LIDL_SECONDS", "abc")

    assert _resolve_spider_timeout_seconds("lidl") == DEFAULT_SPIDER_TIMEOUT_SECONDS


def test_run_spider_raises_timeout_with_output(monkeypatch):
    from apps.scraping.tasks import run_spider

    class FakeProcess:
        returncode = None

        def communicate(self, timeout=None):
            if timeout == 5:
                raise subprocess.TimeoutExpired(cmd="scrapy", timeout=timeout)
            return (b"linea 1\nlinea final util", None)

        def kill(self):
            return None

    monkeypatch.setattr("apps.scraping.tasks._resolve_backend_dir", lambda: "/app")
    monkeypatch.setattr("apps.scraping.tasks._resolve_scraping_dir", lambda: "/scraping")
    monkeypatch.setattr("apps.scraping.tasks._resolve_spider_timeout_seconds", lambda spider: 5)
    monkeypatch.setattr("apps.scraping.tasks.subprocess.Popen", lambda *args, **kwargs: FakeProcess())

    with pytest.raises(RuntimeError, match="timeout tras 5s"):
        run_spider.run("lidl")


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

    def test_pipeline_upserts_price_for_all_active_chain_stores(self, db):
        from django.contrib.gis.geos import Point

        from apps.prices.models import Price
        from apps.products.models import Product
        from apps.stores.models import Store, StoreChain

        chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
        store_1 = Store.objects.create(
            name="Mercadona Triana",
            chain=chain,
            address="Calle Triana 1",
            location=Point(-6.0, 37.38, srid=4326),
            is_active=True,
        )
        store_2 = Store.objects.create(
            name="Mercadona Macarena",
            chain=chain,
            address="Calle Macarena 2",
            location=Point(-5.99, 37.40, srid=4326),
            is_active=True,
        )
        Store.objects.create(
            name="Mercadona Inactiva",
            chain=chain,
            address="Calle Inactiva 3",
            location=Point(-5.98, 37.39, srid=4326),
            is_active=False,
        )

        pipeline = self._load_pipeline()
        spider = FakeSpider()
        item = _make_item()

        pipeline.open_spider(spider)
        async_to_sync(pipeline.process_item)(item, spider)

        product = Product.objects.get(barcode="8480000123456")
        prices = Price.objects.filter(product=product).order_by("store_id")

        assert prices.count() == 2
        assert {price.store_id for price in prices} == {store_1.id, store_2.id}
        assert all(price.price == Decimal("1.29") for price in prices)

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
