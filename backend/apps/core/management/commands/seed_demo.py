"""Comando ``seed_demo``: datos de demostración completos para entornos demo/staging.

Idempotente: puede ejecutarse varias veces sin duplicar datos y no borra nada.
Crea usuarios demo, catálogo normalizado con precios por tienda (con histórico),
un comercio local verificado con promoción, otro pendiente de aprobación y los
datos de consumidor (lista, plantilla, alerta, notificaciones, favoritas) que
hacen que la aplicación luzca poblada desde el primer inicio de sesión.

Uso:
    python manage.py seed_demo

En Render puede lanzarse como job one-off sobre el servicio web.
"""

import hashlib
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.business.models import BusinessProfile, Promotion
from apps.notifications.models import Notification, NotificationType
from apps.prices.models import Price, PriceAlert
from apps.products.models import Category, Product
from apps.shopping_lists.models import (
    ListTemplate,
    ListTemplateItem,
    ShoppingList,
    ShoppingListItem,
)
from apps.stores.models import Store, StoreChain, UserFavoriteStore

PASSWORD = "Demo1234!"

FALLBACK_STORES = [
    ("Mercadona Av. de la Constitución", "mercadona", 37.3858, -5.9932),
    ("Carrefour Express Sierpes", "carrefour", 37.3920, -5.9953),
    ("Lidl Nervión", "lidl", 37.3826, -5.9731),
    ("DIA San Bernardo", "dia", 37.3805, -5.9810),
    ("Alcampo Los Arcos", "alcampo", 37.3934, -5.9606),
]

CATALOG = [
    # (nombre, categoría, marca, unidad, cantidad, precio base €)
    ("Leche entera 1L", "Lácteos", "Hacendado", "l", 1.0, 0.95),
    ("Leche semidesnatada 1L", "Lácteos", "Pascual", "l", 1.0, 1.15),
    ("Yogur natural pack 4", "Lácteos", "Danone", "unit", 4.0, 1.65),
    ("Queso curado cuña 250g", "Lácteos", "García Baquero", "g", 250.0, 3.85),
    ("Mantequilla 250g", "Lácteos", "Central Lechera", "g", 250.0, 2.45),
    ("Pan de barra", "Panadería", "", "unit", 1.0, 0.65),
    ("Pan de molde integral", "Panadería", "Bimbo", "unit", 1.0, 1.80),
    ("Huevos L docena", "Huevos", "", "unit", 12.0, 2.35),
    ("Arroz redondo 1kg", "Despensa", "La Fallera", "kg", 1.0, 1.45),
    ("Pasta espaguetis 500g", "Despensa", "Gallo", "g", 500.0, 1.10),
    ("Macarrones 500g", "Despensa", "Gallo", "g", 500.0, 1.05),
    ("Aceite de oliva virgen extra 1L", "Despensa", "Carbonell", "l", 1.0, 7.95),
    ("Harina de trigo 1kg", "Despensa", "Gallo", "kg", 1.0, 0.85),
    ("Azúcar blanco 1kg", "Despensa", "Azucarera", "kg", 1.0, 1.15),
    ("Sal fina 1kg", "Despensa", "", "kg", 1.0, 0.45),
    ("Atún en aceite pack 3", "Conservas", "Calvo", "unit", 3.0, 2.75),
    ("Tomate frito 400g", "Conservas", "Orlando", "g", 400.0, 1.05),
    ("Garbanzos cocidos 400g", "Conservas", "Cidacos", "g", 400.0, 0.95),
    ("Pechuga de pollo 1kg", "Carnicería", "", "kg", 1.0, 6.50),
    ("Carne picada mixta 500g", "Carnicería", "", "g", 500.0, 3.95),
    ("Lomo de cerdo 1kg", "Carnicería", "", "kg", 1.0, 5.95),
    ("Merluza filetes 400g", "Pescadería", "", "g", 400.0, 5.60),
    ("Salmón fresco 500g", "Pescadería", "", "g", 500.0, 6.95),
    ("Detergente líquido 40 lavados", "Limpieza", "Ariel", "unit", 1.0, 8.45),
    ("Lavavajillas 750ml", "Limpieza", "Fairy", "ml", 750.0, 2.15),
    ("Papel higiénico 12 rollos", "Limpieza", "Scottex", "unit", 12.0, 4.20),
    ("Café molido natural 250g", "Desayuno", "Marcilla", "g", 250.0, 2.95),
    ("Galletas María 800g", "Desayuno", "Fontaneda", "g", 800.0, 1.85),
    ("Cereales integrales 500g", "Desayuno", "Kellogg's", "g", 500.0, 3.25),
    ("Agua mineral 6x1.5L", "Bebidas", "Lanjarón", "l", 9.0, 2.10),
    ("Zumo de naranja 1L", "Bebidas", "Don Simón", "l", 1.0, 1.35),
    ("Cerveza pack 6 latas", "Bebidas", "Cruzcampo", "unit", 6.0, 3.45),
]

FRUTERIA_CATALOG = [
    ("Manzanas Fuji 1kg", "Frutería", "", "kg", 1.0, 2.10),
    ("Naranjas de zumo 2kg", "Frutería", "", "kg", 2.0, 2.60),
    ("Plátanos de Canarias 1kg", "Frutería", "", "kg", 1.0, 2.35),
    ("Fresas 500g", "Frutería", "", "g", 500.0, 2.80),
    ("Tomates de ensalada 1kg", "Frutería", "", "kg", 1.0, 1.95),
    ("Aguacates pack 2", "Frutería", "", "unit", 2.0, 2.50),
]

DEMO_LIST_ITEMS = [
    ("Leche entera 1L", 2, False),
    ("Pan de barra", 1, True),
    ("Huevos L docena", 1, False),
    ("Arroz redondo 1kg", 1, False),
    ("Aceite de oliva virgen extra 1L", 1, False),
    ("Pechuga de pollo 1kg", 1, True),
    ("Manzanas Fuji 1kg", 2, False),
]


def stable_factor(key: str, spread: float = 0.18) -> float:
    """Variación determinista por (producto, tienda) en [1-spread, 1+spread]."""
    digest = int(hashlib.md5(key.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
    return 1.0 + (digest * 2 - 1) * spread


class Command(BaseCommand):
    """Población idempotente de datos de demostración."""

    help = "Crea datos de demostración (usuarios, catálogo, precios, PYME, lista demo)."

    def handle(self, *args, **options) -> None:
        user_model = get_user_model()
        now = timezone.now()
        self.stdout.write("== seed_demo: poblando datos de demostración ==")

        demo = self._ensure_user(user_model, "demo@bargain.local", "consumer", "Nico", "Demo")
        fruteria = self._ensure_user(
            user_model, "fruteria@bargain.local", "business", "María", "Vergel"
        )
        panaderia = self._ensure_user(
            user_model, "panaderia@bargain.local", "business", "Paco", "Horno"
        )
        self._ensure_user(
            user_model,
            "bargain_admin@bargain.local",
            "consumer",
            "Admin",
            "BarGAIN",
            is_staff=True,
            is_superuser=True,
        )

        chain_stores = self._ensure_stores()
        products = self._ensure_catalog(chain_stores, now)
        self._ensure_price_history(products["Leche entera 1L"], chain_stores, now)
        fstore = self._ensure_fruteria(fruteria, now)
        self._ensure_pending_business(panaderia)
        lista = self._ensure_consumer_data(demo, products, chain_stores, fstore, now)

        self.stdout.write(self.style.SUCCESS("== seed_demo COMPLETADO =="))
        self.stdout.write(f"   demo@bargain.local / {PASSWORD} (lista id={lista.id})")
        self.stdout.write(f"   fruteria@bargain.local / {PASSWORD} (PYME aprobada)")
        self.stdout.write(f"   panaderia@bargain.local / {PASSWORD} (PYME pendiente)")
        self.stdout.write(f"   bargain_admin@bargain.local / {PASSWORD} (staff)")

    # ------------------------------------------------------------- usuarios --
    def _ensure_user(
        self,
        user_model,
        email: str,
        role: str,
        first_name: str,
        last_name: str,
        *,
        is_staff: bool = False,
        is_superuser: bool = False,
    ):
        username = email.split("@")[0]
        user = user_model.objects.filter(email__iexact=email).first()
        if user is None:
            candidate = username
            suffix = 0
            while (
                user_model.objects.filter(username=candidate).exclude(email__iexact=email).exists()
            ):
                suffix += 1
                candidate = f"{username}_demo{suffix if suffix > 1 else ''}"
            user = user_model(username=candidate, email=email)
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.is_active = True
        user.set_password(PASSWORD)
        user.save()
        self.stdout.write(f"  user OK: {email} ({role})")
        return user

    # -------------------------------------------------------------- tiendas --
    def _ensure_stores(self) -> list:
        if Store.objects.filter(is_active=True, is_local_business=False).count() < 3:
            self.stdout.write("  creando red mínima de tiendas en Sevilla...")
            for name, slug, lat, lng in FALLBACK_STORES:
                chain, _ = StoreChain.objects.get_or_create(
                    slug=slug, defaults={"name": slug.capitalize(), "logo_url": ""}
                )
                Store.objects.get_or_create(
                    name=name,
                    defaults={
                        "chain": chain,
                        "address": f"{name}, Sevilla",
                        "location": Point(lng, lat, srid=4326),
                        "opening_hours": {"mon-sat": "09:00-21:30"},
                        "is_local_business": False,
                        "is_active": True,
                    },
                )
        stores = list(Store.objects.filter(is_active=True, is_local_business=False)[:8])
        self.stdout.write(f"  tiendas de cadena: {len(stores)}")
        return stores

    # ------------------------------------------------------------- catálogo --
    def _ensure_product(self, name, cat_name, brand, unit, qty) -> Product:
        root_cat, _ = Category.objects.get_or_create(
            slug="alimentacion", defaults={"name": "Alimentación"}
        )
        slug = cat_name.lower().replace(" ", "-")
        cat = Category.objects.filter(slug=slug).first()
        if cat is None:
            cat = Category.objects.create(name=cat_name, slug=slug, parent=root_cat)
        prod = Product.objects.filter(name__iexact=name).first()
        if prod is None:
            prod = Product.objects.create(
                name=name,
                normalized_name=name.lower(),
                category=cat,
                brand=brand,
                unit=unit,
                unit_quantity=qty,
                is_active=True,
            )
        return prod

    def _ensure_catalog(self, chain_stores, now) -> dict:
        products: dict = {}
        created = 0
        for name, cat_name, brand, unit, qty, base in CATALOG:
            prod = self._ensure_product(name, cat_name, brand, unit, qty)
            products[name] = prod
            for store in chain_stores:
                if Price.objects.filter(product=prod, store=store, is_stale=False).exists():
                    continue
                factor = stable_factor(f"{prod.id}-{store.id}")
                value = Decimal(f"{base * factor:.2f}")
                offer = None
                offer_end = None
                if stable_factor(f"offer-{prod.id}-{store.id}") > 1.12:
                    offer = Decimal(f"{float(value) * 0.85:.2f}")
                    offer_end = date.today() + timedelta(days=7)
                Price.objects.create(
                    product=prod,
                    store=store,
                    price=value,
                    unit_price=Decimal(f"{float(value) / max(qty, 0.1):.2f}"),
                    offer_price=offer,
                    offer_end_date=offer_end,
                    source="scraping",
                    verified_at=now,
                    is_stale=False,
                )
                created += 1
        self.stdout.write(f"  precios nuevos: {created}")
        return products

    def _ensure_price_history(self, leche: Product, chain_stores, now) -> None:
        for store in chain_stores[:2]:
            if Price.objects.filter(product=leche, store=store).count() >= 4:
                continue
            base_price = Price.objects.filter(product=leche, store=store, is_stale=False).first()
            if base_price is None:
                continue
            for weeks, delta in [(8, "0.10"), (6, "0.06"), (4, "0.03"), (2, "-0.02")]:
                hist = Price.objects.create(
                    product=leche,
                    store=store,
                    price=base_price.price + Decimal(delta),
                    unit_price=base_price.price + Decimal(delta),
                    source="scraping",
                    verified_at=now - timedelta(weeks=weeks),
                    is_stale=True,
                )
                Price.objects.filter(pk=hist.pk).update(created_at=now - timedelta(weeks=weeks))
        self.stdout.write("  histórico de precios OK")

    # ----------------------------------------------------------------- PYME --
    def _ensure_fruteria(self, fruteria, now) -> Store:
        profile, _ = BusinessProfile.objects.update_or_create(
            user=fruteria,
            defaults={
                "business_name": "Frutería El Vergel",
                "tax_id": "B90111222",
                "address": "Calle Feria 45, 41003 Sevilla",
                "website": "https://elvergel.example.com",
                "is_verified": True,
                "rejection_reason": "",
                "price_alert_threshold_pct": 10,
            },
        )
        fstore, _ = Store.objects.update_or_create(
            name="Frutería El Vergel",
            defaults={
                "chain": None,
                "address": "Calle Feria 45, 41003 Sevilla",
                "location": Point(-5.9920, 37.4003, srid=4326),
                "opening_hours": {"mon-sat": "08:30-14:30, 17:30-20:30"},
                "is_local_business": True,
                "business_profile": profile,
                "is_active": True,
            },
        )
        naranjas = None
        for name, cat_name, brand, unit, qty, base in FRUTERIA_CATALOG:
            prod = self._ensure_product(name, cat_name, brand, unit, qty)
            if "Naranjas" in name:
                naranjas = prod
            if not Price.objects.filter(product=prod, store=fstore, is_stale=False).exists():
                Price.objects.create(
                    product=prod,
                    store=fstore,
                    price=Decimal(f"{base:.2f}"),
                    unit_price=Decimal(f"{base / max(qty, 0.1):.2f}"),
                    source="business",
                    verified_at=now,
                    is_stale=False,
                )
        if naranjas and not Promotion.objects.filter(store=fstore, is_active=True).exists():
            Promotion.objects.create(
                product=naranjas,
                store=fstore,
                discount_type="percentage",
                discount_value=Decimal("15.00"),
                start_date=date.today() - timedelta(days=2),
                end_date=date.today() + timedelta(days=12),
                is_active=True,
                min_quantity=2,
                title="15% en naranjas de zumo",
                description="Naranjas recién llegadas de la Vega del Guadalquivir.",
            )
        self.stdout.write("  Frutería El Vergel OK (verificada, con promoción)")
        return fstore

    def _ensure_pending_business(self, panaderia) -> None:
        BusinessProfile.objects.update_or_create(
            user=panaderia,
            defaults={
                "business_name": "Panadería El Horno de Triana",
                "tax_id": "B90333444",
                "address": "Calle Betis 12, 41010 Sevilla",
                "website": "",
                "is_verified": False,
                "rejection_reason": "",
            },
        )
        self.stdout.write("  PYME pendiente OK")

    # ------------------------------------------------------------ consumidor --
    def _ensure_consumer_data(self, demo, products, chain_stores, fstore, now):
        lista, created = ShoppingList.objects.get_or_create(
            owner=demo, name="Lista de la semana", defaults={"is_archived": False}
        )
        if created or not lista.items.exists():
            for name, qty, checked in DEMO_LIST_ITEMS:
                ShoppingListItem.objects.create(
                    shopping_list=lista,
                    name=name,
                    normalized_name=name.lower(),
                    quantity=qty,
                    is_checked=checked,
                    added_by=demo,
                )
        template, t_created = ListTemplate.objects.get_or_create(owner=demo, name="Compra básica")
        if t_created or not template.items.exists():
            basicos = [
                "Leche entera 1L",
                "Pan de barra",
                "Huevos L docena",
                "Café molido natural 250g",
            ]
            for i, name in enumerate(basicos):
                ListTemplateItem.objects.get_or_create(
                    template=template,
                    name=name,
                    defaults={"normalized_name": name.lower(), "ordering": i},
                )
        leche = products["Leche entera 1L"]
        min_price = Price.objects.filter(product=leche, is_stale=False).order_by("price").first()
        if min_price and not PriceAlert.objects.filter(user=demo, product=leche).exists():
            PriceAlert.objects.create(
                user=demo,
                product=leche,
                store=None,
                target_price=min_price.price - Decimal("0.10"),
                is_active=True,
            )
        if not Notification.objects.filter(user=demo).exists():
            Notification.objects.create(
                user=demo,
                notification_type=NotificationType.PRICE_ALERT,
                title="¡Bajada de precio en Leche entera 1L!",
                body="Ahora a 0,89 € en Lidl Nervión, por debajo de tu precio objetivo.",
                is_read=False,
                action_url="/app/home/alerts",
            )
            Notification.objects.create(
                user=demo,
                notification_type=NotificationType.NEW_PROMO,
                title="Nueva promoción cerca de ti",
                body="Frutería El Vergel: 15% en naranjas de zumo hasta fin de semana.",
                is_read=False,
                action_url="/app/map",
            )
            old = Notification.objects.create(
                user=demo,
                notification_type=NotificationType.SHARED_LIST_CHANGED,
                title="Lista compartida actualizada",
                body="María añadió 'Fresas 500g' a la lista 'Lista de la semana'.",
                is_read=True,
                action_url="/app/lists",
            )
            Notification.objects.filter(pk=old.pk).update(created_at=now - timedelta(days=1))
        for store in chain_stores[:1] + [fstore]:
            UserFavoriteStore.objects.get_or_create(user=demo, store=store)
        self.stdout.write("  datos de consumidor demo OK")
        return lista
