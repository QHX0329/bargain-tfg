"""
Pipelines de Scrapy para el proyecto BargAIn.

PriceUpsertPipeline persiste el catalogo scrapeado como fuente de verdad,
sin depender del seed local para resolver productos.
"""

import os
import sys

import django
import structlog
from asgiref.sync import sync_to_async
from django.utils.text import slugify
from scrapy.exceptions import DropItem

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")


def _resolve_backend_dir() -> str:
    """Resuelve el proyecto Django desde entorno local o Docker."""
    candidates: list[str] = []
    env_dir = os.environ.get("DJANGO_PROJECT_DIR")
    if env_dir:
        candidates.append(env_dir)

    candidates.extend(
        [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")),
            "/app",
        ]
    )

    for candidate in candidates:
        if os.path.isdir(os.path.join(candidate, "apps")) and os.path.isdir(
            os.path.join(candidate, "config")
        ):
            return candidate

    checked = ", ".join(candidates)
    raise FileNotFoundError(
        "No se encontro el proyecto Django para el pipeline de scraping. "
        f"Rutas comprobadas: {checked}."
    )


_BACKEND_DIR = _resolve_backend_dir()
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

django.setup()

from django.utils import timezone  # noqa: E402

from apps.prices.models import Price  # noqa: E402
from apps.products.models import Category, Product  # noqa: E402
from apps.stores.models import Store  # noqa: E402

logger = structlog.get_logger(__name__)


class PriceUpsertPipeline:
    """Pipeline que escribe productos y precios scrapeados en Django."""

    def __init__(self):
        self._processed = 0
        self._matched = 0
        self._dropped = 0

    def open_spider(self, spider) -> None:
        logger.info("PriceUpsertPipeline abierto", spider=spider.name)
        self._processed = 0
        self._matched = 0
        self._dropped = 0

    def close_spider(self, spider) -> None:
        logger.info(
            "PriceUpsertPipeline cerrado",
            spider=spider.name,
            processed=self._processed,
            matched=self._matched,
            dropped=self._dropped,
        )

    async def process_item(self, item, spider):
        return await sync_to_async(self._process_item_sync, thread_sensitive=True)(
            item,
            spider,
        )

    def _process_item_sync(self, item, spider):
        self._processed += 1

        stores = self._match_stores(item)
        if not stores:
            self._dropped += 1
            logger.warning(
                "Tienda no encontrada; item descartado",
                store_chain=item.get("store_chain"),
                spider=spider.name,
            )
            raise DropItem(f"Tienda no encontrada: {item.get('store_chain')}")

        product = self._upsert_product(item)

        verified_at = timezone.now()
        for store in stores:
            Price.objects.update_or_create(
                product=product,
                store=store,
                defaults={
                    "price": item["price"],
                    "unit_price": item.get("unit_price"),
                    "offer_price": item.get("offer_price"),
                    "offer_end_date": item.get("offer_end_date"),
                    "source": "scraping",
                    "verified_at": verified_at,
                    "is_stale": False,
                },
            )

        self._matched += len(stores)
        logger.debug(
            "Precio upserted en tiendas de cadena",
            product=product.name,
            stores_count=len(stores),
            price=str(item["price"]),
            spider=spider.name,
        )
        return item

    def _upsert_product(self, item):
        """Crea o actualiza el producto usando solo identidad scrapeada."""
        product_name = (item.get("product_name") or "").strip()
        if not product_name:
            raise DropItem("Producto sin nombre")

        normalized_name = product_name.lower()
        barcode = (item.get("barcode") or "").strip() or None
        category = self._get_or_create_category(item.get("category_name"))

        product = None
        if barcode:
            product = Product.objects.filter(barcode=barcode).first()

        if product is None:
            product = Product.objects.filter(
                normalized_name=normalized_name,
                barcode__isnull=True,
            ).first()

        if product is None:
            product = Product.objects.create(
                name=product_name,
                normalized_name=normalized_name,
                barcode=barcode,
                category=category,
                image_url=item.get("image_url") or "",
                is_active=True,
            )
            return product

        dirty_fields = []
        if product.name != product_name:
            product.name = product_name
            dirty_fields.append("name")
        if product.normalized_name != normalized_name:
            product.normalized_name = normalized_name
            dirty_fields.append("normalized_name")
        if barcode and product.barcode != barcode:
            product.barcode = barcode
            dirty_fields.append("barcode")
        if category and product.category_id != category.id:
            product.category = category
            dirty_fields.append("category")

        image_url = item.get("image_url") or ""
        if image_url and product.image_url != image_url:
            product.image_url = image_url
            dirty_fields.append("image_url")

        if not product.is_active:
            product.is_active = True
            dirty_fields.append("is_active")

        if dirty_fields:
            product.save(update_fields=dirty_fields + ["updated_at"])

        return product

    def _get_or_create_category(self, category_name):
        if not category_name:
            return None

        slug = slugify(category_name)
        category, _ = Category.objects.get_or_create(
            slug=slug,
            defaults={"name": category_name},
        )
        return category

    def _match_stores(self, item):
        store_chain = item.get("store_chain", "")
        if not store_chain:
            return []

        return list(
            Store.objects.filter(chain__name__icontains=store_chain, is_active=True)
            .select_related("chain")
            .order_by("id")
        )
