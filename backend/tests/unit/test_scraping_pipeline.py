"""
Tests unitarios para el pipeline de scraping y la tarea Celery run_spider.

Verifica:
- PriceUpsertPipeline upserta correctamente en Price cuando hay match.
- PriceUpsertPipeline descarta items cuando el producto no existe.
- SPIDER_MAP contiene los 4 spiders requeridos.
- run_spider rechaza nombres de spider desconocidos.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

# ── Tests del SPIDER_MAP ──────────────────────────────────────────────────────


def test_spider_map_contains_all_four():
    """SPIDER_MAP debe contener exactamente los 4 spiders planificados."""
    from apps.scraping.tasks import SPIDER_MAP

    assert set(SPIDER_MAP.keys()) == {"mercadona", "carrefour", "lidl", "dia"}


def test_spider_map_values_are_dotted_paths():
    """Cada valor de SPIDER_MAP debe ser una ruta Python dotted válida."""
    from apps.scraping.tasks import SPIDER_MAP

    for name, path in SPIDER_MAP.items():
        assert "." in path, f"Spider path para '{name}' no tiene módulo dotted: {path}"
        class_name = path.rsplit(".", 1)[1]
        assert class_name.endswith("Spider"), (
            f"Clase de spider para '{name}' no termina en 'Spider': {class_name}"
        )


# ── Tests de run_spider (Celery task) ─────────────────────────────────────────


def test_run_spider_rejects_unknown_name():
    """run_spider debe lanzar ValueError si el nombre del spider no existe."""
    from apps.scraping.tasks import run_spider

    with pytest.raises(ValueError, match="Spider desconocido"):
        run_spider("unknown_spider_xyz")


def test_run_spider_rejects_empty_name():
    """run_spider debe lanzar ValueError con string vacío."""
    from apps.scraping.tasks import run_spider

    with pytest.raises(ValueError):
        run_spider("")


# ── Tests del PriceUpsertPipeline ─────────────────────────────────────────────


class FakeSpider:
    """Spider ficticio para tests del pipeline."""

    name = "test_spider"


def _make_item(**kwargs):
    """Crea un item de producto para tests."""
    from bargain_scraping.items import ProductPriceItem

    defaults = {
        "product_name": "Leche Entera 1L",
        "store_chain": "Mercadona",
        "price": Decimal("1.29"),
        "unit_price": Decimal("1.29"),
        "offer_price": None,
        "offer_end_date": None,
        "barcode": "8480000123456",
        "category_name": "Lácteos",
        "url": "https://tienda.mercadona.es/api/categories/1/",
    }
    defaults.update(kwargs)
    return ProductPriceItem(**defaults)


@pytest.mark.django_db
class TestPipelineUpsert:
    """Tests para PriceUpsertPipeline.process_item."""

    def test_pipeline_upserts_price_on_matched_product(self, db):
        """Pipeline llama a Price.objects.update_or_create con source='scraping'."""
        from django.contrib.gis.geos import Point
        from django.utils import timezone

        from apps.prices.models import Price
        from apps.products.models import Product
        from apps.stores.models import Store, StoreChain

        # Crear cadena y tienda
        chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
        store = Store.objects.create(
            name="Mercadona Test",
            chain=chain,
            address="Calle Test 1",
            location=Point(-5.9845, 37.3891, srid=4326),
            is_active=True,
        )

        # Crear producto con barcode conocido
        product = Product.objects.create(
            name="Leche Entera 1L",
            normalized_name="leche entera 1l",
            barcode="8480000123456",
        )

        item = _make_item(barcode="8480000123456", store_chain="Mercadona")
        spider = FakeSpider()

        # Importar y ejecutar el pipeline
        # Mockeamos django.setup() en pipelines.py para evitar doble init
        import sys

        # El módulo puede ya estar importado con django ya configurado
        if "bargain_scraping.pipelines" in sys.modules:
            del sys.modules["bargain_scraping.pipelines"]

        import os

        _scraping_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "scraping")
        )
        if _scraping_dir not in sys.path:
            sys.path.insert(0, _scraping_dir)

        # Parchear django.setup para que no se llame dos veces
        with patch("django.setup"):
            from bargain_scraping.pipelines import PriceUpsertPipeline

            pipeline = PriceUpsertPipeline()
            pipeline.open_spider(spider)
            result = pipeline.process_item(item, spider)

        # Verificar que el precio fue creado/actualizado
        assert Price.objects.filter(product=product, store=store).exists()
        price = Price.objects.get(product=product, store=store)
        assert price.source == "scraping"
        assert price.price == Decimal("1.29")
        assert price.verified_at is not None
        # verified_at debe ser reciente (menos de 60 segundos de diferencia)
        delta = abs((timezone.now() - price.verified_at).total_seconds())
        assert delta < 60

        assert result == item

    def test_pipeline_drops_unmatched_product(self, db):
        """Pipeline descarta el item si el producto no existe en la BD."""
        from scrapy.exceptions import DropItem

        from django.contrib.gis.geos import Point
        from apps.stores.models import Store, StoreChain

        # Crear tienda pero NO el producto
        chain = StoreChain.objects.create(name="Mercadona", slug="mercadona")
        Store.objects.create(
            name="Mercadona Test",
            chain=chain,
            address="Calle Test 1",
            location=Point(-5.9845, 37.3891, srid=4326),
            is_active=True,
        )

        item = _make_item(
            barcode="9999999999999",  # Barcode que no existe
            product_name="ProductoQueNoExiste XYZ 999",
            store_chain="Mercadona",
        )
        spider = FakeSpider()

        import os
        import sys

        _scraping_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "scraping")
        )
        if _scraping_dir not in sys.path:
            sys.path.insert(0, _scraping_dir)

        with patch("django.setup"):
            from bargain_scraping.pipelines import PriceUpsertPipeline

            pipeline = PriceUpsertPipeline()
            pipeline.open_spider(spider)

            with pytest.raises(DropItem):
                pipeline.process_item(item, spider)
