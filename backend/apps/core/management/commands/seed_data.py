"""Comando para poblar datos de prueba del proyecto BargAIn."""

from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.business.models import BusinessProfile, Promotion
from apps.notifications.models import Notification, NotificationType, UserPushToken
from apps.prices.models import Price, PriceAlert
from apps.products.models import Category, Product, ProductProposal
from apps.shopping_lists.models import (
    ListCollaborator,
    ListTemplate,
    ListTemplateItem,
    ShoppingList,
    ShoppingListItem,
)
from apps.stores.models import Store, StoreChain, UserFavoriteStore

DEFAULT_SEED_PASSWORD = "seedpass123"
SEED_PREFIX = "seed_"

# ── Datos realistas ──────────────────────────────────────────────────────────

# (name, brand, category_key, unit, unit_qty, barcode, base_price)
PRODUCT_SPECS = [
    # Frutas y verduras
    (
        "manzana golden",
        "Frutería del Norte",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000001",
        Decimal("1.85"),
    ),
    (
        "manzana fuji",
        "Frutería del Norte",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000002",
        Decimal("2.10"),
    ),
    (
        "pera conferencia",
        "Frutería del Norte",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000003",
        Decimal("1.95"),
    ),
    (
        "plátano de canarias",
        "Platanera Sur",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000004",
        Decimal("2.20"),
    ),
    (
        "naranja navel",
        "Cítricos Valencia",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000005",
        Decimal("1.29"),
    ),
    (
        "mandarina clementina",
        "Cítricos Valencia",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000006",
        Decimal("1.49"),
    ),
    (
        "uva blanca sin pepita",
        "Viñedos Almería",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000007",
        Decimal("2.75"),
    ),
    ("fresas", "Fresón de Palos", "fruit", "kg", Decimal("0.5"), "8400000000008", Decimal("2.99")),
    (
        "melocotón",
        "Frutas Murcia",
        "fruit",
        "kg",
        Decimal("1.0"),
        "8400000000009",
        Decimal("2.45"),
    ),
    ("sandía", "Frutas Murcia", "fruit", "unit", Decimal("5.0"), "8400000000010", Decimal("5.99")),
    (
        "tomate rama",
        "Huerta Sevilla",
        "vegetables",
        "kg",
        Decimal("1.0"),
        "8400000000011",
        Decimal("1.59"),
    ),
    (
        "tomate cherry",
        "Huerta Sevilla",
        "vegetables",
        "kg",
        Decimal("0.25"),
        "8400000000012",
        Decimal("2.49"),
    ),
    (
        "lechuga iceberg",
        "Verduras del Campo",
        "vegetables",
        "unit",
        Decimal("1.0"),
        "8400000000013",
        Decimal("0.89"),
    ),
    (
        "zanahoria",
        "Verduras del Campo",
        "vegetables",
        "kg",
        Decimal("1.0"),
        "8400000000014",
        Decimal("0.79"),
    ),
    (
        "cebolla",
        "Verduras del Campo",
        "vegetables",
        "kg",
        Decimal("1.0"),
        "8400000000015",
        Decimal("0.65"),
    ),
    (
        "ajo",
        "Verduras del Campo",
        "vegetables",
        "unit",
        Decimal("1.0"),
        "8400000000016",
        Decimal("0.49"),
    ),
    (
        "patata",
        "Verduras del Campo",
        "vegetables",
        "kg",
        Decimal("2.0"),
        "8400000000017",
        Decimal("1.09"),
    ),
    (
        "pimiento rojo",
        "Huerta Sevilla",
        "vegetables",
        "kg",
        Decimal("1.0"),
        "8400000000018",
        Decimal("1.89"),
    ),
    (
        "brócoli",
        "Verduras del Campo",
        "vegetables",
        "unit",
        Decimal("1.0"),
        "8400000000019",
        Decimal("1.29"),
    ),
    (
        "espinacas baby",
        "Verduras del Campo",
        "vegetables",
        "g",
        Decimal("150.0"),
        "8400000000020",
        Decimal("1.99"),
    ),
    # Lácteos
    (
        "leche entera brick 1L",
        "Puleva",
        "dairy",
        "l",
        Decimal("1.0"),
        "8400000000021",
        Decimal("0.89"),
    ),
    (
        "leche semidesnatada 1L",
        "Puleva",
        "dairy",
        "l",
        Decimal("1.0"),
        "8400000000022",
        Decimal("0.85"),
    ),
    (
        "leche desnatada 1L",
        "Puleva",
        "dairy",
        "l",
        Decimal("1.0"),
        "8400000000023",
        Decimal("0.83"),
    ),
    ("leche sin lactosa", "Kaiku", "dairy", "l", Decimal("1.0"), "8400000000024", Decimal("1.29")),
    (
        "yogur natural azucarado",
        "Danone",
        "dairy",
        "unit",
        Decimal("4.0"),
        "8400000000025",
        Decimal("1.39"),
    ),
    (
        "yogur griego natural",
        "Fage",
        "dairy",
        "g",
        Decimal("500.0"),
        "8400000000026",
        Decimal("2.29"),
    ),
    (
        "queso manchego curado",
        "García Baquero",
        "dairy",
        "g",
        Decimal("200.0"),
        "8400000000027",
        Decimal("3.49"),
    ),
    (
        "queso fresco",
        "Hacendado",
        "dairy",
        "g",
        Decimal("400.0"),
        "8400000000028",
        Decimal("1.99"),
    ),
    ("mantequilla", "Président", "dairy", "g", Decimal("250.0"), "8400000000029", Decimal("2.19")),
    (
        "nata para cocinar",
        "Pascual",
        "dairy",
        "ml",
        Decimal("200.0"),
        "8400000000030",
        Decimal("0.99"),
    ),
    # Panadería y cereales
    ("pan baguette", "Bimbo", "bakery", "unit", Decimal("1.0"), "8400000000031", Decimal("0.59")),
    (
        "pan de molde integral",
        "Bimbo",
        "bakery",
        "g",
        Decimal("500.0"),
        "8400000000032",
        Decimal("1.89"),
    ),
    ("pan tostado", "Wasa", "bakery", "g", Decimal("275.0"), "8400000000033", Decimal("2.29")),
    (
        "croissant mantequilla",
        "La Bella Easo",
        "bakery",
        "unit",
        Decimal("4.0"),
        "8400000000034",
        Decimal("1.99"),
    ),
    (
        "copos de avena",
        "Quaker",
        "cereals",
        "g",
        Decimal("500.0"),
        "8400000000035",
        Decimal("1.79"),
    ),
    (
        "granola con frutas",
        "Jordans",
        "cereals",
        "g",
        Decimal("400.0"),
        "8400000000036",
        Decimal("3.49"),
    ),
    (
        "arroz largo",
        "La Fallera",
        "cereals",
        "kg",
        Decimal("1.0"),
        "8400000000037",
        Decimal("1.29"),
    ),
    (
        "pasta espagueti",
        "Gallo",
        "cereals",
        "g",
        Decimal("500.0"),
        "8400000000038",
        Decimal("0.79"),
    ),
    (
        "pasta macarrón",
        "Gallo",
        "cereals",
        "g",
        Decimal("500.0"),
        "8400000000039",
        Decimal("0.79"),
    ),
    ("quinoa", "Mercadona", "cereals", "g", Decimal("400.0"), "8400000000040", Decimal("2.99")),
    # Carnes
    (
        "pechuga de pollo",
        "El Pozo",
        "meat",
        "kg",
        Decimal("1.0"),
        "8400000000041",
        Decimal("5.99"),
    ),
    ("muslo de pollo", "El Pozo", "meat", "kg", Decimal("1.0"), "8400000000042", Decimal("3.49")),
    (
        "carne picada mixta",
        "Campofrío",
        "meat",
        "kg",
        Decimal("0.5"),
        "8400000000043",
        Decimal("3.99"),
    ),
    ("lomo de cerdo", "Campofrío", "meat", "kg", Decimal("1.0"), "8400000000044", Decimal("5.49")),
    (
        "salchichas Frankfurt",
        "Revilla",
        "meat",
        "g",
        Decimal("300.0"),
        "8400000000045",
        Decimal("1.89"),
    ),
    (
        "jamón cocido lonchas",
        "Campofrío",
        "meat",
        "g",
        Decimal("200.0"),
        "8400000000046",
        Decimal("2.49"),
    ),
    ("jamón serrano", "5J", "meat", "g", Decimal("100.0"), "8400000000047", Decimal("3.99")),
    ("chorizos", "El Pozo", "meat", "g", Decimal("250.0"), "8400000000048", Decimal("2.19")),
    (
        "bacon ahumado",
        "Campofrío",
        "meat",
        "g",
        Decimal("150.0"),
        "8400000000049",
        Decimal("2.29"),
    ),
    (
        "pavo a la plancha lonchas",
        "Palacios",
        "meat",
        "g",
        Decimal("200.0"),
        "8400000000050",
        Decimal("2.19"),
    ),
    # Pescado
    (
        "salmón fresco",
        "Mercado del Mar",
        "fish",
        "kg",
        Decimal("1.0"),
        "8400000000051",
        Decimal("12.99"),
    ),
    (
        "merluza filetes",
        "Pescanova",
        "fish",
        "g",
        Decimal("400.0"),
        "8400000000052",
        Decimal("4.99"),
    ),
    (
        "atún en aceite lata",
        "Calvo",
        "fish",
        "g",
        Decimal("80.0"),
        "8400000000053",
        Decimal("1.09"),
    ),
    (
        "sardinas en tomate lata",
        "Calvo",
        "fish",
        "g",
        Decimal("120.0"),
        "8400000000054",
        Decimal("0.89"),
    ),
    (
        "gambas congeladas",
        "Pescanova",
        "fish",
        "g",
        Decimal("400.0"),
        "8400000000055",
        Decimal("4.49"),
    ),
    # Bebidas
    (
        "agua mineral 1.5L",
        "Font Vella",
        "water",
        "l",
        Decimal("1.5"),
        "8400000000056",
        Decimal("0.39"),
    ),
    (
        "agua con gas 1L",
        "Vichy Catalán",
        "water",
        "l",
        Decimal("1.0"),
        "8400000000057",
        Decimal("0.89"),
    ),
    (
        "agua mineral 5L",
        "Font Vella",
        "water",
        "l",
        Decimal("5.0"),
        "8400000000058",
        Decimal("0.99"),
    ),
    (
        "zumo naranja 1L",
        "Don Simon",
        "drinks",
        "l",
        Decimal("1.0"),
        "8400000000059",
        Decimal("1.49"),
    ),
    ("zumo piña 1L", "Don Simon", "drinks", "l", Decimal("1.0"), "8400000000060", Decimal("1.49")),
    (
        "refresco cola 2L",
        "Coca-Cola",
        "drinks",
        "l",
        Decimal("2.0"),
        "8400000000061",
        Decimal("1.89"),
    ),
    (
        "refresco limón 2L",
        "Fanta",
        "drinks",
        "l",
        Decimal("2.0"),
        "8400000000062",
        Decimal("1.79"),
    ),
    (
        "cerveza lager lata",
        "Cruzcampo",
        "drinks",
        "ml",
        Decimal("330.0"),
        "8400000000063",
        Decimal("0.69"),
    ),
    (
        "vino tinto Rioja",
        "Marqués de Cáceres",
        "drinks",
        "ml",
        Decimal("750.0"),
        "8400000000064",
        Decimal("6.99"),
    ),
    (
        "café molido natural",
        "Nescafé",
        "drinks",
        "g",
        Decimal("250.0"),
        "8400000000065",
        Decimal("4.29"),
    ),
    # Congelados
    (
        "pizza margarita",
        "Casa Tarradellas",
        "frozen",
        "g",
        Decimal("350.0"),
        "8400000000066",
        Decimal("2.99"),
    ),
    (
        "pizza carbonara",
        "Casa Tarradellas",
        "frozen",
        "g",
        Decimal("350.0"),
        "8400000000067",
        Decimal("3.49"),
    ),
    (
        "patatas fritas congeladas",
        "Findus",
        "frozen",
        "g",
        Decimal("500.0"),
        "8400000000068",
        Decimal("1.99"),
    ),
    (
        "croquetas jamón",
        "Findus",
        "frozen",
        "g",
        Decimal("500.0"),
        "8400000000069",
        Decimal("3.29"),
    ),
    (
        "guisantes congelados",
        "Bonduelle",
        "frozen",
        "g",
        Decimal("400.0"),
        "8400000000070",
        Decimal("1.19"),
    ),
    # Conservas y condimentos
    (
        "aceite de oliva virgen extra 1L",
        "Carbonell",
        "pantry",
        "l",
        Decimal("1.0"),
        "8400000000071",
        Decimal("4.99"),
    ),
    (
        "aceite girasol 1L",
        "Koipesol",
        "pantry",
        "l",
        Decimal("1.0"),
        "8400000000072",
        Decimal("1.49"),
    ),
    (
        "tomate frito bote",
        "Hacendado",
        "pantry",
        "g",
        Decimal("350.0"),
        "8400000000073",
        Decimal("0.79"),
    ),
    (
        "tomate triturado lata",
        "Cirio",
        "pantry",
        "g",
        Decimal("400.0"),
        "8400000000074",
        Decimal("0.69"),
    ),
    (
        "lentejas cocidas bote",
        "Ferrer",
        "pantry",
        "g",
        Decimal("400.0"),
        "8400000000075",
        Decimal("0.89"),
    ),
    (
        "garbanzos cocidos bote",
        "Ferrer",
        "pantry",
        "g",
        Decimal("400.0"),
        "8400000000076",
        Decimal("0.89"),
    ),
    (
        "sal fina 1kg",
        "La Salina",
        "pantry",
        "kg",
        Decimal("1.0"),
        "8400000000077",
        Decimal("0.39"),
    ),
    (
        "azúcar blanquilla 1kg",
        "Azucarera",
        "pantry",
        "kg",
        Decimal("1.0"),
        "8400000000078",
        Decimal("0.99"),
    ),
    (
        "vinagre de Jerez",
        "Ybarra",
        "pantry",
        "ml",
        Decimal("500.0"),
        "8400000000079",
        Decimal("1.29"),
    ),
    (
        "miel multifloral",
        "La Colmena Real",
        "pantry",
        "g",
        Decimal("500.0"),
        "8400000000080",
        Decimal("4.49"),
    ),
    # Snacks y dulces
    ("patatas chips", "Lay's", "snacks", "g", Decimal("135.0"), "8400000000081", Decimal("1.89")),
    (
        "galletas María",
        "Fontaneda",
        "snacks",
        "g",
        Decimal("200.0"),
        "8400000000082",
        Decimal("0.89"),
    ),
    (
        "galletas digestive",
        "McVitie's",
        "snacks",
        "g",
        Decimal("250.0"),
        "8400000000083",
        Decimal("1.99"),
    ),
    (
        "chocolate negro 70%",
        "Lindt",
        "snacks",
        "g",
        Decimal("100.0"),
        "8400000000084",
        Decimal("1.89"),
    ),
    (
        "barritas de cereales",
        "Nature Valley",
        "snacks",
        "g",
        Decimal("210.0"),
        "8400000000085",
        Decimal("2.49"),
    ),
    # Higiene y limpieza
    (
        "gel de ducha",
        "Palmolive",
        "hygiene",
        "ml",
        Decimal("750.0"),
        "8400000000086",
        Decimal("2.49"),
    ),
    (
        "champú anticaspa",
        "Head & Shoulders",
        "hygiene",
        "ml",
        Decimal("400.0"),
        "8400000000087",
        Decimal("4.99"),
    ),
    (
        "pasta de dientes",
        "Colgate",
        "hygiene",
        "ml",
        Decimal("75.0"),
        "8400000000088",
        Decimal("1.99"),
    ),
    (
        "desodorante roll-on",
        "Dove",
        "hygiene",
        "ml",
        Decimal("50.0"),
        "8400000000089",
        Decimal("2.79"),
    ),
    (
        "papel higiénico 12 rollos",
        "Scottex",
        "hygiene",
        "unit",
        Decimal("12.0"),
        "8400000000090",
        Decimal("3.99"),
    ),
    (
        "detergente lavadora líquido",
        "Ariel",
        "hygiene",
        "ml",
        Decimal("1890.0"),
        "8400000000091",
        Decimal("8.99"),
    ),
    (
        "lavavajillas líquido",
        "Fairy",
        "hygiene",
        "ml",
        Decimal("780.0"),
        "8400000000092",
        Decimal("2.99"),
    ),
    ("lejía multiusos", "ACE", "hygiene", "l", Decimal("1.5"), "8400000000093", Decimal("1.29")),
    (
        "bolsas de basura 30L",
        "Sanygard",
        "hygiene",
        "unit",
        Decimal("20.0"),
        "8400000000094",
        Decimal("1.49"),
    ),
    (
        "papel de cocina 3 rollos",
        "Scottex",
        "hygiene",
        "unit",
        Decimal("3.0"),
        "8400000000095",
        Decimal("1.99"),
    ),
    # Huevos y extras
    (
        "huevos camperos L 12 uds",
        "Granja El Pinar",
        "dairy",
        "unit",
        Decimal("12.0"),
        "8400000000096",
        Decimal("2.79"),
    ),
    (
        "mayonesa 450ml",
        "Hellmann's",
        "pantry",
        "ml",
        Decimal("450.0"),
        "8400000000097",
        Decimal("2.49"),
    ),
    ("ketchup 560g", "Heinz", "pantry", "g", Decimal("560.0"), "8400000000098", Decimal("2.29")),
    ("mostaza Dijon", "Maille", "pantry", "g", Decimal("200.0"), "8400000000099", Decimal("1.79")),
    (
        "salsa de soja",
        "Kikkoman",
        "pantry",
        "ml",
        Decimal("150.0"),
        "8400000000100",
        Decimal("2.99"),
    ),
]

# Cadenas de supermercados realistas con slug, nombre y color (para el logo_url)
CHAIN_SPECS = [
    ("Mercadona", "mercadona"),
    ("Carrefour", "carrefour"),
    ("Lidl", "lidl"),
    ("Dia", "dia"),
    ("Alcampo", "alcampo"),
]

# (nombre tienda, chain_idx, lat_offset, lon_offset)
CHAIN_STORE_SPECS = [
    # Mercadona (3 tiendas)
    ("Mercadona Triana", 0, 0.0120, -0.0180),
    ("Mercadona Nervión", 0, 0.0085, 0.0095),
    ("Mercadona Macarena", 0, 0.0210, 0.0050),
    # Carrefour (3 tiendas)
    ("Carrefour Express Centro", 1, -0.0045, -0.0090),
    ("Carrefour Sevilla Este", 1, 0.0050, 0.0240),
    ("Carrefour La Rinconada", 1, 0.0320, 0.0180),
    # Lidl (3 tiendas)
    ("Lidl San Pablo", 2, 0.0175, 0.0110),
    ("Lidl Bellavista", 2, -0.0200, 0.0060),
    ("Lidl Camas", 2, 0.0080, -0.0310),
    # Dia (3 tiendas)
    ("Dia Los Remedios", 3, -0.0100, -0.0250),
    ("Dia Heliópolis", 3, -0.0280, -0.0070),
    ("Dia Pino Montano", 3, 0.0260, 0.0020),
    # Alcampo (3 tiendas)
    ("Alcampo Hipercor", 4, 0.0040, 0.0170),
    ("Alcampo Mairena", 4, 0.0490, 0.0380),
    ("Alcampo Tomares", 4, -0.0010, -0.0440),
]


@dataclass
class SeedStats:
    """Contadores del proceso de seed para reportar resultados."""

    created: int = 0
    updated: int = 0


class Command(BaseCommand):
    """Puebla datos de prueba idempotentes para desarrollo local."""

    help = "Crea datos seed de todas las entidades backend para pruebas locales"

    def add_arguments(self, parser) -> None:
        """Define argumentos CLI opcionales para controlar el seed."""
        parser.add_argument(
            "--consumers",
            type=int,
            default=10,
            help="Cantidad de usuarios consumer a crear (por defecto: 10)",
        )
        parser.add_argument(
            "--businesses",
            type=int,
            default=5,
            help="Cantidad de usuarios business a crear (por defecto: 5)",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina los usuarios seed existentes antes de recrearlos",
        )

    def handle(self, *args, **options) -> None:
        """Ejecuta el seed completo de entidades de prueba."""
        consumers = options["consumers"]
        businesses = options["businesses"]
        reset = options["reset"]

        if consumers < 0 or businesses < 0:
            raise CommandError("Los argumentos --consumers y --businesses no pueden ser negativos")

        user_model = get_user_model()

        if reset:
            deleted_count = self._reset_seed_data(user_model)
            self.stdout.write(self.style.WARNING(f"Registros seed eliminados: {deleted_count}"))

        stats = SeedStats()

        with transaction.atomic():
            self._upsert_admin_user(user_model, stats)
            consumers_qs = self._upsert_role_users(
                user_model,
                role="consumer",
                total=consumers,
                stats=stats,
            )
            business_users_qs = self._upsert_role_users(
                user_model,
                role="business",
                total=businesses,
                stats=stats,
            )

            categories = self._seed_categories(stats)
            products = self._seed_products(categories, stats)
            self._seed_product_proposals(consumers_qs, categories, stats)
            business_profiles = self._seed_business_profiles(business_users_qs, stats)
            stores = self._seed_stores(business_profiles, stats)
            self._seed_user_favorite_stores(consumers_qs, stores, stats)
            self._seed_prices(products, stores, stats)
            self._seed_price_alerts(consumers_qs, products, stores, stats)
            self._seed_shopping_lists(consumers_qs, products, stats)
            self._seed_promotions(products, stores, stats)
            self._seed_notifications(consumers_qs, products, stores, stats)

        self.stdout.write(self.style.SUCCESS("Seed completo ejecutado correctamente."))
        self.stdout.write(f"Registros creados: {stats.created}")
        self.stdout.write(f"Registros actualizados: {stats.updated}")
        self.stdout.write(f"Password común seed: {DEFAULT_SEED_PASSWORD}")

    def _reset_seed_data(self, user_model) -> int:
        """Elimina únicamente registros seed para permitir recreación limpia."""
        deleted_total = 0
        model_querysets = [
            Notification.objects.filter(title__startswith=SEED_PREFIX),
            UserPushToken.objects.filter(token__startswith=SEED_PREFIX),
            Promotion.objects.filter(title__startswith=SEED_PREFIX),
            PriceAlert.objects.filter(user__username__startswith=SEED_PREFIX),
            Price.objects.filter(product__name__startswith=SEED_PREFIX),
            UserFavoriteStore.objects.filter(user__username__startswith=SEED_PREFIX),
            ListTemplateItem.objects.filter(template__name__startswith=SEED_PREFIX),
            ListTemplate.objects.filter(name__startswith=SEED_PREFIX),
            ListCollaborator.objects.filter(user__username__startswith=SEED_PREFIX),
            ShoppingListItem.objects.filter(shopping_list__name__startswith=SEED_PREFIX),
            ShoppingList.objects.filter(name__startswith=SEED_PREFIX),
            ProductProposal.objects.filter(name__startswith=SEED_PREFIX),
            Product.objects.filter(name__startswith=SEED_PREFIX),
            Category.objects.filter(name__startswith=SEED_PREFIX),
            Store.objects.filter(name__startswith=SEED_PREFIX),
            StoreChain.objects.filter(name__startswith=SEED_PREFIX),
            BusinessProfile.objects.filter(business_name__startswith=SEED_PREFIX),
            user_model.objects.filter(username__startswith=SEED_PREFIX),
        ]
        for queryset in model_querysets:
            deleted_count, _ = queryset.delete()
            deleted_total += deleted_count
        return deleted_total

    def _upsert_admin_user(self, user_model, stats: SeedStats) -> None:
        """Crea o actualiza el usuario administrador seed."""
        defaults = {
            "email": "seed_admin@bargain.local",
            "first_name": "Admin",
            "last_name": "Seed",
            "role": user_model.Role.ADMIN,
            "is_staff": True,
            "is_superuser": True,
        }
        user, created = user_model.objects.get_or_create(
            username="seed_admin",
            defaults=defaults,
        )
        if created:
            user.set_password(DEFAULT_SEED_PASSWORD)
            user.save(update_fields=["password"])
            stats.created += 1
            return

        self._update_user_fields(user=user, defaults=defaults, stats=stats)

    def _upsert_role_users(self, user_model, role: str, total: int, stats: SeedStats):
        """Crea o actualiza usuarios seed del rol indicado."""
        first_names = [
            "Ana",
            "Carlos",
            "María",
            "Javier",
            "Laura",
            "Pedro",
            "Sofía",
            "Diego",
            "Elena",
            "Marcos",
        ]
        last_names = [
            "García",
            "López",
            "Martínez",
            "Sánchez",
            "Pérez",
            "González",
            "Rodríguez",
            "Fernández",
            "Jiménez",
            "Díaz",
        ]

        for index in range(1, total + 1):
            username = f"seed_{role}_{index}"
            fn = first_names[(index - 1) % len(first_names)]
            ln = last_names[(index - 1) % len(last_names)]
            defaults = {
                "email": f"{username}@bargain.local",
                "first_name": fn,
                "last_name": ln,
                "role": role,
                "is_staff": False,
                "is_superuser": False,
                "max_search_radius_km": 10,
                "max_stops": 3,
                "weight_price": 34,
                "weight_distance": 33,
                "weight_time": 33,
            }
            user, created = user_model.objects.get_or_create(username=username, defaults=defaults)
            if created:
                user.set_password(DEFAULT_SEED_PASSWORD)
                user.save(update_fields=["password"])
                stats.created += 1
                continue

            self._update_user_fields(user=user, defaults=defaults, stats=stats)

        return user_model.objects.filter(username__startswith=f"seed_{role}_").order_by("id")

    def _seed_categories(self, stats: SeedStats) -> dict[str, Category]:
        """Crea categorías base y subcategorías para el catálogo seed."""
        categories: dict[str, Category] = {}

        # Categorías raíz
        root_specs = [
            ("food", f"{SEED_PREFIX}alimentacion"),
            ("drinks", f"{SEED_PREFIX}bebidas"),
            ("hygiene", f"{SEED_PREFIX}higiene_limpieza"),
        ]
        for key, name in root_specs:
            cat, created = Category.objects.update_or_create(
                name=name,
                defaults={"parent": None},
            )
            stats.created += int(created)
            stats.updated += int(not created)
            categories[key] = cat

        # Subcategorías
        sub_specs = [
            ("fruit", f"{SEED_PREFIX}frutas", "food"),
            ("vegetables", f"{SEED_PREFIX}verduras_hortalizas", "food"),
            ("dairy", f"{SEED_PREFIX}lacteos_huevos", "food"),
            ("meat", f"{SEED_PREFIX}carnes_embutidos", "food"),
            ("fish", f"{SEED_PREFIX}pescados_mariscos", "food"),
            ("bakery", f"{SEED_PREFIX}panaderia_bolleria", "food"),
            ("cereals", f"{SEED_PREFIX}cereales_pasta_arroz", "food"),
            ("frozen", f"{SEED_PREFIX}congelados", "food"),
            ("pantry", f"{SEED_PREFIX}conservas_condimentos", "food"),
            ("snacks", f"{SEED_PREFIX}snacks_dulces", "food"),
            ("water", f"{SEED_PREFIX}agua_mineral", "drinks"),
        ]
        for key, name, parent_key in sub_specs:
            cat, created = Category.objects.update_or_create(
                name=name,
                defaults={"parent": categories[parent_key]},
            )
            stats.created += int(created)
            stats.updated += int(not created)
            categories[key] = cat

        return categories

    def _seed_products(
        self,
        categories: dict[str, Category],
        stats: SeedStats,
    ) -> list[Product]:
        """Crea 100 productos realistas distribuidos entre categorías."""
        unit_map = {
            "kg": Product.Unit.KG,
            "g": Product.Unit.G,
            "l": Product.Unit.L,
            "ml": Product.Unit.ML,
            "unit": Product.Unit.UNITS,
        }

        products: list[Product] = []
        for spec in PRODUCT_SPECS:
            # spec puede tener 7 elementos (con precio) o 6 (sin precio, compatibilidad)
            if len(spec) == 7:
                name, brand, cat_key, unit_str, qty, barcode, _base_price = spec
            else:
                name, brand, cat_key, unit_str, qty, barcode = spec[:6]

            category = categories.get(cat_key, categories["food"])
            unit = unit_map.get(unit_str, Product.Unit.UNITS)

            product, created = Product.objects.update_or_create(
                barcode=barcode,
                defaults={
                    "name": f"{SEED_PREFIX}{name}",
                    "normalized_name": f"{SEED_PREFIX}{name}".lower(),
                    "brand": brand,
                    "category": category,
                    "unit": unit,
                    "unit_quantity": qty,
                    "image_url": "https://example.com/seed-product.png",
                    "is_active": True,
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)
            products.append(product)

        return products

    def _seed_product_proposals(
        self,
        consumers_qs,
        categories: dict[str, Category],
        stats: SeedStats,
    ) -> None:
        """Crea propuestas de producto crowdsourcing asociadas a consumidores seed."""
        first_consumer = consumers_qs.first()
        if first_consumer is None:
            return

        proposal, created = ProductProposal.objects.update_or_create(
            name=f"{SEED_PREFIX}propuesta_pan_integral",
            defaults={
                "proposed_by": first_consumer,
                "brand": "Horno Norte",
                "barcode": "840000001001",
                "category": categories["food"],
                "status": ProductProposal.Status.PENDING,
                "notes": "Producto sugerido para ampliar el catálogo seed",
            },
        )
        stats.created += int(created)
        stats.updated += int(not created)
        _ = proposal

    def _seed_business_profiles(
        self, business_users_qs, stats: SeedStats
    ) -> list[BusinessProfile]:
        """Crea perfiles business para usuarios con rol comercio."""
        profiles: list[BusinessProfile] = []
        for index, business_user in enumerate(business_users_qs, start=1):
            profile, created = BusinessProfile.objects.update_or_create(
                user=business_user,
                defaults={
                    "business_name": f"{SEED_PREFIX}negocio_{index}",
                    "tax_id": f"SEED-TAX-{index:03d}",
                    "address": f"Calle Seed {index}, Sevilla",
                    "website": f"https://seed-negocio-{index}.local",
                    "is_verified": True,
                    "price_alert_threshold_pct": 12,
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)
            profiles.append(profile)

        return profiles

    def _seed_stores(
        self, business_profiles: list[BusinessProfile], stats: SeedStats
    ) -> list[Store]:
        """Crea 15 tiendas de cadena + hasta 5 tiendas locales (total ≤ 20)."""
        base_lon = -5.9845  # Centro de Sevilla
        base_lat = 37.3891

        # ── Cadenas ──────────────────────────────────────────────────────────
        chains: list[StoreChain] = []
        for chain_name, chain_slug in CHAIN_SPECS:
            chain, created = StoreChain.objects.update_or_create(
                slug=f"{SEED_PREFIX}{chain_slug}",
                defaults={
                    "name": f"{SEED_PREFIX}{chain_name}",
                    "logo_url": f"https://example.com/logos/{chain_slug}.png",
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)
            chains.append(chain)

        # ── Tiendas de cadena ─────────────────────────────────────────────────
        stores: list[Store] = []
        opening_hours_chain = {
            "lun-sab": "09:00-21:30",
            "dom": "09:00-15:00",
        }
        for store_name, chain_idx, lat_off, lon_off in CHAIN_STORE_SPECS:
            store, created = Store.objects.update_or_create(
                name=f"{SEED_PREFIX}{store_name}",
                defaults={
                    "chain": chains[chain_idx],
                    "address": "Calle seed, Sevilla",
                    "location": Point(base_lon + lon_off, base_lat + lat_off, srid=4326),
                    "opening_hours": opening_hours_chain,
                    "is_local_business": False,
                    "business_profile": None,
                    "is_active": True,
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)
            stores.append(store)

        # ── Tiendas locales (una por business profile, máx 5) ────────────────
        local_opening = {"lun-vie": "08:30-20:00", "sab": "09:00-14:00"}
        for index, profile in enumerate(business_profiles[:5], start=1):
            store, created = Store.objects.update_or_create(
                name=f"{SEED_PREFIX}tienda_local_{index}",
                defaults={
                    "chain": None,
                    "address": f"Plaza Local Seed {index}, Sevilla",
                    "location": Point(
                        base_lon - index * 0.008,
                        base_lat + index * 0.006,
                        srid=4326,
                    ),
                    "opening_hours": local_opening,
                    "is_local_business": True,
                    "business_profile": profile,
                    "is_active": True,
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)
            stores.append(store)

        return stores

    def _seed_user_favorite_stores(
        self, consumers_qs, stores: list[Store], stats: SeedStats
    ) -> None:
        """Crea favoritos para consumidores seed en tiendas seed."""
        if not stores:
            return

        for consumer in consumers_qs[:3]:
            for store in stores[:4]:
                _, created = UserFavoriteStore.objects.get_or_create(user=consumer, store=store)
                stats.created += int(created)
                stats.updated += int(not created)

    def _seed_prices(self, products: list[Product], stores: list[Store], stats: SeedStats) -> None:
        """Crea precios para el 20% de productos en cada tienda.

        Cada tienda tendrá precio para exactamente el 20% de los 100 productos
        (≈20 precios/tienda), con variación aleatoria determinista por semilla.
        """
        if not products or not stores:
            return

        rng = random.Random(42)  # Semilla fija para reproducibilidad
        n_products_per_store = max(1, len(products) // 5)  # 20% = 100//5 = 20

        # Precio base por producto (extraído del PRODUCT_SPECS)
        base_prices: dict[str, Decimal] = {}
        for spec in PRODUCT_SPECS:
            if len(spec) >= 7:
                barcode = spec[5]
                base_price = spec[6]
                base_prices[barcode] = Decimal(str(base_price))

        for store in stores:
            # Selección determinista: cada tienda tiene un offset diferente
            store_idx = stores.index(store)
            start = (store_idx * n_products_per_store) % len(products)
            selected_indices = [(start + i) % len(products) for i in range(n_products_per_store)]
            selected_products = [products[i] for i in selected_indices]

            for product in selected_products:
                # Precio base del producto, con variación de ±15% por tienda
                barcode = getattr(product, "barcode", None)
                if barcode and barcode in base_prices:
                    raw_base = base_prices[barcode]
                else:
                    raw_base = Decimal("2.00") + Decimal(str(rng.uniform(0.5, 3.5)))

                # Factor de variación: entre 0.85 y 1.15 del precio base
                variation = Decimal(str(round(rng.uniform(0.85, 1.15), 3)))
                price_val = (raw_base * variation).quantize(Decimal("0.01"))
                unit_price_val = price_val
                # Oferta en 30% de los casos
                has_offer = rng.random() < 0.30
                offer_price = (
                    (price_val * Decimal("0.90")).quantize(Decimal("0.01")) if has_offer else None
                )
                offer_end = (
                    (timezone.now() + timezone.timedelta(days=rng.randint(3, 14))).date()
                    if has_offer
                    else None
                )

                _, created = Price.objects.update_or_create(
                    product=product,
                    store=store,
                    source=Price.Source.SCRAPING,
                    defaults={
                        "price": price_val,
                        "unit_price": unit_price_val,
                        "offer_price": offer_price,
                        "offer_end_date": offer_end,
                        "is_stale": False,
                        "confidence_weight": 0.95,
                        "verified_at": timezone.now(),
                    },
                )
                stats.created += int(created)
                stats.updated += int(not created)

    def _seed_price_alerts(
        self,
        consumers_qs,
        products: list[Product],
        stores: list[Store],
        stats: SeedStats,
    ) -> None:
        """Crea alertas de precio para consumidores seed."""
        if not products or not stores:
            return

        for index, consumer in enumerate(consumers_qs[:5], start=1):
            product = products[(index - 1) % len(products)]
            store = stores[(index - 1) % len(stores)]
            _, created = PriceAlert.objects.update_or_create(
                user=consumer,
                product=product,
                defaults={
                    "store": store,
                    "target_price": Decimal("2.00") + Decimal(index),
                    "is_active": True,
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)

    def _seed_shopping_lists(
        self, consumers_qs, products: list[Product], stats: SeedStats
    ) -> None:
        """Crea listas, items, colaboradores y plantillas seed."""
        consumers = list(consumers_qs[:4])
        if not consumers or not products:
            return

        # Lista de compra semanal típica (10 productos)
        weekly_products = products[:10]
        # Lista especial de limpieza (productos de higiene)
        hygiene_products = [
            p
            for p in products
            if "seed_" in p.name
            and any(
                kw in p.name
                for kw in [
                    "papel higiénico",
                    "gel de ducha",
                    "pasta de dientes",
                    "detergente",
                    "lavavajillas",
                    "lejía",
                    "bolsas",
                    "champú",
                ]
            )
        ][:5]

        shopping_lists: list[ShoppingList] = []
        for index, consumer in enumerate(consumers, start=1):
            shopping_list, created = ShoppingList.objects.update_or_create(
                owner=consumer,
                name=f"{SEED_PREFIX}lista_semanal_{index}",
                defaults={"is_archived": False},
            )
            stats.created += int(created)
            stats.updated += int(not created)
            shopping_lists.append(shopping_list)

            selected = products[(index - 1) * 5 : (index - 1) * 5 + 8]
            for item_idx, product in enumerate(selected, start=1):
                _, created_item = ShoppingListItem.objects.update_or_create(
                    shopping_list=shopping_list,
                    product=product,
                    defaults={
                        "quantity": item_idx % 3 + 1,
                        "is_checked": item_idx % 4 == 0,
                        "added_by": consumer,
                    },
                )
                stats.created += int(created_item)
                stats.updated += int(not created_item)

        if len(consumers) >= 2 and shopping_lists:
            _, created = ListCollaborator.objects.update_or_create(
                shopping_list=shopping_lists[0],
                user=consumers[1],
                defaults={"invited_by": consumers[0]},
            )
            stats.created += int(created)
            stats.updated += int(not created)

        # Plantilla 1: Compra semanal básica
        template1, created = ListTemplate.objects.update_or_create(
            owner=consumers[0],
            name=f"{SEED_PREFIX}plantilla_basica",
            defaults={"source_list": shopping_lists[0]},
        )
        stats.created += int(created)
        stats.updated += int(not created)

        for order, product in enumerate(weekly_products, start=1):
            _, created_item = ListTemplateItem.objects.update_or_create(
                template=template1,
                product=product,
                defaults={"ordering": order},
            )
            stats.created += int(created_item)
            stats.updated += int(not created_item)

        # Plantilla 2: Productos de limpieza
        if len(consumers) >= 2 and hygiene_products:
            template2, created = ListTemplate.objects.update_or_create(
                owner=consumers[1],
                name=f"{SEED_PREFIX}plantilla_limpieza",
                defaults={"source_list": None},
            )
            stats.created += int(created)
            stats.updated += int(not created)

            for order, product in enumerate(hygiene_products, start=1):
                _, created_item = ListTemplateItem.objects.update_or_create(
                    template=template2,
                    product=product,
                    defaults={"ordering": order},
                )
                stats.created += int(created_item)
                stats.updated += int(not created_item)

        # Plantilla 3: Desayuno completo
        breakfast_keywords = [
            "leche",
            "yogur",
            "pan",
            "copos de avena",
            "zumo naranja",
            "mantequilla",
            "café molido",
        ]
        breakfast_products = [
            p for p in products if any(kw in p.name for kw in breakfast_keywords)
        ][:8]

        if len(consumers) >= 3 and breakfast_products:
            template3, created = ListTemplate.objects.update_or_create(
                owner=consumers[2],
                name=f"{SEED_PREFIX}plantilla_desayuno",
                defaults={"source_list": None},
            )
            stats.created += int(created)
            stats.updated += int(not created)

            for order, product in enumerate(breakfast_products, start=1):
                _, created_item = ListTemplateItem.objects.update_or_create(
                    template=template3,
                    product=product,
                    defaults={"ordering": order},
                )
                stats.created += int(created_item)
                stats.updated += int(not created_item)

    def _seed_promotions(
        self, products: list[Product], stores: list[Store], stats: SeedStats
    ) -> None:
        """Crea promociones activas para tiendas locales seed."""
        local_stores = [store for store in stores if store.is_local_business]
        if not products or not local_stores:
            return

        for index, store in enumerate(local_stores, start=1):
            product = products[(index * 7) % len(products)]
            _, created = Promotion.objects.update_or_create(
                product=product,
                store=store,
                is_active=True,
                defaults={
                    "discount_type": Promotion.DiscountType.PERCENTAGE,
                    "discount_value": Decimal("10.00"),
                    "start_date": timezone.now().date(),
                    "end_date": (timezone.now() + timezone.timedelta(days=10)).date(),
                    "min_quantity": 1,
                    "title": f"{SEED_PREFIX}promo_{index}",
                    "description": "Promoción seed para pruebas funcionales",
                    "views": index * 3,
                },
            )
            stats.created += int(created)
            stats.updated += int(not created)

    def _seed_notifications(
        self,
        consumers_qs,
        products: list[Product],
        stores: list[Store],
        stats: SeedStats,
    ) -> None:
        """Crea tokens push y notificaciones de bandeja para usuarios seed."""
        if not products or not stores:
            return

        for index, consumer in enumerate(consumers_qs[:5], start=1):
            _, created_token = UserPushToken.objects.update_or_create(
                user=consumer,
                device_id=f"{SEED_PREFIX}device_{index}",
                defaults={"token": f"{SEED_PREFIX}ExponentPushToken[{index:03d}]"},
            )
            stats.created += int(created_token)
            stats.updated += int(not created_token)

            product = products[(index - 1) % len(products)]
            store = stores[(index - 1) % len(stores)]
            product_id = int(product.pk or 0)
            store_id = int(store.pk or 0)
            _, created_notification = Notification.objects.update_or_create(
                user=consumer,
                title=f"{SEED_PREFIX}notif_{index}",
                defaults={
                    "notification_type": NotificationType.PRICE_ALERT,
                    "body": f"{product.name} ha bajado de precio en {store.name}",
                    "is_read": False,
                    "data": {"product_id": product_id, "store_id": store_id},
                    "action_url": f"bargain://prices/{product_id}",
                    "deleted_at": None,
                },
            )
            stats.created += int(created_notification)
            stats.updated += int(not created_notification)

    @staticmethod
    def _update_user_fields(*, user, defaults: dict[str, object], stats: SeedStats) -> None:
        """Sincroniza atributos del usuario existente y refresca su contraseña seed."""
        changed_fields: list[str] = []
        for field_name, expected_value in defaults.items():
            if getattr(user, field_name, None) != expected_value:
                setattr(user, field_name, expected_value)
                changed_fields.append(field_name)

        user.set_password(DEFAULT_SEED_PASSWORD)
        changed_fields.append("password")
        user.save(update_fields=changed_fields)
        stats.updated += 1
