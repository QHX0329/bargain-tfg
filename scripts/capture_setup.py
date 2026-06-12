# ruff: noqa
"""Prepara datos demo para las capturas de la memoria (cap. 9).

Idempotente: se puede ejecutar varias veces sin duplicar datos.
NO borra datos existentes; solo crea lo que falte.

Uso (desde la raíz del repo, con el backend levantado en Docker):

  cmd:        docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell < scripts/capture_setup.py
  PowerShell: Get-Content -Raw scripts/capture_setup.py | docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell

Crea/asegura:
  - Usuarios: demo@bargain.local (consumer), fruteria@bargain.local (business
    aprobada), panaderia@bargain.local (business pendiente), admin@bargain.local
    (staff). Contraseña de todos: Demo1234!
  - Catálogo mínimo (categorías + 18 productos) si el catálogo está casi vacío.
  - Precios en todas las tiendas de cadena activas para esos productos
    (solo donde no exista ya precio), con histórico para el gráfico.
  - Tienda PYME "Frutería El Vergel" con productos, precios y una promoción.
  - Lista "Lista de la semana" (7 ítems), plantilla "Compra básica",
    alerta de precio, 3 notificaciones y 2 tiendas favoritas para demo.
"""

import hashlib
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.gis.geos import Point
from django.contrib.auth import get_user_model
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

User = get_user_model()
PASSWORD = "Demo1234!"
NOW = timezone.now()

print("== capture_setup: preparando datos demo para capturas ==")


def ensure_user(email, *, role, first_name, last_name, is_staff=False, is_superuser=False):
    username = email.split("@")[0]
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        # Evitar colisión con usernames existentes de otros usuarios
        candidate = username
        suffix = 0
        while User.objects.filter(username=candidate).exclude(email__iexact=email).exists():
            suffix += 1
            candidate = f"{username}_demo{suffix if suffix > 1 else ''}"
        user = User(username=candidate, email=email)
    user.first_name = first_name
    user.last_name = last_name
    user.role = role
    user.is_staff = is_staff
    user.is_superuser = is_superuser
    user.is_active = True
    user.set_password(PASSWORD)
    user.save()
    print(f"  user OK: {email} ({role}{', staff' if is_staff else ''})")
    return user


demo = ensure_user("demo@bargain.local", role="consumer", first_name="Nico", last_name="Demo")
fruteria = ensure_user(
    "fruteria@bargain.local", role="business", first_name="María", last_name="Vergel"
)
panaderia = ensure_user(
    "panaderia@bargain.local", role="business", first_name="Paco", last_name="Horno"
)
admin = ensure_user(
    "bargain_admin@bargain.local",
    role="consumer",
    first_name="Admin",
    last_name="BarGAIN",
    is_staff=True,
    is_superuser=True,
)

# ---------------------------------------------------------------- tiendas ---
SEVILLA = (37.3891, -5.9845)  # (lat, lng) centro

FALLBACK_STORES = [
    ("Mercadona Av. de la Constitución", "mercadona", 37.3858, -5.9932),
    ("Carrefour Express Sierpes", "carrefour", 37.3920, -5.9953),
    ("Lidl Nervión", "lidl", 37.3826, -5.9731),
    ("DIA San Bernardo", "dia", 37.3805, -5.9810),
    ("Alcampo Los Arcos", "alcampo", 37.3934, -5.9606),
]

if Store.objects.filter(is_active=True, is_local_business=False).count() < 3:
    print("  pocas tiendas de cadena: creando red mínima en Sevilla...")
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

chain_stores = list(Store.objects.filter(is_active=True, is_local_business=False)[:8])
print(f"  tiendas de cadena disponibles: {len(chain_stores)}")

# --------------------------------------------------------------- catálogo ---
CATALOG = [
    # (nombre, categoría, marca, unidad, cantidad, precio base €)
    ("Leche entera 1L", "Lácteos", "Hacendado", "l", 1.0, 0.95),
    ("Leche semidesnatada 1L", "Lácteos", "Pascual", "l", 1.0, 1.15),
    ("Yogur natural pack 4", "Lácteos", "Danone", "unit", 4.0, 1.65),
    ("Queso curado cuña 250g", "Lácteos", "García Baquero", "g", 250.0, 3.85),
    ("Pan de barra", "Panadería", "", "unit", 1.0, 0.65),
    ("Pan de molde integral", "Panadería", "Bimbo", "unit", 1.0, 1.80),
    ("Huevos L docena", "Huevos", "", "unit", 12.0, 2.35),
    ("Arroz redondo 1kg", "Despensa", "La Fallera", "kg", 1.0, 1.45),
    ("Pasta espaguetis 500g", "Despensa", "Gallo", "g", 500.0, 1.10),
    ("Aceite de oliva virgen extra 1L", "Despensa", "Carbonell", "l", 1.0, 7.95),
    ("Atún en aceite pack 3", "Conservas", "Calvo", "unit", 3.0, 2.75),
    ("Tomate frito 400g", "Conservas", "Orlando", "g", 400.0, 1.05),
    ("Pechuga de pollo 1kg", "Carnicería", "", "kg", 1.0, 6.50),
    ("Carne picada mixta 500g", "Carnicería", "", "g", 500.0, 3.95),
    ("Merluza filetes 400g", "Pescadería", "", "g", 400.0, 5.60),
    ("Detergente líquido 40 lavados", "Limpieza", "Ariel", "unit", 1.0, 8.45),
    ("Papel higiénico 12 rollos", "Limpieza", "Scottex", "unit", 12.0, 4.20),
    ("Café molido natural 250g", "Desayuno", "Marcilla", "g", 250.0, 2.95),
]

root_cat, _ = Category.objects.get_or_create(
    slug="alimentacion", defaults={"name": "Alimentación"}
)


def ensure_product(name, cat_name, brand, unit, qty):
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


def stable_factor(key: str, spread: float = 0.18) -> float:
    """Variación determinista por (producto, tienda) en [1-spread, 1+spread]."""
    h = int(hashlib.md5(key.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
    return 1.0 + (h * 2 - 1) * spread


products = {}
created_prices = 0
for name, cat_name, brand, unit, qty, base in CATALOG:
    prod = ensure_product(name, cat_name, brand, unit, qty)
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
            verified_at=NOW,
            is_stale=False,
        )
        created_prices += 1
print(f"  precios nuevos creados: {created_prices}")

# Histórico para el gráfico de evolución (leche en 2 tiendas, 5 puntos)
leche = products["Leche entera 1L"]
for store in chain_stores[:2]:
    hist = Price.objects.filter(product=leche, store=store)
    if hist.count() < 4:
        for weeks, delta in [(8, "0.10"), (6, "0.06"), (4, "0.03"), (2, "-0.02")]:
            base_price = Price.objects.filter(
                product=leche, store=store, is_stale=False
            ).first()
            if base_price is None:
                continue
            p = Price.objects.create(
                product=leche,
                store=store,
                price=base_price.price + Decimal(delta),
                unit_price=base_price.price + Decimal(delta),
                source="scraping",
                verified_at=NOW - timedelta(weeks=weeks),
                is_stale=True,
            )
            Price.objects.filter(pk=p.pk).update(created_at=NOW - timedelta(weeks=weeks))
print("  histórico de precios OK")

# ------------------------------------------------------------- PYME demo ---
fprofile, _ = BusinessProfile.objects.update_or_create(
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
        "business_profile": fprofile,
        "is_active": True,
    },
)
FRUTERIA_CATALOG = [
    ("Manzanas Fuji 1kg", "Frutería", "", "kg", 1.0, 2.10),
    ("Naranjas de zumo 2kg", "Frutería", "", "kg", 2.0, 2.60),
    ("Plátanos de Canarias 1kg", "Frutería", "", "kg", 1.0, 2.35),
    ("Fresas 500g", "Frutería", "", "g", 500.0, 2.80),
]
naranjas = None
for name, cat_name, brand, unit, qty, base in FRUTERIA_CATALOG:
    prod = ensure_product(name, cat_name, brand, unit, qty)
    if "Naranjas" in name:
        naranjas = prod
    if not Price.objects.filter(product=prod, store=fstore, is_stale=False).exists():
        Price.objects.create(
            product=prod,
            store=fstore,
            price=Decimal(f"{base:.2f}"),
            unit_price=Decimal(f"{base / max(qty, 0.1):.2f}"),
            source="business",
            verified_at=NOW,
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
print("  PYME Frutería El Vergel OK (aprobada, con precios y promoción)")

# PYME pendiente de aprobación (para la captura del panel admin)
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
print("  PYME pendiente (Panadería El Horno de Triana) OK")

# -------------------------------------------------- datos del consumidor ---
lista, lista_created = ShoppingList.objects.get_or_create(
    owner=demo, name="Lista de la semana", defaults={"is_archived": False}
)
if lista_created or not lista.items.exists():
    ITEMS = [
        ("Leche entera 1L", 2, False),
        ("Pan de barra", 1, True),
        ("Huevos L docena", 1, False),
        ("Arroz redondo 1kg", 1, False),
        ("Aceite de oliva virgen extra 1L", 1, False),
        ("Pechuga de pollo 1kg", 1, True),
        ("Manzanas Fuji 1kg", 2, False),
    ]
    for name, qty, checked in ITEMS:
        ShoppingListItem.objects.create(
            shopping_list=lista,
            name=name,
            normalized_name=name.lower(),
            quantity=qty,
            is_checked=checked,
            added_by=demo,
        )
print(f"  lista '{lista.name}' OK ({lista.items.count()} ítems)")

tpl, tpl_created = ListTemplate.objects.get_or_create(owner=demo, name="Compra básica")
if tpl_created or not tpl.items.exists():
    for i, name in enumerate(["Leche entera 1L", "Pan de barra", "Huevos L docena", "Café molido natural 250g"]):
        ListTemplateItem.objects.get_or_create(
            template=tpl, name=name, defaults={"normalized_name": name.lower(), "ordering": i}
        )
print("  plantilla 'Compra básica' OK")

min_price = (
    Price.objects.filter(product=leche, is_stale=False).order_by("price").first()
)
if min_price and not PriceAlert.objects.filter(user=demo, product=leche).exists():
    PriceAlert.objects.create(
        user=demo,
        product=leche,
        store=None,
        target_price=min_price.price - Decimal("0.10"),
        is_active=True,
    )
print("  alerta de precio (leche) OK")

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
    n3 = Notification.objects.create(
        user=demo,
        notification_type=NotificationType.SHARED_LIST_CHANGED,
        title="Lista compartida actualizada",
        body="María añadió 'Fresas 500g' a la lista 'Lista de la semana'.",
        is_read=True,
        action_url="/app/lists",
    )
    Notification.objects.filter(pk=n3.pk).update(created_at=NOW - timedelta(days=1))
print("  notificaciones demo OK")

for store in chain_stores[:1] + [fstore]:
    UserFavoriteStore.objects.get_or_create(user=demo, store=store)
print("  tiendas favoritas OK")

print("== capture_setup: COMPLETADO ==")
print(f"   demo@bargain.local / {PASSWORD}  (consumer, lista id={lista.id})")
print(f"   fruteria@bargain.local / {PASSWORD}  (PYME aprobada)")
print(f"   panaderia@bargain.local / {PASSWORD}  (PYME pendiente)")
print(f"   bargain_admin@bargain.local / {PASSWORD}  (staff)")
