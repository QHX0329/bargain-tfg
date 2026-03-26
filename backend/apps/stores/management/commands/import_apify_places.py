"""Importa comercios de alimentacion desde un export JSON de Apify Google Places."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.stores.models import Store, StoreChain


KNOWN_CHAIN_NAMES = [
    "Mercadona",
    "Carrefour",
    "Lidl",
    "Dia",
    "Alcampo",
    "Aldi",
    "Makro",
    "Costco",
    "Eroski",
    "Hipercor",
    "Supercor",
    "Spar",
    "Mas",
    "Coviran",
    "Consum",
    "Ahorramas",
    "Froiz",
    "Bonpreu",
    "Bonarea",
]

FOOD_KEYWORDS = {
    "supermercado",
    "hipermercado",
    "cash and carry",
    "mayorista",
    "aliment",
    "mercado",
    "fruteria",
    "fruteria",
    "carniceria",
    "pescaderia",
    "charcuteria",
    "panaderia",
    "tienda de alimentos",
    "tienda de comestibles",
    "gourmet",
}


@dataclass
class ImportStats:
    """Resumen de resultados del importador."""

    created: int = 0
    updated: int = 0
    skipped: int = 0
    invalid: int = 0


class Command(BaseCommand):
    """Importa tiendas desde el JSON exportado por Apify Google Places."""

    help = (
        "Importa comercios de alimentacion a Store desde un JSON de Apify Google Places. "
        "Crea/actualiza cadenas conocidas y marca comercios locales para el resto."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--input-file",
            required=True,
            help="Ruta al JSON exportado por Apify (debe contener 'items').",
        )
        parser.add_argument(
            "--province",
            required=False,
            help="Provincia a filtrar (campo state), por ejemplo 'Sevilla'.",
        )
        parser.add_argument(
            "--country-code",
            default="ES",
            help="Codigo de pais ISO-2 para filtrar (por defecto: ES).",
        )

    def handle(self, *args, **options) -> None:
        input_file = Path(options["input_file"])
        province = (options.get("province") or "").strip()
        country_code = (options.get("country_code") or "").strip().upper()

        if not input_file.exists():
            raise CommandError(f"No existe el archivo: {input_file}")

        payload = self._load_payload(input_file)
        items = payload.get("items") if isinstance(payload, dict) else payload

        if not isinstance(items, list):
            raise CommandError("Formato invalido: se esperaba una lista de items")

        stats = ImportStats()
        with transaction.atomic():
            for item in items:
                self._import_item(
                    item=item,
                    province=province,
                    country_code=country_code,
                    stats=stats,
                )

        self.stdout.write(self.style.SUCCESS("Importacion Apify completada."))
        self.stdout.write(f"Tiendas creadas: {stats.created}")
        self.stdout.write(f"Tiendas actualizadas: {stats.updated}")
        self.stdout.write(f"Items omitidos: {stats.skipped}")
        self.stdout.write(f"Items invalidos: {stats.invalid}")

    @staticmethod
    def _load_payload(input_file: Path) -> dict | list:
        try:
            with input_file.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except json.JSONDecodeError as exc:
            raise CommandError(f"JSON invalido: {exc}") from exc

    def _import_item(
        self,
        *,
        item: object,
        province: str,
        country_code: str,
        stats: ImportStats,
    ) -> None:
        if not isinstance(item, dict):
            stats.invalid += 1
            return

        item_country_code = str(item.get("countryCode") or "").upper()
        if country_code and item_country_code and item_country_code != country_code:
            stats.skipped += 1
            return

        if province:
            item_province = str(item.get("state") or "")
            if item_province.casefold() != province.casefold():
                stats.skipped += 1
                return

        if not _is_food_related(item):
            stats.skipped += 1
            return

        name = str(item.get("title") or "").strip()
        location = item.get("location")
        if not name or not isinstance(location, dict):
            stats.invalid += 1
            return

        lat = location.get("lat")
        lng = location.get("lng")
        if lat is None or lng is None:
            stats.invalid += 1
            return

        address = str(item.get("address") or item.get("street") or "").strip() or "Sin direccion"

        chain_name = _extract_chain_name(item)
        chain = None
        is_local_business = True
        if chain_name:
            chain_slug = slugify(chain_name)
            chain, _ = StoreChain.objects.get_or_create(
                slug=chain_slug,
                defaults={"name": chain_name, "logo_url": ""},
            )
            is_local_business = False

        place_id = _extract_place_id(str(item.get("url") or ""))
        defaults = {
            "name": name,
            "chain": chain,
            "address": address,
            "location": Point(float(lng), float(lat), srid=4326),
            "opening_hours": {},
            "is_local_business": is_local_business,
            "business_profile": None,
            "is_active": True,
            "google_place_id": place_id or "",
        }

        if place_id:
            _, created = Store.objects.update_or_create(
                google_place_id=place_id,
                defaults=defaults,
            )
        else:
            _, created = Store.objects.update_or_create(
                name=name,
                address=address,
                defaults=defaults,
            )

        if created:
            stats.created += 1
        else:
            stats.updated += 1


def _extract_chain_name(item: dict) -> str | None:
    """Detecta una cadena conocida por nombre en titulo/categorias."""
    haystack = " ".join(
        [
            str(item.get("title") or ""),
            str(item.get("categoryName") or ""),
            " ".join(item.get("categories") or []),
        ]
    ).casefold()

    for chain_name in KNOWN_CHAIN_NAMES:
        if chain_name.casefold() in haystack:
            return chain_name
    return None


def _is_food_related(item: dict) -> bool:
    """Valida si el comercio parece de alimentacion."""
    candidates = [
        str(item.get("title") or ""),
        str(item.get("categoryName") or ""),
        " ".join(item.get("categories") or []),
    ]
    haystack = " ".join(candidates).casefold()

    return any(keyword in haystack for keyword in FOOD_KEYWORDS)


def _extract_place_id(url: str) -> str | None:
    """Extrae query_place_id desde la URL de Google Maps."""
    if not url:
        return None
    query_string = urlparse(url).query
    values = parse_qs(query_string).get("query_place_id")
    if not values:
        return None
    return values[0]
