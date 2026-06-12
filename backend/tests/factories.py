"""
Factory-boy factories compartidas para los tests del backend de BarGAIN.

Las factories de modelos que aún no existen (products, stores, prices,
shopping_lists) usan una clase LazyModelFactory que difiere la resolución
del modelo hasta la primera llamada, permitiendo que el módulo sea importable
antes de que esas apps tengan sus modelos definidos.

Cuando los modelos sean creados (planes 01-02 a 01-05) las factories
funcionarán automáticamente sin ningún cambio.
"""

import factory
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from factory.django import DjangoModelFactory

User = get_user_model()


# ── Helpers ───────────────────────────────────────────────────────────────────


def _lazy_model(app_label: str, model_name: str):
    """Devuelve el modelo Django en diferido; útil cuando el modelo puede no existir aún."""

    class _Lazy:
        pass

    try:
        from django.apps import apps

        return apps.get_model(app_label, model_name)
    except LookupError:
        return _Lazy


# ── Users ─────────────────────────────────────────────────────────────────────


class UserFactory(DjangoModelFactory):
    """Crea usuarios de prueba con rol consumer y contraseña conocida."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    role = "consumer"

    @factory.post_generation
    def password(obj, create, extracted, **kwargs):  # noqa: N805
        raw = extracted if extracted is not None else "testpass123"
        obj.set_password(raw)
        if create:
            obj.save()


# ── Products ──────────────────────────────────────────────────────────────────


class CategoryFactory(DjangoModelFactory):
    """Crea categorías de producto (activa tras plan 01-02)."""

    class Meta:
        model = _lazy_model("products", "Category")
        exclude = ["_deferred"]

    _deferred = factory.LazyFunction(lambda: _lazy_model("products", "Category"))

    # El modelo deriva `slug` desde `name`, así que la factory debe garantizar unicidad.
    name = factory.Sequence(lambda n: f"categoria-{n}")
    parent = None


class ProductFactory(DjangoModelFactory):
    """Crea productos normalizados activos (activa tras plan 01-02)."""

    class Meta:
        model = _lazy_model("products", "Product")
        exclude = ["_deferred"]

    _deferred = factory.LazyFunction(lambda: _lazy_model("products", "Product"))

    name = factory.Faker("bs")
    normalized_name = factory.LazyAttribute(lambda obj: obj.name.lower())
    category = factory.SubFactory(CategoryFactory)
    is_active = True
    barcode = factory.Sequence(lambda n: f"{n:013d}")


# ── Stores ────────────────────────────────────────────────────────────────────


class StoreFactory(DjangoModelFactory):
    """Crea tiendas con ubicación en Sevilla (activa tras plan 01-03)."""

    class Meta:
        model = _lazy_model("stores", "Store")
        exclude = ["_deferred"]

    _deferred = factory.LazyFunction(lambda: _lazy_model("stores", "Store"))

    name = factory.Faker("company")
    location = factory.LazyFunction(lambda: Point(-5.9845, 37.3891, srid=4326))
    is_local_business = False


# ── Prices ────────────────────────────────────────────────────────────────────


class PriceFactory(DjangoModelFactory):
    """Crea precios de productos en tiendas (activa tras plan 01-04)."""

    class Meta:
        model = _lazy_model("prices", "Price")
        exclude = ["_deferred"]

    _deferred = factory.LazyFunction(lambda: _lazy_model("prices", "Price"))

    product = factory.SubFactory(ProductFactory)
    store = factory.SubFactory(StoreFactory)
    price = factory.Faker("pydecimal", min_value=0.5, max_value=50, right_digits=2)
    source = "scraping"
    is_stale = False


# ── Shopping Lists ────────────────────────────────────────────────────────────


class ShoppingListFactory(DjangoModelFactory):
    """Crea listas de la compra (activa tras plan 01-05)."""

    class Meta:
        model = _lazy_model("shopping_lists", "ShoppingList")
        exclude = ["_deferred"]

    _deferred = factory.LazyFunction(lambda: _lazy_model("shopping_lists", "ShoppingList"))

    name = factory.Faker("sentence", nb_words=3)
    owner = factory.SubFactory(UserFactory)
    is_archived = False
