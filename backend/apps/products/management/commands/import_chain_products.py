"""Importa productos y precios de cadenas desde un JSON estructurado por cadena."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.prices.models import Price
from apps.products.models import Product
from apps.products.services.category_auto_classifier import (
    auto_assign_category_to_product,
    get_or_create_category_pair,
)
from apps.stores.models import Store, StoreChain


@dataclass
class ImportStats:
    """Acumuladores de importacion por comando."""

    products_created: int = 0
    products_updated: int = 0
    categories_assigned: int = 0
    prices_created: int = 0
    prices_updated: int = 0
    rows_skipped: int = 0


class Command(BaseCommand):
    """Importa productos/precios para cadenas ya existentes en StoreChain."""

    help = (
        "Importa productos por cadena desde JSON. El formato esperado es un objeto con "
        "claves de cadena (eroski, spar, consum, etc.) y listas de filas con name, "
        "source_url y price opcional."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--input-file",
            required=True,
            help="Ruta al JSON de entrada.",
        )
        parser.add_argument(
            "--chains",
            default="all",
            help="Lista separada por comas de cadenas a importar (default: all).",
        )
        parser.add_argument(
            "--price-source",
            default=Price.Source.SCRAPING,
            choices=[choice for choice, _ in Price.Source.choices],
            help="Valor source en Price para filas con precio.",
        )
        parser.add_argument(
            "--auto-categorize",
            action="store_true",
            help="Asigna categoria automaticamente por nombre de producto.",
        )
        parser.add_argument(
            "--overwrite-categories",
            action="store_true",
            help="Sobrescribe categoria existente al autocategorizar.",
        )

    def handle(self, *args, **options) -> None:
        input_path = Path(options["input_file"]).resolve()
        if not input_path.exists():
            raise CommandError(f"No existe input-file: {input_path}")

        payload = self._load_payload(input_path)
        selected_chains = self._resolve_chain_selection(payload, options["chains"])
        stats = ImportStats()

        with transaction.atomic():
            for chain_key in selected_chains:
                self._import_chain(
                    chain_key=chain_key,
                    rows=payload.get(chain_key, []),
                    price_source=options["price_source"],
                    auto_categorize=bool(options["auto_categorize"]),
                    overwrite_categories=bool(options["overwrite_categories"]),
                    stats=stats,
                )

        self.stdout.write(self.style.SUCCESS("Importacion de productos completada."))
        self.stdout.write(f"products_created={stats.products_created}")
        self.stdout.write(f"products_updated={stats.products_updated}")
        self.stdout.write(f"categories_assigned={stats.categories_assigned}")
        self.stdout.write(f"prices_created={stats.prices_created}")
        self.stdout.write(f"prices_updated={stats.prices_updated}")
        self.stdout.write(f"rows_skipped={stats.rows_skipped}")

    @staticmethod
    def _load_payload(input_path: Path) -> dict[str, list[dict]]:
        try:
            data = json.loads(input_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"JSON invalido en {input_path}: {exc}") from exc

        if not isinstance(data, dict):
            raise CommandError("El JSON debe ser un objeto con claves por cadena.")

        for key, value in data.items():
            if not isinstance(value, list):
                raise CommandError(f"La clave '{key}' debe contener una lista de filas.")

        return data

    @staticmethod
    def _resolve_chain_selection(payload: dict[str, list[dict]], chains_option: str) -> list[str]:
        if chains_option.strip().lower() == "all":
            return sorted(payload.keys())

        selected = [value.strip().lower() for value in chains_option.split(",") if value.strip()]
        unknown = [value for value in selected if value not in payload]
        if unknown:
            raise CommandError(f"Cadenas no presentes en JSON: {', '.join(sorted(unknown))}")
        return selected

    def _import_chain(
        self,
        *,
        chain_key: str,
        rows: list[dict],
        price_source: str,
        auto_categorize: bool,
        overwrite_categories: bool,
        stats: ImportStats,
    ) -> None:
        chain_name = chain_key.capitalize()
        chain = StoreChain.objects.filter(name__iexact=chain_name).first()
        if chain is None:
            self.stdout.write(self.style.WARNING(f"[SKIP] Cadena no encontrada: {chain_name}"))
            stats.rows_skipped += len(rows)
            return

        stores = list(Store.objects.filter(chain=chain, is_active=True).order_by("id"))
        self.stdout.write(
            f"[CHAIN] {chain.name}: rows={len(rows)} stores={len(stores)}"
        )

        for row in rows:
            if not isinstance(row, dict):
                stats.rows_skipped += 1
                continue

            name_raw = str(row.get("name", "")).strip()
            if not name_raw:
                stats.rows_skipped += 1
                continue

            product, created = self._upsert_product(
                name=name_raw,
                chain_name=chain.name,
                source_url=str(row.get("source_url", "")).strip(),
            )
            if created:
                stats.products_created += 1
            else:
                stats.products_updated += 1

            assigned = self._assign_category_if_needed(
                product=product,
                row_category_name=str(row.get("category_name", "")).strip(),
                auto_categorize=auto_categorize,
                overwrite_categories=overwrite_categories,
            )
            if assigned:
                stats.categories_assigned += 1

            price_value = self._parse_price(row.get("price"))
            if price_value is None:
                continue

            self._upsert_prices_for_chain_stores(
                product=product,
                stores=stores,
                price=price_value,
                source=price_source,
                stats=stats,
            )

    @staticmethod
    def _upsert_product(name: str, chain_name: str, source_url: str) -> tuple[Product, bool]:
        normalized_name = name.lower().strip()
        product = (
            Product.objects.filter(normalized_name=normalized_name, brand=chain_name)
            .order_by("id")
            .first()
        )

        if product is None:
            product = Product.objects.create(
                name=name,
                normalized_name=normalized_name,
                brand=chain_name,
                image_url=source_url,
                unit=Product.Unit.UNITS,
                unit_quantity=1.0,
                is_active=True,
            )
            return product, True

        update_fields: list[str] = []
        if source_url and product.image_url != source_url:
            product.image_url = source_url
            update_fields.append("image_url")
        if not product.is_active:
            product.is_active = True
            update_fields.append("is_active")
        if update_fields:
            product.save(update_fields=update_fields + ["updated_at"])

        return product, False

    @staticmethod
    def _assign_category_if_needed(
        *,
        product: Product,
        row_category_name: str,
        auto_categorize: bool,
        overwrite_categories: bool,
    ) -> bool:
        if row_category_name:
            category = get_or_create_category_pair("Importadas", row_category_name)
            if product.category_id != category.id:
                product.category = category
                product.save(update_fields=["category", "updated_at"])
                return True

        if not auto_categorize:
            return False

        return auto_assign_category_to_product(product, overwrite=overwrite_categories)

    @staticmethod
    def _parse_price(raw_value: object) -> Decimal | None:
        if raw_value in (None, ""):
            return None

        if isinstance(raw_value, Decimal):
            return raw_value

        text = str(raw_value).strip().replace(",", ".")
        try:
            return Decimal(text)
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _upsert_prices_for_chain_stores(
        *,
        product: Product,
        stores: list[Store],
        price: Decimal,
        source: str,
        stats: ImportStats,
    ) -> None:
        verified_at = timezone.now()
        for store in stores:
            _, created = Price.objects.update_or_create(
                product=product,
                store=store,
                source=source,
                defaults={
                    "price": price,
                    "is_stale": False,
                    "verified_at": verified_at,
                },
            )
            if created:
                stats.prices_created += 1
            else:
                stats.prices_updated += 1
