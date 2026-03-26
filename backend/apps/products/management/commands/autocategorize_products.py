"""Asigna categorias automaticamente a productos existentes."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.products.models import Product
from apps.products.services.category_auto_classifier import auto_assign_category_to_product


class Command(BaseCommand):
    """Recorre productos y asigna categoria inferida por nombre."""

    help = "Autocategoriza productos por heuristica de palabras clave."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--brand",
            default="",
            help="Filtra por marca exacta (opcional).",
        )
        parser.add_argument(
            "--only-empty",
            action="store_true",
            help="Solo procesa productos sin categoria (default recomendado).",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Permite reemplazar categorias existentes.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Maximo de productos a procesar (0 = sin limite).",
        )

    def handle(self, *args, **options) -> None:
        queryset = Product.objects.all().order_by("id")

        brand = options["brand"].strip()
        if brand:
            queryset = queryset.filter(brand__iexact=brand)

        if options["only_empty"]:
            queryset = queryset.filter(category__isnull=True)

        limit = int(options["limit"])
        if limit > 0:
            queryset = queryset[:limit]

        processed = 0
        updated = 0
        for product in queryset:
            processed += 1
            if auto_assign_category_to_product(product, overwrite=bool(options["overwrite"])):
                updated += 1

        self.stdout.write(self.style.SUCCESS("Autocategorizacion completada."))
        self.stdout.write(f"processed={processed}")
        self.stdout.write(f"updated={updated}")
