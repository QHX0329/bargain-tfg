"""Comando de diagnóstico del estado del scraping.

Muestra, contra la base de datos a la que apunte ``DATABASE_URL``:

1. Las cadenas comerciales presentes y su número de tiendas activas.
2. Para cada spider, si el pipeline encontrará una tienda con la que
   casar la cadena (replicando exactamente el filtro de
   ``PriceUpsertPipeline._match_stores``); de lo contrario, todos sus
   items se descartarán con ``DropItem``.
3. El recuento de precios por fuente, los precios de origen ``scraping``
   agrupados por cadena, y el total de productos.

Es de solo lectura: no modifica datos. Se usa para verificar el estado
antes y después de ejecutar los spiders contra producción.

Uso:
    python manage.py scraping_status [--title "PREFLIGHT"]
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.prices.models import Price
from apps.products.models import Product
from apps.stores.models import Store, StoreChain

# Cadena (``store_chain``) que emite cada spider. Debe mantenerse en
# sincronía con los literales ``store_chain=`` de los spiders y con
# ``SPIDER_MAP`` en ``apps/scraping/tasks.py``.
SPIDER_CHAINS: dict[str, str] = {
    "mercadona": "Mercadona",
    "carrefour": "Carrefour",
    "lidl": "Lidl",
    "dia": "DIA",
    "costco": "Costco",
    "alcampo": "Alcampo",
    "hipercor": "Hipercor",
    "eroski": "Eroski",
    "spar": "Spar",
    "consum": "Consum",
    "coviran": "Coviran",
}


class Command(BaseCommand):
    """Imprime un diagnóstico del estado del scraping y el matching de cadenas."""

    help = "Diagnóstico de scraping: cadenas, matching de spiders y recuento de precios."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--title",
            default="ESTADO DE SCRAPING",
            help="Etiqueta para la cabecera del informe (p. ej. PREFLIGHT/POSTFLIGHT).",
        )

    def handle(self, *args, **options) -> None:
        title = options["title"]
        self._section(title)

        self._print_chains()
        self._print_spider_matching()
        self._print_price_summary()

    # ── Bloques del informe ──────────────────────────────────────────

    def _print_chains(self) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING("Cadenas presentes (StoreChain):"))
        chains = (
            StoreChain.objects.annotate(
                stores_activas=Count("stores", filter=_active_store_filter())
            )
            .order_by("name")
        )
        if not chains:
            self.stdout.write("  (ninguna)")
            return
        for chain in chains:
            self.stdout.write(f"  - {chain.name:<24} tiendas activas: {chain.stores_activas}")

    def _print_spider_matching(self) -> None:
        self.stdout.write("")
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "Matching por spider (¿persistirá o descartará items?):"
            )
        )
        will_write: list[str] = []
        will_drop: list[str] = []
        for spider, chain_name in SPIDER_CHAINS.items():
            matched = Store.objects.filter(
                chain__name__icontains=chain_name, is_active=True
            ).count()
            if matched:
                will_write.append(spider)
                line = self.style.SUCCESS(
                    f"  OK    {spider:<11} → '{chain_name}'  ({matched} tienda/s)"
                )
            else:
                will_drop.append(spider)
                line = self.style.ERROR(
                    f"  DROP  {spider:<11} → '{chain_name}'  (sin cadena: items descartados)"
                )
            self.stdout.write(line)

        self.stdout.write("")
        self.stdout.write(
            f"  Persistirán {len(will_write)}/{len(SPIDER_CHAINS)}: "
            f"{', '.join(will_write) or '—'}"
        )
        if will_drop:
            self.stdout.write(
                self.style.WARNING(
                    f"  Descartarán todo: {', '.join(will_drop)} "
                    "(crea una StoreChain+Store con ese nombre para habilitarlos)"
                )
            )

    def _print_price_summary(self) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Recuento de precios y productos:"))

        total_prices = Price.objects.count()
        total_products = Product.objects.count()
        self.stdout.write(f"  Productos totales: {total_products}")
        self.stdout.write(f"  Precios totales:   {total_prices}")

        by_source = Price.objects.values("source").annotate(n=Count("id")).order_by("-n")
        self.stdout.write("  Precios por fuente:")
        if by_source:
            for row in by_source:
                self.stdout.write(f"    - {row['source']:<14} {row['n']}")
        else:
            self.stdout.write("    (sin precios)")

        scraped = (
            Price.objects.filter(source=Price.Source.SCRAPING)
            .values("store__chain__name")
            .annotate(n=Count("id"))
            .order_by("-n")
        )
        self.stdout.write("  Precios 'scraping' por cadena:")
        if scraped:
            for row in scraped:
                name = row["store__chain__name"] or "(sin cadena)"
                self.stdout.write(f"    - {name:<24} {row['n']}")
        else:
            self.stdout.write("    (aún no hay precios de scraping)")

    # ── Utilidades ───────────────────────────────────────────────────

    def _section(self, title: str) -> None:
        bar = "=" * 70
        self.stdout.write("")
        self.stdout.write(bar)
        self.stdout.write(f"  {title}")
        self.stdout.write(bar)


def _active_store_filter():
    """Filtro reutilizable para contar solo tiendas activas en el annotate."""
    from django.db.models import Q

    return Q(stores__is_active=True)
